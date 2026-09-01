import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, useMapEvent } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import {
  BASE_LAYERS,
  LAYER_CONFIGS,
  MIN_MAP_ZOOM,
  type BaseLayer,
  type OverlayId,
} from '../lib/mapLayers'
import {
  BoundaryOverlays,
  CompactLayerSwitcher,
  CtrlScrollZoom,
  useBoundaryData,
} from './map-layers'
import {
  NETWORK,
  formatMonth,
  openRunsAt,
  totalsAt,
  type NetworkLine,
  type NetworkStation,
} from '../lib/metroNetworkData'

// Only the GBA outline by default: with a dozen coloured lines on screen the
// corporation and ward fills fight the network for attention.
const DEFAULT_OVERLAYS = LAYER_CONFIGS.filter((l) => l.id === 'gba').map((l) => l.id)

type Mode = NetworkLine['mode']

/**
 * How a stretch of track is drawn at the selected date:
 *
 * - `open`     — it carried passengers on that date (a recorded opening).
 * - `projected`— the slider is past an announced date that has not happened.
 *                Drawn dashed, because treating a press release as a railway
 *                is exactly the mistake this map is meant to prevent.
 * - `future`   — still ahead of the selected date; a faint ghost so the
 *                corridor's shape is visible without reading as built.
 */
type TrackState = 'open' | 'projected' | 'future'

/**
 * Below this zoom the whole network is on screen and ordinary stations are
 * 3px dots a few pixels apart — an unreadable smear that still costs a path
 * each. Only interchanges are drawn until the map is zoomed in far enough for
 * the rest to mean anything.
 */
const ALL_STATIONS_ZOOM = 12

/** The component is client-only (dynamic, ssr:false), so `window` is safe. */
function isWideViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= 768
}

/** Station index -> whether its segment is a recorded opening or a projection. */
function segmentKindByStation(line: NetworkLine): Array<'actual' | 'planned'> {
  const kinds = new Array<'actual' | 'planned'>(line.stations.length).fill('planned')
  for (const seg of line.segments) {
    const kind = seg.dateKind === 'actual' ? 'actual' : 'planned'
    for (let i = seg.from; i <= seg.to; i++) kinds[i] = kind
  }
  return kinds
}

type SelectedStation = { station: NetworkStation; lineName: string; linePhase: string }

type DrawnLine = {
  line: NetworkLine
  tracks: Array<{ key: string; state: TrackState; positions: Array<[number, number]> }>
  openIdx: Set<number>
  ghost: Array<[number, number]>
}

/**
 * Every polyline in the network. Memoised on `drawn` (which only changes when
 * the geometry does) and `highlightLineId`, so a timeline step that opens
 * nothing re-renders none of this and Leaflet is never asked to restyle.
 */
const NetworkTracks = memo(function NetworkTracks({
  drawn,
  highlightLineId,
}: {
  drawn: DrawnLine[]
  highlightLineId?: string | null
}) {
  const dimmed = (lineId: string) => Boolean(highlightLineId) && highlightLineId !== lineId

  return (
    <>
      {/* Ghosts first, so built track always draws over unbuilt corridors. */}
      {drawn.map(({ line, ghost }) => (
        <Polyline
          key={`ghost-${line.id}`}
          positions={ghost}
          pathOptions={{
            color: line.color,
            weight: 2,
            opacity: dimmed(line.id) ? 0.08 : 0.28,
            dashArray: '2 7',
            interactive: false,
          }}
        />
      ))}

      {drawn.map(({ line, tracks }) =>
        tracks.map((track) => {
          const faded = dimmed(line.id)
          return (
            <Fragment key={track.key}>
              {/* White casing, transit-map style, so lines stay legible where
                  they run side by side along the ORR. */}
              <Polyline
                positions={track.positions}
                pathOptions={{
                  color: '#fff',
                  weight: line.mode === 'suburban' ? 7 : 8,
                  opacity: faded ? 0.2 : 0.9,
                  interactive: false,
                }}
              />
              <Polyline
                positions={track.positions}
                pathOptions={{
                  color: line.color,
                  weight: line.mode === 'suburban' ? 4 : 5,
                  opacity: faded ? 0.25 : 0.95,
                  dashArray: track.state === 'projected' ? '10 6' : undefined,
                  interactive: false,
                }}
              />
              {/* Suburban corridors get railway-style hatching so they read as
                  trains rather than as another metro colour. */}
              {line.mode === 'suburban' && track.state !== 'projected' && (
                <Polyline
                  positions={track.positions}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    opacity: faded ? 0.2 : 0.85,
                    dashArray: '1 9',
                    interactive: false,
                  }}
                />
              )}
            </Fragment>
          )
        }),
      )}
    </>
  )
})

