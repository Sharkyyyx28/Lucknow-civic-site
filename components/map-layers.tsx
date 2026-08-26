import { useEffect, useRef, useState } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import type { FeatureCollection, GeoJsonObject } from 'geojson'
import {
  BASE_LAYERS,
  LAYER_CONFIGS,
  boundaryFilesFor,
  layerConfig,
  type BaseLayer,
  type LayerId,
  type OverlayId,
} from '../lib/mapLayers'

// Pieces shared by the site's maps: ctrl+scroll zooming, lazy-loaded boundary
// overlays, and a compact basemap/boundary switcher for the small pin-picker
// maps (the full explorer at /map has its own roomier panel).

/** Zoom on ctrl+wheel only, so a plain scroll still scrolls the page. */
export function CtrlScrollZoom() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) { e.preventDefault(); e.deltaY < 0 ? map.zoomIn() : map.zoomOut() }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [map])
  return null
}

export type BoundaryData = Record<LayerId, FeatureCollection | null>

const EMPTY_DATA: BoundaryData = { gba: null, wards369: null }

/**
 * Fetches each boundary file the first time a layer that needs it is switched
 * on, and remembers it afterwards. The ward files are several MB, which is why
 * nothing is fetched up front.
 */
export function useBoundaryData(enabled: Set<OverlayId>) {
  const [data, setData] = useState<BoundaryData>(EMPTY_DATA)
  const [loading, setLoading] = useState<Set<LayerId>>(new Set())
  const requested = useRef<Set<LayerId>>(new Set())

  useEffect(() => {
    boundaryFilesFor(enabled).forEach(id => {
      if (requested.current.has(id)) return
      requested.current.add(id)
      setLoading(prev => new Set(prev).add(id))
      fetch(layerConfig(id).url)
        .then(r => r.json())
        .then((fc: FeatureCollection) => setData(prev => ({ ...prev, [id]: fc })))
        .catch(() => {
          // Boundary file missing or offline — the map still works, just unadorned.
          requested.current.delete(id)
        })
        .finally(() => setLoading(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        }))
    })
  }, [enabled])

  return { data, loading }
}

/**
 * Boundary outlines drawn for display only. They are deliberately
 * non-interactive so a click still reaches the map underneath and drops a pin.
 */
export function BoundaryOverlays({ enabled, data }: { enabled: Set<OverlayId>; data: BoundaryData }) {
  return (
    <>
      {LAYER_CONFIGS.filter(cfg => enabled.has(cfg.id) && data[cfg.id]).map(cfg => (
        <GeoJSON
          key={cfg.id}
          data={data[cfg.id] as unknown as GeoJsonObject}
          style={cfg.style}
          interactive={false}
        />
      ))}
    </>
  )
}

// ── Compact switcher ─────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 12,
  overflow: 'hidden',
}

/**
 * Basemap radio + boundary checkboxes for the small maps. Rendered as a sibling
 * of the Leaflet container (not a child), so clicking it never reaches the map.
 */
export function CompactLayerSwitcher({
  activeBase,
  onBaseChange,
  enabled,
  onToggle,
  loading,
}: {
  activeBase: BaseLayer
  onBaseChange: (base: BaseLayer) => void
  enabled: Set<OverlayId>
  onToggle: (id: OverlayId) => void
  loading: Set<LayerId>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000, width: open ? 178 : 'auto' }}>
      <div style={PANEL}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '5px 8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: '#111827',
            fontFamily: 'inherit',
          }}
          aria-expanded={open}
        >
          <span aria-hidden="true">🗺</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Layers</span>
          <span style={{ fontSize: 9, color: '#6b7280' }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '7px 8px 9px' }}>
            <div style={{ display: 'flex', marginBottom: 9 }}>
              {(Object.entries(BASE_LAYERS) as [BaseLayer, typeof BASE_LAYERS[BaseLayer]][]).map(([id, cfg], i) => {
                const active = activeBase === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onBaseChange(id)}
                    aria-pressed={active}
                    style={{
                      flex: 1,
                      padding: '3px 0',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: active ? '#111827' : '#d1d5db',
                      borderLeftWidth: i === 0 ? 1 : 0,
                      background: active ? '#111827' : '#fff',
                      color: active ? '#fff' : '#374151',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {cfg.shortLabel}
                  </button>
                )
              })}
            </div>

            {LAYER_CONFIGS.map(cfg => (
              <label
                key={cfg.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                  cursor: 'pointer',
                  color: enabled.has(cfg.id) ? '#111827' : '#6b7280',
                }}
              >
                <input
                  type="checkbox"
                  checked={enabled.has(cfg.id)}
                  onChange={() => onToggle(cfg.id)}
                  style={{ accentColor: (cfg.style.color as string) ?? '#2563eb' }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 3,
                    background: cfg.style.color as string,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{cfg.shortLabel}</span>
                {loading.has(cfg.id) && <span style={{ fontSize: 10, color: '#9ca3af' }}>…</span>}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
