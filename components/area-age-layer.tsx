import { useMemo, useState } from 'react'
import { GeoJSON, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, FeatureCollection, GeoJsonObject } from 'geojson'
import {
  AGE_ERAS,
  DATED_AREAS,
  buildWardEraIndex,
  era,
  type DatedArea,
} from '../lib/areaAges'

// The "how old is this part of town" view: every ward tinted by the era of the
// nearest dated locality, with a chip on each locality carrying its name and
// year. See lib/areaAges.ts for where the dates come from and how rough the
// ward tint is — the legend says so on screen too.

// ── Ward tint ────────────────────────────────────────────────────────────────

export function WardAgeTint({ data }: { data: FeatureCollection }) {
  const eraIndex = useMemo(() => buildWardEraIndex(data), [data])

  const style = useMemo(
    () => (feature?: Feature): L.PolylineOptions => {
      const id = feature ? eraIndex.get(feature.properties) : undefined
      if (!id) return { stroke: false, fill: false }
      const color = era(id).color
      return {
        // Stroke each ward in its own fill colour rather than white. Adjacent
        // wards never share a vertex-for-vertex border, so a contrasting stroke
        // draws a bright hairline down every seam and shatters what should read
        // as continuous era regions; painting the seam in the fill colour
        // closes it instead.
        color,
        weight: 1,
        opacity: 0.6,
        fillColor: color,
        fillOpacity: 0.6,
        // Keep this at 1. Leaflet thins each ring independently, so anything
        // higher pulls neighbouring borders apart by up to that many pixels and
        // opens visible cracks across the mosaic.
        smoothFactor: 1,
      }
    },
    [eraIndex],
  )

  return (
    // Display only: clicks fall through to the ward layer and the basemap
    // underneath, so the age view never eats a ward selection.
    <GeoJSON key="area-age-tint" data={data as GeoJsonObject} style={style} interactive={false} />
  )
}

// ── Locality chips ───────────────────────────────────────────────────────────

const chipIcons = new Map<string, L.DivIcon>()

// Stable position tuples, keyed by name. A fresh `[area.lat, area.lng]`
// literal on every render would change identity even though the coordinates
// never do — react-leaflet treats that as a real move and calls
// marker.setLatLng(), which (via the marker-popup binding) re-triggers the
// open popup's autoPan and fires another moveend, which re-renders this
// component and repeats: an infinite pan loop that reads as the map shaking.
const chipPositions = new Map<string, L.LatLngTuple>()

function chipPosition(area: DatedArea): L.LatLngTuple {
  let pos = chipPositions.get(area.name)
  if (!pos) {
    pos = [area.lat, area.lng]
    chipPositions.set(area.name, pos)
  }
  return pos
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  ))
}

function chipIcon(area: DatedArea): L.DivIcon {
  let icon = chipIcons.get(area.name)
  if (!icon) {
    const { color, textColor } = era(area.era)
    icon = L.divIcon({
      className: 'age-chip',
      html: `
        <span class="age-chip__body" style="background:${color};color:${textColor}">
          <span class="age-chip__name">${escapeHtml(area.name)}</span>
          <span class="age-chip__year">${escapeHtml(area.yearLabel)}</span>
        </span>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
    chipIcons.set(area.name, icon)
  }
  return icon
}

/** Rough on-screen size of a chip, for the overlap test. */
function chipSize(area: DatedArea): { width: number; height: number } {
  const width = Math.max(area.name.length, area.yearLabel.length + 2) * 6.4 + 16
  return { width, height: 32 }
}

// Cached per area, for the same reason as chipPosition above: react-leaflet's
// Popup re-runs L.Popup.update() (which re-triggers autoPan) whenever its
// `children` prop changes identity. Building this JSX inline in the render
// below would hand it a new element every render — including every render
// this component's own moveend listener causes — so a marker whose popup is
// open would autoPan, fire moveend, re-render, and autoPan again forever.
const popupContents = new Map<string, JSX.Element>()

function popupContent(area: DatedArea): JSX.Element {
  let node = popupContents.get(area.name)
  if (!node) {
    const { label, title, ageLabel, color } = era(area.era)
    node = (
      <div style={{ fontSize: 13, minWidth: 190, maxWidth: 250 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{area.name}</div>
        <div style={{ fontWeight: 700, fontSize: 20, color, margin: '2px 0 6px' }}>
          {area.yearLabel}
        </div>
        <div style={{ fontSize: 12, color: '#374151' }}>
          {label} · {title}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{ageLabel} old</div>
        {area.note && (
          <p style={{ fontSize: 12, color: '#374151', marginTop: 8, lineHeight: 1.45 }}>
            {area.note}
          </p>
        )}
      </div>
    )
    popupContents.set(area.name, node)
  }
  return node
}

/**
 * A chip per dated locality. DATED_AREAS is ordered oldest era first, so when
 * two chips would sit on top of each other the older area keeps its label —
 * which is the right bias for a map about age.
 */
export function AgeChips() {
  const map = useMap()
  const [view, setView] = useState(() => map.getBounds())
  const sync = () => setView(map.getBounds())
  useMapEvents({ zoomend: sync, moveend: sync })

  const visible = useMemo(() => {
    const shown: DatedArea[] = []
    const placed: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    for (const area of DATED_AREAS) {
      if (!view.contains([area.lat, area.lng])) continue

      const point = map.latLngToContainerPoint([area.lat, area.lng])
      const { width, height } = chipSize(area)
      const box = {
        x1: point.x - width / 2,
        y1: point.y - height / 2,
        x2: point.x + width / 2,
        y2: point.y + height / 2,
      }
      if (placed.some(p => box.x1 < p.x2 && box.x2 > p.x1 && box.y1 < p.y2 && box.y2 > p.y1)) continue

      placed.push(box)
      shown.push(area)
    }
    return shown
  }, [map, view])

  return (
    <>
      {visible.map(area => (
        <Marker key={area.name} position={chipPosition(area)} icon={chipIcon(area)}>
          <Popup>{popupContent(area)}</Popup>
        </Marker>
      ))}
    </>
  )
}

// ── Legend ───────────────────────────────────────────────────────────────────

export function AgeLegend({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="age-legend">
      <div className="age-legend__head">
        <span style={{ fontWeight: 800, fontSize: 12 }}>Area age</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            title={open ? 'Collapse legend' : 'Expand legend'}
            className="age-legend__btn"
          >{open ? '▾' : '▸'}</button>
          <button
            type="button"
            onClick={onClose}
            title="Turn off the area age layer"
            aria-label="Turn off the area age layer"
            className="age-legend__btn"
          >✕</button>
        </div>
      </div>

      {open && (
        <div className="age-legend__body">
          {AGE_ERAS.map(e => (
            <div key={e.id} className="age-legend__row">
              <span className="age-legend__swatch" style={{ background: e.color }} />
              <span className="age-legend__label">
                <strong>{e.label}</strong>
                <span className="age-legend__sub">{e.title}</span>
              </span>
            </div>
          ))}
          <p className="age-legend__note">
            A short, sourced list of Lucknow localities (not a full survey) — each ward is tinted
            by its nearest one, so this is a rough approximation, not a surveyed boundary. See
            lib/areaAges.ts for sources.
          </p>
        </div>
      )}
    </div>
  )
}