/**
 * Station dots, split out so they can re-render on zoom without dragging the
 * polylines through a render too, and memoised so scrubbing the timeline past
 * a month that changes nothing costs nothing.
 */
const StationDots = memo(function StationDots({
  drawn,
  highlightLineId,
  onSelect,
}: {
  drawn: DrawnLine[]
  highlightLineId?: string | null
  onSelect: (s: SelectedStation) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvent('zoomend', () => setZoom(map.getZoom()))
  const showAll = zoom >= ALL_STATIONS_ZOOM

  return (
    <>
      {drawn.map(({ line, openIdx }) =>
        line.stations.map((station, i) => {
          if (!openIdx.has(i)) return null
          const big = Boolean(station.interchange)
          if (!showAll && !big) return null
          const faded = Boolean(highlightLineId) && highlightLineId !== line.id
          return (
            <CircleMarker
              key={`${line.id}-${i}`}
              center={[station.lat, station.lng]}
              radius={big ? 5.5 : 3.5}
              pathOptions={{
                color: '#fff',
                weight: big ? 2.5 : 1.75,
                fillColor: line.color,
                fillOpacity: faded ? 0.25 : 1,
                opacity: faded ? 0.25 : 1,
              }}
              eventHandlers={{
                // A fresh object every click on purpose: the popup re-opens
                // when the selection's identity changes, so tapping the same
                // station again after dismissing it works.
                click: () => onSelect({ station, lineName: line.name, linePhase: line.phase }),
              }}
            />
          )
        }),
      )}
    </>
  )
})

export default function MetroNetworkMap({
  asOf,
  modes,
  highlightLineId,
  height = 560,
  showCaption = true,
}: {
  /** ISO day the network is drawn as of. */
  asOf: string
  /** Which of metro / suburban rail to draw. */
  modes: ReadonlySet<Mode>
  /** When set, every other line is dimmed rather than hidden. */
  highlightLineId?: string | null
  /** Any CSS length. Leaflet needs a resolved height, so this lands inline. */
  height?: number | string
  /** Date and running totals burned into the map corner. */
  showCaption?: boolean
}) {
  const [activeBase, setActiveBase] = useState<BaseLayer>('osm')
  const [enabledOverlays, setEnabledOverlays] = useState<Set<OverlayId>>(new Set(DEFAULT_OVERLAYS))
  const { data: boundaryData, loading: boundaryLoading } = useBoundaryData(enabledOverlays)

  // Fixed to the whole network, including lines that open in 2031. If the
  // bounds tracked only what is currently drawn, dragging the timeline would
  // re-frame the map on every step and make comparison impossible.
  const bounds = useMemo(
    () => L.latLngBounds(NETWORK.flatMap((l) => l.stations.map((s) => [s.lat, s.lng] as [number, number]))),
    [],
  )

  // What panning is allowed to reach — a quarter-bounds pad wider than what
  // fitBounds frames initially, so a drag can still reach a little past the
  // outermost station without being able to wander off into empty basemap.
  const panBounds = useMemo(() => bounds.pad(0.25), [bounds])

  const baseCfg = BASE_LAYERS[activeBase]

  const toggleOverlay = useCallback((id: OverlayId) => {
    setEnabledOverlays((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // react-leaflet compares `positions` and `pathOptions` by *reference*
  // (@react-leaflet/core's usePathOptions and updatePolyline both use `!==`),
  // so a render that hands them fresh objects calls setLatLngs and setStyle on
  // every layer whether or not anything moved. Dragging the timeline changes
  // `asOf` 235 times but only 19 of those months change any geometry, so
  // keying the memo on the run boundaries rather than on the date keeps the
  // arrays identical across the other 216 and Leaflet does nothing at all.
  const geometryKey = useMemo(
    () =>
      NETWORK.filter((line) => modes.has(line.mode))
        .map((line) => `${line.id}:${openRunsAt(line, asOf).map(([a, b]) => `${a}-${b}`).join(',')}`)
        .join('|'),
    [asOf, modes],
  )

  const drawn = useMemo(
    () =>
      NETWORK.filter((line) => modes.has(line.mode)).map((line) => {
        const kinds = segmentKindByStation(line)
        const runs = openRunsAt(line, asOf)
        const openIdx = new Set<number>()
        for (const [a, b] of runs) for (let i = a; i <= b; i++) openIdx.add(i)

        const tracks = runs.map(([a, b]) => {
          let projected = false
          for (let i = a; i <= b; i++) if (kinds[i] === 'planned') projected = true
          return {
            key: `${line.id}-${a}-${b}`,
            state: (projected ? 'projected' : 'open') as TrackState,
            positions: line.stations.slice(a, b + 1).map((s) => [s.lat, s.lng] as [number, number]),
          }
        })

        return { line, tracks, openIdx, ghost: line.stations.map((s) => [s.lat, s.lng] as [number, number]) }
      }),
    // Deliberately keyed on the geometry, not on `asOf`/`modes` — see above.
    // The run boundaries fully determine everything built here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometryKey],
  )

  const totals = useMemo(() => totalsAt(asOf, modes), [asOf, modes])

  const [selected, setSelected] = useState<SelectedStation | null>(null)

  // Popup's lifecycle effect lists `position` in its deps and compares by
  // reference, so an inline [lat, lng] literal would tear down and re-open the
  // popup on every parent render — once per frame while the timeline plays.
  // Memoised on the selection instead, so it moves only when the choice does.
  const selectedPos = useMemo(
    () => (selected ? ([selected.station.lat, selected.station.lng] as [number, number]) : null),
    [selected],
  )

  // A station picked at one date may not be drawn at another; drop the popup
  // rather than leave it hanging over track that is no longer there.
  useEffect(() => setSelected(null), [geometryKey])

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #d1d5db',
      }}
    >
      <MapContainer
        bounds={bounds}
        // fitBounds can only pick a zoom the grid allows, so at the default
        // whole-number snap it rounds *down* a full level and leaves a wide
        // margin of empty basemap. Quarter steps let it actually fill the
        // frame, and the tighter padding buys the rest.
        zoomSnap={0.25}
        zoomDelta={0.5}
        boundsOptions={{ padding: [10, 10] }}
        minZoom={MIN_MAP_ZOOM}
        // minZoom alone only caps how far out the map can go — it does
        // nothing to stop a drag from panning past the network into empty
        // basemap, which is easy to trigger on a touchscreen. Padded a
        // quarter past the network's own bounds rather than hardcoded, so a
        // reader can still drag just past the outermost station.
        maxBounds={panBounds}
        maxBoundsViscosity={1.0}
        // The network is ~270 vector paths at full build-out. As SVG that is
        // ~270 DOM nodes the browser re-rasterises on every pan frame, which is
        // what makes this crawl on a phone; the canvas renderer draws the lot
        // into one element instead.
        preferCanvas
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          key={activeBase}
          attribution={baseCfg.attribution}
          url={baseCfg.url}
          // Retina tiles are 4x the pixels to fetch, decode and hold in memory.
          // Worth it on a desktop display, not on the device that is already
          // struggling — and phones are exactly the high-DPR ones.
          detectRetina={isWideViewport()}
        />
        <CtrlScrollZoom />
        <BoundaryOverlays enabled={enabledOverlays} data={boundaryData} />

        <NetworkTracks drawn={drawn} highlightLineId={highlightLineId} />
        <StationDots drawn={drawn} highlightLineId={highlightLineId} onSelect={setSelected} />

        {/* One popup for the whole map, moved to whichever station was last
            tapped. Binding a <Popup> to each marker instead meant building 227
            Leaflet popup instances up front, nearly all of them never opened. */}
        {selected && selectedPos && (
          <Popup position={selectedPos}>
            <strong>{selected.station.name}</strong>
            <div className="text-xs text-ink-600 mt-1">
              {selected.lineName} · {selected.linePhase}
            </div>
            {selected.station.interchange && (
              <div className="text-xs text-ink-600">Interchange: {selected.station.interchange}</div>
            )}
          </Popup>
        )}
      </MapContainer>

      <CompactLayerSwitcher
        activeBase={activeBase}
        onBaseChange={setActiveBase}
        enabled={enabledOverlays}
        onToggle={toggleOverlay}
        loading={boundaryLoading}
      />

      {/* Date and network size drawn onto the map itself, so a screen
          recording of the timeline playing carries its own caption and does
          not depend on the controls around it being in frame. Click-through,
          so it never blocks a station underneath. */}
      {showCaption && (
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            zIndex: 1000,
            pointerEvents: 'none',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '8px 14px 10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#111827',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMonth(asOf)}
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            <strong style={{ fontSize: 15 }}>{totals.openKm.toFixed(1)} km</strong> open ·{' '}
            {totals.openStations} stations
          </div>
          {totals.projectedKm > 0 && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
              + {totals.projectedKm.toFixed(1)} km announced, not built
            </div>
          )}
        </div>
      )}
    </div>
  )
}
