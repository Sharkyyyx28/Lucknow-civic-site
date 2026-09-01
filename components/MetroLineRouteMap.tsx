import { useCallback, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
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
import type { RouteStation } from '../lib/metroRouteData'

// Only the GBA outline by default — the corporation boundary's navy tone sits
// too close to most line colours (especially Blue) and, with 18-30 stations
// on screen, one boundary layer plus the route is already plenty. Ward
// outlines stay opt-in as elsewhere.
const DEFAULT_OVERLAYS = LAYER_CONFIGS.filter((l) => l.id === 'gba').map((l) => l.id)

// Small filled-circle marker rather than a full pin: at 18-30 stations,
// several only a few hundred metres apart, standard ~40px pins overlap into
// a solid clump. A station's own dot stays legible; the white ring keeps it
// readable over any basemap or boundary colour. Interchanges get a larger
// dot with a heavier ring so they read as "more important" at a glance.
function stationIcon(color: string, isInterchange: boolean) {
  const size = isInterchange ? 16 : 10
  const ring = isInterchange ? 3 : 2
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${ring}px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.35);cursor:pointer;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  })
}

// Route map for an upcoming/under-construction metro line: a coloured line
// through its planned stations, each clickable for its name, drawn over the
// same basemap/boundary layers (GBA outline, corporation, ward overlays) as
// the other maps on the site. Station coordinates are indicative (see
// lib/metroRouteData.ts), not a surveyed alignment, so this is deliberately
// kept to "where roughly" rather than something that reads as an official
// engineering map.
export default function MetroLineRouteMap({
  stations,
  color,
  height = 420,
}: {
  stations: RouteStation[]
  color: string
  height?: number
}) {
  const [selected, setSelected] = useState<RouteStation | null>(null)
  const [activeBase, setActiveBase] = useState<BaseLayer>('osm')
  const [enabledOverlays, setEnabledOverlays] = useState<Set<OverlayId>>(new Set(DEFAULT_OVERLAYS))
  const { data: boundaryData, loading: boundaryLoading } = useBoundaryData(enabledOverlays)

  const positions: [number, number][] = stations.map((s) => [s.lat, s.lng])
  const bounds = useMemo(() => L.latLngBounds(positions), [stations])
  const baseCfg = BASE_LAYERS[activeBase]
  const dotIcon = useMemo(
    () => ({
      normal: stationIcon(color, false),
      interchange: stationIcon(color, true),
    }),
    [color],
  )

  const toggleOverlay = useCallback((id: OverlayId) => {
    setEnabledOverlays((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

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
        boundsOptions={{ padding: [28, 28] }}
        minZoom={MIN_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer key={activeBase} attribution={baseCfg.attribution} url={baseCfg.url} detectRetina />
        <CtrlScrollZoom />
        <BoundaryOverlays enabled={enabledOverlays} data={boundaryData} />
        {/* White casing under the coloured line so it reads clearly against
            the basemap and any boundary overlay, transit-map style. */}
        <Polyline positions={positions} pathOptions={{ color: '#fff', weight: 7, opacity: 0.9 }} />
        <Polyline positions={positions} pathOptions={{ color, weight: 4, opacity: 0.95 }} />
        {stations.map((station) => (
          <Marker
            key={station.name}
            position={[station.lat, station.lng]}
            icon={station.interchange ? dotIcon.interchange : dotIcon.normal}
            eventHandlers={{ click: () => setSelected(station) }}
          >
            <Popup>
              <strong>{station.name}</strong>
              {station.interchange && (
                <div className="text-xs text-ink-600 mt-1">Interchange: {station.interchange}</div>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <CompactLayerSwitcher
        activeBase={activeBase}
        onBaseChange={setActiveBase}
        enabled={enabledOverlays}
        onToggle={toggleOverlay}
        loading={boundaryLoading}
      />

      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 1000,
            background: 'white',
            borderRadius: 6,
            padding: '6px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: 13,
          }}
        >
          <strong>{selected.name}</strong>
          {selected.interchange && <span className="text-ink-600"> · connects to {selected.interchange}</span>}
        </div>
      )}
    </div>
  )
}
