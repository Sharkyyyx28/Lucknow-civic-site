import { useEffect, useRef, useState, useCallback, useDeferredValue, useMemo } from 'react'
import {
  MapContainer, TileLayer, GeoJSON, Popup, Tooltip,
  Circle, CircleMarker, Marker,
  useMap, useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useRouter } from 'next/router'
import { point as turfPoint } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import type { Feature, FeatureCollection, GeoJsonObject } from 'geojson'
import LocateIcon from './locate-icon'
import { haversineMeters } from '../lib/geo'
import {
  AREA_AGE_LAYER,
  AREA_AGE_LAYER_ID,
  LUCKNOW_BOUNDS,
  LUCKNOW_CENTER,
  BASE_LAYERS,
  LAYER_CONFIGS,
  MAX_MAP_ZOOM,
  boundaryFilesFor,
  getProp,
  layerConfig,
  type BaseLayer,
  type LayerId,
  type OverlayId,
  type WardProperties,
} from '../lib/mapLayers'
// Type-only, so none of wardGeometry's server-side deps reach the bundle.
import type { WardBoundarySet } from '../lib/wardGeometry'
// Shapes and role metadata only — lib/officialsTypes.ts is free of `fs`, so it
// is safe in the client bundle (lib/officials.ts, which reads the CSV, is not).
import {
  ROLE_GROUPS,
  ROLE_GROUP_LABELS,
  roleById,
  telHref,
  type OfficialContact,
} from '../lib/officialsTypes'
import { AGE_ERAS } from '../lib/areaAges'
import { CtrlScrollZoom } from './map-layers'
import { AgeChips, AgeLegend, WardAgeTint } from './area-age-layer'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Inner map utilities ──────────────────────────────────────────────────────

function FitBoundsOnMount() {
  const map = useMap()
  useEffect(() => { map.fitBounds(LUCKNOW_BOUNDS) }, [map])
  return null
}

/** Phone-sized viewport. Matches the 640px breakpoint the map's CSS uses, so
 *  the layout the stylesheet lays out and the layout the code assumes agree. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
}

// Width of the ward details sidebar (see WardSidebar) — kept as a constant so
// the map-centering math and the panel's own CSS agree on one number.
const SIDEBAR_WIDTH = 320
// Rough footprint of the layer control panel when expanded, top-right.
const LAYER_PANEL_WIDTH = 220
const LAYER_PANEL_HEADER = 40

/** True once the viewport is narrow enough that the sidebar goes full-width. */
function isNarrowViewport(map: L.Map): boolean {
  return map.getSize().x < 640
}

/** Share of the map height the ward sheet covers on a phone (see .ward-sidebar--sheet). */
const SHEET_HEIGHT_RATIO = 0.62

/**
 * Re-centers on a point the way a person would do it by hand: if the ward
 * sidebar is about to cover the right third of the map, shift the target left
 * of dead-center so it still lands in the open part of the view instead of
 * sliding underneath the panel.
 */
function centerForPanels(
  map: L.Map,
  latlng: L.LatLng,
  opts: { sidebarOpen: boolean; layerPanelOpen: boolean },
) {
  if (isNarrowViewport(map)) {
    // On a phone the ward panel is a bottom sheet, so the free strip of map is
    // the top ~38%. Aim for the middle of that strip rather than dead-centre,
    // which would put the ward behind the sheet.
    if (opts.sidebarOpen) {
      const visible = 1 - SHEET_HEIGHT_RATIO
      const dy = map.getSize().y * (0.5 - visible / 2)
      const point = map.latLngToContainerPoint(latlng)
      map.panTo(map.containerPointToLatLng(L.point(point.x, point.y + dy)), { animate: true })
      return
    }
    map.panTo(latlng, { animate: true })
    return
  }
  const rightOffset = opts.sidebarOpen ? SIDEBAR_WIDTH / 2 : 0
  const topOffset = !opts.sidebarOpen && opts.layerPanelOpen ? -(LAYER_PANEL_HEADER / 2) : 0
  if (!rightOffset && !topOffset) {
    map.panTo(latlng, { animate: true })
    return
  }
  const point = map.latLngToContainerPoint(latlng)
  const shifted = L.point(point.x + rightOffset, point.y + topOffset)
  map.panTo(map.containerPointToLatLng(shifted), { animate: true })
}

/** fitBounds with extra padding on whichever side a currently-open panel sits. */
function fitBoundsForPanels(
  map: L.Map,
  bounds: L.LatLngBounds,
  opts: { sidebarOpen: boolean; layerPanelOpen: boolean },
  fitOpts?: { maxZoom?: number },
) {
  if (!bounds.isValid()) return
  const narrow = isNarrowViewport(map)
  const rightPad = !narrow && opts.sidebarOpen ? SIDEBAR_WIDTH + 30 : 30
  const topPad = !narrow && !opts.sidebarOpen && opts.layerPanelOpen ? LAYER_PANEL_WIDTH / 2 : 30
  // The phone sheet eats the bottom of the map, so pad it out of the fit.
  const bottomPad = narrow && opts.sidebarOpen
    ? Math.round(map.getSize().y * SHEET_HEIGHT_RATIO)
    : 30
  map.fitBounds(bounds, {
    paddingTopLeft: [30, topPad],
    paddingBottomRight: [rightPad, bottomPad],
    maxZoom: fitOpts?.maxZoom,
  })
}

function MapClickDeselect({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect })
  return null
}

// Point-in-polygon lookup: which ward feature contains a given lat/lng.
function findWardAtPoint(lat: number, lng: number, fc: FeatureCollection): Feature | null {
  const pt = turfPoint([lng, lat])
  for (const feature of fc.features) {
    if (!feature.geometry) continue
    try {
      if (
        (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') &&
        booleanPointInPolygon(pt, feature as any)
      ) {
        return feature
      }
    } catch {
      // malformed geometry — skip
    }
  }
  return null
}

// ── Locate-me control ────────────────────────────────────────────────────────

function LocateButton({ locating, located, onClick }: { locating: boolean; located: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={locating}
      title="Show my current location"
      aria-label="Show my current location"
      className="locate-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 48,
        padding: '0 16px 0 13px',
        borderRadius: 999,
        background: located ? '#2563eb' : '#fff',
        border: located ? '2px solid #1e40af' : '2px solid #fff',
        boxShadow: located
          ? '0 4px 16px rgba(37,99,235,0.45)'
          : '0 3px 14px rgba(0,0,0,0.3)',
        cursor: locating ? 'wait' : 'pointer',
        color: located ? '#fff' : '#2563eb',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 13,
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
        animation: located ? 'none' : 'locate-attention 2.4s ease-in-out infinite',
      }}
    >
      <span
        style={{
          width: 22, height: 22, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {locating ? (
          <span
            style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${located ? 'rgba(255,255,255,0.4)' : '#cbd5e1'}`,
              borderTopColor: located ? '#fff' : '#2563eb',
              display: 'inline-block', animation: 'locate-spin 0.8s linear infinite',
            }}
          />
        ) : <LocateIcon size={22} />}
      </span>
      <span className="locate-btn-label">
        {locating ? 'Locating…' : located ? 'You are here' : 'My location'}
      </span>
    </button>
  )
}

function LocateErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        background: '#fef2f2',
        color: '#991b1b',
        border: '1px solid #fecaca',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        maxWidth: 240,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        fontFamily: 'system-ui, sans-serif',
        cursor: 'pointer',
      }}
      title="Dismiss"
    >
      {message}
    </div>
  )
}

// ── Ward hover/click layer ───────────────────────────────────────────────────

interface WardLayerProps {
  layerKey: string
  /** Which ward set these polygons come from — ward names only mean anything
   *  within their own set, so lookups keyed by name have to carry it along. */
  boundary: WardBoundarySet
  data: FeatureCollection
  style: L.PolylineOptions
  selectedWard: Feature | null
  searchTerm: string
  onWardClick: (feature: Feature, latlng: L.LatLng, opts?: { boundary?: WardBoundarySet }) => void
  /** Fires on hover start/end so an open click-popup can get out of the way
   *  of whatever the cursor is now over. */
  onWardHover?: (feature: Feature | null) => void
}

// Compact hover preview — name, ward no., corporation, constituency — shown
// as a Leaflet tooltip that tracks the cursor rather than a full popup, so
// skimming wards by hovering doesn't require a click per ward.
function wardHoverHtml(feature: Feature): string {
  const props = feature.properties as WardProperties
  const name = getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name')
  const wardNo = getProp(props, 'ward_id', 'wardcode', 'ward_no', 'Ward_No', 'WardNo', 'ward_number')
  const corp = getProp(props, 'Corporation', 'Corporatio', 'corporation', 'ulbname')
  const ac = getProp(props, 'ac', 'Assembly', 'assembly_constituency', 'Assembly_Constituency', 'constituency')
  const bits = [wardNo ? `Ward ${wardNo}` : null, corp, ac].filter(Boolean)
  return `<div style="font:600 12px system-ui,sans-serif;color:#1e293b;line-height:1.4">
    <div style="font-weight:700;color:#1e40af">${name ?? 'Ward'}</div>
    ${bits.length ? `<div style="font-weight:500;color:#64748b;font-size:11px">${bits.join(' · ')}</div>` : ''}
  </div>`
}

function WardGeoJSONLayer({ layerKey, boundary, data, style, selectedWard, searchTerm, onWardClick, onWardHover }: WardLayerProps) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null)

  const getStyle = useCallback((feature?: Feature): L.PolylineOptions => {
    if (!feature) return style
    const props = feature.properties as WardProperties
    const name = String(getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name') ?? '')
    const isSelected = selectedWard?.properties === feature.properties
    const matchesSearch = searchTerm.length > 1 && name.toLowerCase().includes(searchTerm.toLowerCase())

    if (isSelected) return { ...style, fillColor: '#f59e0b', fillOpacity: 0.45, color: '#d97706', weight: 2.5 }
    if (matchesSearch) return { ...style, fillColor: '#22c55e', fillOpacity: 0.4, color: '#16a34a', weight: 2 }
    return style
  }, [style, selectedWard, searchTerm])

  // Re-apply styles when selection or search changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(getStyle)
    }
  }, [selectedWard, searchTerm, getStyle])

  return (
    <GeoJSON
      key={layerKey}
      ref={geoJsonRef}
      data={data as GeoJsonObject}
      style={getStyle}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip(wardHoverHtml(feature), {
          sticky: true,
          direction: 'top',
          offset: [0, -6],
          opacity: 0.97,
          className: 'ward-hover-tip',
        })
        layer.on({
          click(e) {
            L.DomEvent.stopPropagation(e)
            onWardClick(feature, e.latlng, { boundary })
          },
          mouseover(e) {
            const l = e.target as L.Path
            if (selectedWard?.properties !== feature.properties) {
              l.setStyle({ fillOpacity: 0.25, weight: 2 })
            }
            // A stale click-popup sitting over the ward the cursor is now on
            // is more confusing than helpful — let the hover tooltip take over.
            onWardHover?.(feature)
          },
          mouseout(e) {
            if (geoJsonRef.current) {
              geoJsonRef.current.resetStyle(e.target)
              // Re-apply computed style after reset
              ;(e.target as L.Path).setStyle(getStyle(feature))
            }
            onWardHover?.(null)
          },
        })
      }}
    />
  )
}

// ── Basemap switcher ─────────────────────────────────────────────────────────

/** The basemap is picked once and then left alone, so it lives apart from the
 *  overlay toggles — a segmented row in its own corner rather than three radio
 *  buttons taking up the top of a panel people open to flip a boundary on. */
function BasemapSwitch({
  activeBase, onBaseChange,
}: {
  activeBase: BaseLayer
  onBaseChange: (b: BaseLayer) => void
}) {
  return (
    <div className="basemap-switch" role="group" aria-label="Base map">
      {(Object.entries(BASE_LAYERS) as [BaseLayer, typeof BASE_LAYERS[BaseLayer]][]).map(([id, cfg]) => {
        const active = activeBase === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onBaseChange(id)}
            aria-pressed={active}
            title={cfg.label}
            className={`basemap-switch__btn${active ? ' is-active' : ''}`}
          >
            {cfg.shortLabel}
          </button>
        )
      })}
    </div>
  )
}

// ── Layer control panel ──────────────────────────────────────────────────────

interface ControlPanelProps {
  enabledOverlays: Set<OverlayId>
  onOverlayToggle: (id: OverlayId) => void
  onFitLayer: (id: LayerId) => void
  layerData: Record<LayerId, FeatureCollection | null>
  wardSearch: string
  onWardSearchChange: (v: string) => void
  open: boolean
  onToggle: () => void
}

function LayerControlPanel({
  enabledOverlays, onOverlayToggle, onFitLayer,
  layerData, wardSearch, onWardSearchChange,
  open, onToggle,
}: ControlPanelProps) {
  const ageOn = enabledOverlays.has(AREA_AGE_LAYER_ID)
  const ageLoading = ageOn && layerData.wards369 === null

  return (
    <div className="layer-panel-wrap">
      <div className="layer-panel">
        {/* Header — a full card header on a desktop, a single icon button on a phone */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'Hide map layers' : 'Show map layers'}
          className="layer-panel__head"
        >
          <span className="layer-panel__head-icon" aria-hidden="true">🗺</span>
          <span className="layer-panel__head-label">Layers</span>
          <span className="layer-panel__head-caret" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="layer-panel__body">
            {/* Ward search */}
            <input
              type="text"
              placeholder="Search Ward"
              value={wardSearch}
              onChange={e => onWardSearchChange(e.target.value)}
              className="layer-panel__ward-search"
              style={{
                width: '100%',
                padding: '5px 8px',
                border: '1px solid #d1d5db',
                borderRadius: 5,
                fontSize: 12,
                marginBottom: 10,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            {/* Overlay layers. The basemap has its own control in the
                bottom-right corner, so this panel is only boundaries. */}
            {LAYER_CONFIGS.map(layer => {
              const loaded = layerData[layer.id] !== null
              const enabled = enabledOverlays.has(layer.id)
              return (
                <div key={layer.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label className="layer-panel__row" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => onOverlayToggle(layer.id)}
                      style={{ accentColor: layerStyleToAccent(layer.style) }}
                    />
                    <span style={{ color: enabled ? '#111827' : '#6b7280' }}>
                      {layer.label}
                    </span>
                  </label>
                  {loaded && (
                    <button
                      onClick={() => onFitLayer(layer.id)}
                      title={`Zoom to ${layer.label}`}
                      aria-label={`Zoom to ${layer.label}`}
                      className="layer-panel__fit"
                      style={{
                        background: 'none', border: '1px solid #d1d5db',
                        borderRadius: 3, cursor: 'pointer',
                        fontSize: 10, padding: '1px 4px', color: '#374151',
                        marginLeft: 4,
                      }}
                    >⛶</button>
                  )}
                </div>
              )
            })}

            {/* How old each part of the city is */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTop: '1px solid #f3f4f6' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={ageOn}
                  onChange={() => onOverlayToggle(AREA_AGE_LAYER_ID)}
                  style={{ accentColor: AGE_ERAS[2].color }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 9,
                    borderRadius: 2,
                    flexShrink: 0,
                    background: `linear-gradient(to right, ${AGE_ERAS.map(e => e.color).join(', ')})`,
                  }}
                />
                <span style={{ color: ageOn ? '#111827' : '#6b7280' }}>{AREA_AGE_LAYER.label}</span>
              </label>
              {ageLoading && <span style={{ fontSize: 10, color: '#9ca3af' }}>…</span>}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, marginLeft: 20 }}>
              Tints the city by when each area grew, with a chip per dated locality.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function layerStyleToAccent(style: L.PathOptions): string {
  return (style.color as string) ?? '#2563eb'
}

// ── Map search ───────────────────────────────────────────────────────────────

type SearchHitType = 'ward' | 'constituency'

interface SearchHit {
  type: SearchHitType
  key: string
  label: string
  sublabel: string
}

const SEARCH_TYPE_ICON: Record<SearchHitType, string> = { ward: '📍', constituency: '🗳' }
const SEARCH_MIN_CHARS = 2
const SEARCH_MAX_RESULTS = 8

// Geocoding search result type
interface GeocodeResultItem {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type?: string
}

function MapSearchBox({
  wardsFc,
  onSelectWard,
  onFocus,
}: {
  wardsFc: FeatureCollection | null
  onSelectWard: (feature: Feature) => void
  onFocus: () => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Ward and constituency hits both resolve back to a ward Feature — a
  // constituency has no boundary of its own here, so its "page" is the ward
  // that represents it, same as clicking Constituency in the popup does.
  const { hits, wardByLabel } = useMemo(() => {
    const query = q.trim().toLowerCase()
    const wardByLabel = new Map<string, Feature>()
    if (query.length < SEARCH_MIN_CHARS) return { hits: [] as SearchHit[], wardByLabel }

    const out: SearchHit[] = []
    if (wardsFc) {
      const seenAc = new Set<string>()
      for (const f of wardsFc.features) {
        const props = f.properties as WardProperties
        const wardName = String(getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name') ?? '')
        const ac = String(getProp(props, 'ac', 'Assembly', 'assembly_constituency', 'Assembly_Constituency', 'constituency') ?? '')
        const corp = String(getProp(props, 'Corporation', 'Corporatio', 'corporation') ?? '')
        if (!wardName) continue
        wardByLabel.set(wardName, f)
        if (wardName.toLowerCase().includes(query)) {
          out.push({ type: 'ward', key: `ward:${wardName}`, label: wardName, sublabel: [corp, ac].filter(Boolean).join(' · ') })
        } else if (ac && !seenAc.has(ac) && ac.toLowerCase().includes(query)) {
          seenAc.add(ac)
          wardByLabel.set(`ac:${ac}`, f)
          out.push({ type: 'constituency', key: `ac:${ac}`, label: ac, sublabel: `Constituency${corp ? ` · ${corp} corporation` : ''}` })
        }
      }
    }
    return { hits: out.slice(0, SEARCH_MAX_RESULTS), wardByLabel }
  }, [q, wardsFc])

  const select = (hit: SearchHit) => {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    if (hit.type === 'ward') {
      const f = wardByLabel.get(hit.label)
      if (f) onSelectWard(f)
    } else {
      const f = wardByLabel.get(`ac:${hit.label}`)
      if (f) onSelectWard(f)
    }
  }

  return (
    <div className="map-search">
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); onFocus() }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search ward, constituency…"
        aria-label="Search the map"
        className="map-search__input"
      />
      {open && q.trim().length >= SEARCH_MIN_CHARS && (
        <div className="map-search__results">
          {hits.length > 0 ? hits.map(hit => (
            <button
              key={hit.key}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(hit)}
              className="map-search__hit"
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff',
                cursor: 'pointer', font: 'inherit',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {SEARCH_TYPE_ICON[hit.type]} {hit.label}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{hit.sublabel}</div>
            </button>
          )) : (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>
              {wardsFc ? 'No matches.' : 'Loading ward data…'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Ward popup ───────────────────────────────────────────────────────────────

interface WardPopupInfo {
  latlng: L.LatLng
  feature: Feature
}

interface WardAmenityCounts {
  hospitals: number
  parks: number
  schools: number
  safety: number
}

interface AmenityPoint {
  id: number
  name: string
  category: keyof WardAmenityCounts
  lat: number
  lon: number
}

type WardAmenityItems = Record<keyof WardAmenityCounts, AmenityPoint[]>

const AMENITY_COLORS: Record<keyof WardAmenityCounts, string> = {
  hospitals: '#ef4444',
  parks: '#16a34a',
  schools: '#7c3aed',
  safety: '#f59e0b',
}

// One badge-style divIcon per amenity category, built lazily so this module
// can still be imported in a non-browser context without touching document/L internals.
const amenityIconCache = new Map<string, L.DivIcon>()
function amenityDivIcon(category: keyof WardAmenityCounts, icon: string): L.DivIcon {
  const key = category
  let divIcon = amenityIconCache.get(key)
  if (!divIcon) {
    const color = AMENITY_COLORS[category]
    divIcon = L.divIcon({
      html: `
        <div style="position:relative;width:38px;height:38px;animation:amenity-pop 0.4s ease-out">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:amenity-pulse 1.8s ease-out infinite"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:16px;">${icon}</div>
        </div>
      `,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })
    amenityIconCache.set(key, divIcon)
  }
  return divIcon
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

const AMENITY_LABELS: Array<[keyof WardAmenityCounts, string, string]> = [
  ['hospitals', '🏥', 'Hospitals & clinics'],
  ['parks', '🌳', 'Parks & playgrounds'],
  ['schools', '🏫', 'Schools & colleges'],
  ['safety', '🚓', 'Police & fire stations'],
]

function WardPopupContent({
  feature,
  amenities,
  amenitiesLoading,
  amenitiesFailed,
  onWardNoClick,
  onCorporationClick,
  onConstituencyClick,
}: {
  feature: Feature
  amenities: WardAmenityCounts | null
  amenitiesLoading: boolean
  amenitiesFailed: boolean
  onWardNoClick?: () => void
  onCorporationClick?: () => void
  onConstituencyClick?: () => void
}) {
  const props = feature.properties as WardProperties
  const wardName = getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name')
  const wardNameKn = getProp(props, 'ward_name_kn')
  const wardNo = getProp(props, 'ward_id', 'wardcode', 'ward_no', 'Ward_No', 'WardNo', 'ward_number')
  const corporation = getProp(props, 'Corporation', 'Corporatio', 'corporation', 'ulbname')
  const constituency = getProp(props, 'ac', 'Assembly', 'assembly_constituency', 'Assembly_Constituency', 'constituency')
  const district = getProp(props, 'districtname', 'district')

  const rows: [string, string | number | undefined, (() => void) | undefined][] = [
    ['Ward No', wardNo, onWardNoClick],
    ['Corporation', corporation, onCorporationClick],
    ['Constituency', constituency, onConstituencyClick],
    ['District', district, undefined],
  ]

  return (
    <div style={{ fontSize: 13, minWidth: 170 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: '#1e40af' }}>
        {wardName ?? 'Ward'}
      </div>
      {wardNameKn && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{String(wardNameKn)}</div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: wardNameKn ? 0 : 6 }}>
        <tbody>
          {rows.filter(([, v]) => v !== undefined && v !== '').map(([label, v, onClick]) => (
            <tr key={label}>
              <td style={{ color: '#6b7280', paddingBottom: 4, paddingRight: 8, verticalAlign: 'top' }}>{label}</td>
              <td style={{ fontWeight: 600, paddingBottom: 4 }}>
                {onClick ? (
                  <button type="button" className="map-link-btn" onClick={onClick}>{String(v)}</button>
                ) : String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8 }}>
        {amenitiesLoading ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading amenities…</div>
        ) : amenitiesFailed ? (
          <div style={{ color: '#b45309', fontSize: 12 }}>Amenity data temporarily unavailable — try again shortly.</div>
        ) : amenities ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {AMENITY_LABELS.map(([key, icon, label]) => (
                <tr key={key}>
                  <td style={{ color: '#6b7280', paddingBottom: 3, paddingRight: 8 }}>{icon} {label}</td>
                  <td style={{ fontWeight: 600, paddingBottom: 3, textAlign: 'right' }}>{amenities[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}

// ── Ward sidebar ─────────────────────────────────────────────────────────────

interface WardDetails {
  pincodes: string[]
  officials: OfficialContact[]
  officialsOk: boolean
}

interface WardSidebarProps {
  wardName: string
  wardNo: string | number | undefined
  corporation: string | undefined
  constituency: string | undefined
  details: WardDetails | null
  detailsLoading: boolean
  detailsFailed: boolean
  amenities: WardAmenityCounts | null
  amenityItems: WardAmenityItems | null
  amenitiesLoading: boolean
  amenitiesFailed: boolean
  expandedAmenityCategory: keyof WardAmenityCounts | null
  activeAmenityId: number | null
  onToggleAmenityCategory: (key: keyof WardAmenityCounts) => void
  onAmenityItemClick: (item: AmenityPoint) => void
  /** Phone layout: the panel is a bottom sheet rather than a right-hand column. */
  sheet: boolean
  sheetExpanded: boolean
  onToggleExpand: () => void
  onClose: () => void
  onWardNoClick?: () => void
  onCorporationClick?: () => void
  onConstituencyClick?: () => void
}

function SidebarSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ borderBottom: '1px solid #f3f4f6', padding: '14px 0' }}>
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b7280' }}>
        {title}
      </h3>
      {note && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{note}</div>}
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  )
}

function SidebarNote({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: '#9ca3af' }}>{children}</div>
}

function OfficialCard({ contact }: { contact: OfficialContact }) {
  const role = roleById(contact.role)
  return (
    <div style={{ padding: '8px 0', borderTop: '1px solid #f9fafb' }}>
      <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>{role?.label ?? contact.role}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{contact.name}</div>
      {contact.party && (
        <div style={{ fontSize: 11, color: '#6b7280' }}>{contact.party}</div>
      )}
      {contact.phones.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {contact.phones.map(phone => (
            <a
              key={phone}
              href={telHref(phone)}
              style={{
                fontSize: 12, fontWeight: 600, color: '#065f46', background: '#ecfdf5',
                border: '1px solid #a7f3d0', borderRadius: 999, padding: '3px 9px',
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >📞 {phone}</a>
          ))}
        </div>
      )}
      {contact.email && (
        <div style={{ marginTop: 4 }}>
          <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: '#2563eb', wordBreak: 'break-all' }}>
            ✉ {contact.email}
          </a>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{contact.coverageLabel}</div>
    </div>
  )
}

// How many named amenities an expanded category lists before it stops — a ward
// can hold a few dozen schools, and the list is a sample, not a register.
const AMENITY_LIST_LIMIT = 12

function AmenitySection({
  amenities, items, loading, failed, expanded, activeId, onToggleCategory, onItemClick,
}: {
  amenities: WardAmenityCounts | null
  items: WardAmenityItems | null
  loading: boolean
  failed: boolean
  expanded: keyof WardAmenityCounts | null
  activeId: number | null
  onToggleCategory: (key: keyof WardAmenityCounts) => void
  onItemClick: (item: AmenityPoint) => void
}) {
  if (loading) return <SidebarNote>Loading amenities…</SidebarNote>
  if (failed) return <SidebarNote>Amenity data temporarily unavailable — try again shortly.</SidebarNote>
  if (!amenities) return <SidebarNote>No amenity data for this ward.</SidebarNote>

  return (
    <div>
      {AMENITY_LABELS.map(([key, icon, label]) => {
        const count = amenities[key]
        const named = (items?.[key] ?? []).filter(item => item.name && item.name !== 'Unnamed')
        const isOpen = expanded === key
        return (
          <div key={key} style={{ borderTop: '1px solid #f9fafb' }}>
            <button
              onClick={() => onToggleCategory(key)}
              disabled={!named.length}
              title={named.length ? 'Show these on the map' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', padding: '8px 0',
                cursor: named.length ? 'pointer' : 'default', textAlign: 'left',
                font: 'inherit', color: 'inherit',
              }}
            >
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: count ? AMENITY_COLORS[key] : '#d1d5db' }}>{count}</span>
              {named.length > 0 && (
                <span style={{ fontSize: 9, color: '#9ca3af', width: 10 }}>{isOpen ? '▲' : '▼'}</span>
              )}
            </button>
            {isOpen && (
              <ul style={{ margin: '0 0 8px', padding: '0 0 0 26px', listStyle: 'disc' }}>
                {named.slice(0, AMENITY_LIST_LIMIT).map(item => (
                  <li key={item.id} style={{ marginBottom: 2 }}>
                    <button
                      type="button"
                      onClick={() => onItemClick(item)}
                      title="Show on map"
                      style={{
                        background: 'none', border: 'none', padding: 0, margin: 0,
                        font: 'inherit', textAlign: 'left', cursor: 'pointer',
                        fontSize: 12, color: item.id === activeId ? AMENITY_COLORS[key] : '#4b5563',
                        fontWeight: item.id === activeId ? 700 : 400,
                      }}
                    >{item.name}</button>
                  </li>
                ))}
                {named.length > AMENITY_LIST_LIMIT && (
                  <li style={{ fontSize: 11, color: '#9ca3af', listStyle: 'none', marginLeft: -14 }}>
                    +{named.length - AMENITY_LIST_LIMIT} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function WardSidebar({
  wardName, wardNo, corporation, constituency,
  details, detailsLoading, detailsFailed,
  amenities, amenityItems, amenitiesLoading, amenitiesFailed,
  expandedAmenityCategory, activeAmenityId, onToggleAmenityCategory, onAmenityItemClick,
  sheet, sheetExpanded, onToggleExpand,
  onClose, onWardNoClick, onCorporationClick, onConstituencyClick,
}: WardSidebarProps) {
  // Officials are grouped the way /officials groups them, so the same ward
  // reads the same on both pages.
  const officialGroups = useMemo(() => {
    const contacts = details?.officials ?? []
    return ROLE_GROUPS
      .map(group => [group, contacts.filter(c => roleById(c.role)?.group === group)] as const)
      .filter(([, members]) => members.length > 0)
  }, [details])

  const className = [
    'ward-sidebar',
    sheet ? 'ward-sidebar--sheet' : '',
    sheet && sheetExpanded ? 'ward-sidebar--expanded' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 320,
      maxWidth: '100vw',
      height: '100%',
      background: '#fff',
      boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'auto',
    }}>
      {/* Grab handle — taps between the half-height and near-full-height sheet */}
      {sheet && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="ward-sheet-handle"
          aria-expanded={sheetExpanded}
          aria-label={sheetExpanded ? 'Shrink ward details' : 'Expand ward details'}
        >
          <span className="ward-sheet-handle__bar" />
        </button>
      )}

      {/* Header */}
      <div style={{
        background: '#1e3a5f',
        color: '#fff',
        padding: '12px 14px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{wardName}</div>
            {wardNo && (
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                Ward No.{' '}
                {onWardNoClick ? (
                  <button
                    type="button"
                    onClick={onWardNoClick}
                    title="See officials for this ward"
                    style={{
                      background: 'none', border: 'none', padding: 0, margin: 0,
                      font: 'inherit', color: '#93c5fd', cursor: 'pointer',
                      textDecoration: 'underline', textUnderlineOffset: 2,
                    }}
                  >{wardNo}</button>
                ) : wardNo}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close ward details"
            className="ward-sidebar__close"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 16,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >✕</button>
        </div>
        {(corporation || constituency) && (
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.9, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {corporation && (
              <button
                type="button"
                onClick={onCorporationClick}
                disabled={!onCorporationClick}
                title="Zoom to this corporation"
                style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 4,
                  padding: '2px 7px', font: 'inherit', color: '#fff',
                  cursor: onCorporationClick ? 'pointer' : 'default',
                }}
              >{corporation}</button>
            )}
            {constituency && (
              <button
                type="button"
                onClick={onConstituencyClick}
                disabled={!onConstituencyClick}
                title="See this constituency's MLA"
                style={{
                  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 4,
                  padding: '2px 7px', font: 'inherit', color: '#fff',
                  cursor: onConstituencyClick ? 'pointer' : 'default',
                }}
              >{constituency}</button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="ward-sidebar__body" style={{ flex: 1, overflowY: 'auto', padding: '0 14px 16px' }}>
        <SidebarSection title="Pincodes">
          {detailsLoading ? (
            <SidebarNote>Loading pincodes…</SidebarNote>
          ) : detailsFailed ? (
            <SidebarNote>Couldn&apos;t load pincodes — try again shortly.</SidebarNote>
          ) : details && details.pincodes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {details.pincodes.map(pin => (
                <span
                  key={pin}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#1e3a5f', background: '#eef2f7',
                    border: '1px solid #dbe3ee', borderRadius: 999, padding: '3px 9px',
                  }}
                >{pin}</span>
              ))}
            </div>
          ) : (
            <SidebarNote>
              No pincode mapped to this ward — several 2025 wards are new splits the pincode
              records haven&apos;t caught up with.
            </SidebarNote>
          )}
        </SidebarSection>

        <SidebarSection title="Local administration">
          {detailsLoading ? (
            <SidebarNote>Loading contacts…</SidebarNote>
          ) : detailsFailed || details?.officialsOk === false ? (
            <SidebarNote>Contact directory temporarily unavailable — try again shortly.</SidebarNote>
          ) : officialGroups.length > 0 ? (
            <>
              {officialGroups.map(([group, members]) => (
                <div key={group} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {ROLE_GROUP_LABELS[group]}
                  </div>
                  {members.map(contact => (
                    <OfficialCard key={contact.id} contact={contact} />
                  ))}
                </div>
              ))}
              <a href="/officials" style={{ fontSize: 12, color: '#2563eb' }}>
                Full contact directory →
              </a>
            </>
          ) : (
            <SidebarNote>
              No contacts listed under this ward&apos;s name — this map shows 2018 ward boundaries,
              while the officials directory&apos;s corporators are keyed to the 2023 LMC wards, a
              different delimitation. See the{' '}
              <a href="/officials" style={{ color: '#2563eb' }}>full directory</a>.
            </SidebarNote>
          )}
        </SidebarSection>

        <SidebarSection title="Amenities" note="Hospitals, parks, schools and safety services inside the ward.">
          <AmenitySection
            amenities={amenities}
            items={amenityItems}
            loading={amenitiesLoading}
            failed={amenitiesFailed}
            expanded={expandedAmenityCategory}
            activeId={activeAmenityId}
            onToggleCategory={onToggleAmenityCategory}
            onItemClick={onAmenityItemClick}
          />
        </SidebarSection>

        <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.6, paddingTop: 12 }}>
          Pincodes: LMC ward–pincode mapping + OpenStreetMap. Contacts: GBA road register and
          OpenCity. Amenities: OpenStreetMap.
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LayeredLucknowMap({ initialWardName }: { initialWardName?: string } = {}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [activeBase, setActiveBase] = useState<BaseLayer>('osm')
  const [enabledOverlays, setEnabledOverlays] = useState<Set<OverlayId>>(
    new Set<OverlayId>(LAYER_CONFIGS.filter(l => l.defaultEnabled).map(l => l.id))
  )
  const [layerData, setLayerData] = useState<Record<LayerId, FeatureCollection | null>>({
    gba: null, wards369: null,
  })
  const [wardSearch, setWardSearch] = useState('')
  // Every keystroke restyles all 369 polygons. Keeping the box itself on the
  // live value and the map on the deferred one lets typing stay responsive
  // while the highlight catches up.
  const deferredWardSearch = useDeferredValue(wardSearch)
  const [selectedWardPopup, setSelectedWardPopup] = useState<WardPopupInfo | null>(null)
  // Closed everywhere to start — the map is the page, and the boundaries that
  // are on by default are already drawn on it.
  const [panelOpen, setPanelOpen] = useState(false)
  const [wardSidebar, setWardSidebar] = useState<{
    wardName: string
    wardNo: string | number | undefined
    corporation: string | undefined
    constituency: string | undefined
  } | null>(null)
  // Phone only: the ward sheet starts at ~60% height and can be pulled up.
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [wardDetails, setWardDetails] = useState<WardDetails | null>(null)
  const [wardDetailsLoading, setWardDetailsLoading] = useState(false)
  const [wardDetailsFailed, setWardDetailsFailed] = useState(false)
  const [wardAmenities, setWardAmenities] = useState<WardAmenityCounts | null>(null)
  const [wardAmenityItems, setWardAmenityItems] = useState<WardAmenityItems | null>(null)
  const [wardAmenitiesLoading, setWardAmenitiesLoading] = useState(false)
  const [wardAmenitiesFailed, setWardAmenitiesFailed] = useState(false)
  const [showNearestAmenities, setShowNearestAmenities] = useState(false)
  // Which amenity category is expanded in the sidebar (its pins are drawn on
  // the map) and which single named item within it was last clicked.
  const [expandedAmenityCategory, setExpandedAmenityCategory] = useState<keyof WardAmenityCounts | null>(null)
  const [activeAmenityId, setActiveAmenityId] = useState<number | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  // Bumped on every ward click so a slow response for a ward the user has
  // already clicked away from can't land in the sidebar.
  const wardRequestRef = useRef(0)

  // Lazy-fetch GeoJSON when a layer that needs it is first enabled. The names
  // layer has no file of its own, so it pulls in the ward file it reads from.
  useEffect(() => {
    boundaryFilesFor(enabledOverlays).forEach(id => {
      if (layerData[id] !== null) return
      fetch(layerConfig(id).url)
        .then(r => r.json())
        .then(data => setLayerData(prev => ({ ...prev, [id]: data })))
        .catch(() => {}) // file may not exist yet
    })
  }, [enabledOverlays]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOverlay = useCallback((id: OverlayId) => {
    setEnabledOverlays(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const fitLayer = useCallback((id: LayerId) => {
    const data = layerData[id]
    const map = mapRef.current
    if (!data || !map) return
    try {
      const bounds = L.geoJSON(data as GeoJsonObject).getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
    } catch {}
  }, [layerData])

  const handleWardClick = useCallback((
    feature: Feature,
    latlng: L.LatLng,
    opts?: { fromLocate?: boolean; boundary?: WardBoundarySet; recenter?: boolean },
  ) => {
    setSelectedWardPopup({ latlng, feature })
    setShowNearestAmenities(!!opts?.fromLocate)
    // A fresh ward gets a fresh sheet height, and the layers dropdown would
    // otherwise hang over the sheet on a phone.
    setSheetExpanded(false)
    if (isMobile) setPanelOpen(false)

    const boundary = opts?.boundary ?? 'wards369'
    const props = feature.properties as WardProperties
    const rawWardName = String(getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name') ?? 'Ward')
    // New 369-ward names are "24 - Agaram" format; strip the "N - " prefix, the
    // spelling the per-ward lookups key on.
    const lookupName = rawWardName.replace(/^\d+\s*-\s*/, '')
    const wardNo = getProp(props, 'wardcode', 'ward_no', 'Ward_No', 'WardNo', 'ward_number')
    const corporation = getProp(props, 'Corporation', 'Corporatio', 'corporation', 'ulbname')
    const constituency = getProp(props, 'ac', 'Assembly', 'assembly_constituency', 'Assembly_Constituency', 'constituency')

    const requestId = ++wardRequestRef.current
    const isCurrent = () => wardRequestRef.current === requestId

    setWardSidebar({
      wardName: rawWardName,
      wardNo,
      corporation: corporation !== undefined ? String(corporation) : undefined,
      constituency: constituency !== undefined ? String(constituency) : undefined,
    })

    // The panel is about to cover the right third (or, on a phone, the bottom
    // two thirds) of the map — recenter so the ward that was just clicked
    // doesn't end up hidden underneath it. Callers that already fit the map to
    // the ward's own bounds opt out, so the two don't shift it twice.
    const map = mapRef.current
    if (map && opts?.recenter !== false) {
      centerForPanels(map, latlng, { sidebarOpen: true, layerPanelOpen: panelOpen })
    }

    setWardDetails(null)
    setWardDetailsFailed(false)
    setWardDetailsLoading(true)
    fetch(`/api/ward-details?ward_name=${encodeURIComponent(lookupName)}&boundary=${boundary}`)
      .then(r => r.json())
      .then(data => {
        if (!isCurrent()) return
        setWardDetails({
          pincodes: data.pincodes ?? [],
          officials: data.officials ?? [],
          officialsOk: data.officialsOk !== false,
        })
        setWardDetailsLoading(false)
      })
      .catch(() => {
        if (!isCurrent()) return
        setWardDetailsLoading(false)
        setWardDetailsFailed(true)
      })

    setWardAmenities(null)
    setWardAmenityItems(null)
    setWardAmenitiesFailed(false)
    setWardAmenitiesLoading(true)
    setExpandedAmenityCategory(null)
    setActiveAmenityId(null)
    fetch(`/api/ward-amenities?ward_name=${encodeURIComponent(lookupName)}&boundary=${boundary}`)
      .then(r => r.json())
      .then(data => {
        if (!isCurrent()) return
        setWardAmenities(data.counts ?? null)
        setWardAmenityItems(data.items ?? null)
        setWardAmenitiesFailed(data.ok === false)
        setWardAmenitiesLoading(false)
      })
      .catch(() => {
        if (!isCurrent()) return
        setWardAmenitiesLoading(false)
        setWardAmenitiesFailed(true)
      })
  }, [panelOpen, isMobile])

  const handleLocateMe = useCallback(() => {
    setLocateError(null)

    if (!('geolocation' in navigator)) {
      setLocateError('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude, accuracy })

        const map = mapRef.current
        if (map) map.flyTo([latitude, longitude], 16, { duration: 1 })

        // Make sure the ward layer is visible so the highlighted ward is legible
        setEnabledOverlays(prev => (prev.has('wards369') ? prev : new Set(prev).add('wards369')))

        // Reuse already-fetched ward boundaries when available, otherwise fetch now
        let wardsFc = layerData.wards369
        if (!wardsFc) {
          try {
            const res = await fetch('/api/geojson/wards')
            wardsFc = await res.json()
            if (wardsFc) setLayerData(prev => ({ ...prev, wards369: wardsFc as FeatureCollection }))
          } catch {
            // handled below via wardsFc still being null
          }
        }

        setLocating(false)

        if (!wardsFc) {
          setLocateError('Could not load ward boundaries to look up your ward.')
          return
        }

        const feature = findWardAtPoint(latitude, longitude, wardsFc)
        if (feature) {
          handleWardClick(feature, L.latLng(latitude, longitude), { fromLocate: true })
        } else {
          setLocateError("You're outside the mapped Lucknow ward boundaries.")
        }
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError('Location permission denied. Enable it in your browser settings and try again.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocateError('Your location is currently unavailable.')
        } else if (err.code === err.TIMEOUT) {
          setLocateError('Location request timed out. Please try again.')
        } else {
          setLocateError('Unable to retrieve your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }, [layerData.wards369, handleWardClick])

  // Deep-link support: open a specific ward (e.g. from the profile page's
  // "View full map" link) pre-selected with its popup and amenity data.
  useEffect(() => {
    if (!initialWardName) return
    let cancelled = false

    ;(async () => {
      setEnabledOverlays(prev => (prev.has('wards369') ? prev : new Set(prev).add('wards369')))

      let wardsFc = layerData.wards369
      if (!wardsFc) {
        try {
          const res = await fetch('/api/geojson/wards')
          wardsFc = await res.json()
          if (wardsFc && !cancelled) setLayerData(prev => ({ ...prev, wards369: wardsFc as FeatureCollection }))
        } catch {
          return
        }
      }
      if (cancelled || !wardsFc) return

      const feature = wardsFc.features.find(f => {
        const props = f.properties as WardProperties
        return getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name') === initialWardName
      })
      if (!feature) return

      try {
        const bounds = L.geoJSON(feature as GeoJsonObject).getBounds()
        if (bounds.isValid()) {
          const map = mapRef.current
          if (map) fitBoundsForPanels(map, bounds, { sidebarOpen: true, layerPanelOpen: false })
          handleWardClick(feature, bounds.getCenter(), { recenter: false })
        }
      } catch {}
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWardName])

  const closeWardSidebar = useCallback(() => {
    // Any in-flight lookup belongs to a sidebar that's gone.
    wardRequestRef.current++
    setWardSidebar(null)
    setSheetExpanded(false)
    setWardDetails(null)
    setWardDetailsLoading(false)
    setWardDetailsFailed(false)
  }, [])

  // Expanding an amenity category in the sidebar drops a pin for each of its
  // named items and fits the map to them; collapsing (or re-clicking the same
  // category) just clears the pins.
  const handleToggleAmenityCategory = useCallback((key: keyof WardAmenityCounts) => {
    setActiveAmenityId(null)
    setExpandedAmenityCategory(prev => {
      const next = prev === key ? null : key
      if (next) {
        const named = (wardAmenityItems?.[next] ?? []).filter(item => item.name && item.name !== 'Unnamed')
        const map = mapRef.current
        if (map && named.length) {
          if (isMobile) setSheetExpanded(false)
          const bounds = L.latLngBounds(named.map(item => L.latLng(item.lat, item.lon)))
          fitBoundsForPanels(map, bounds, { sidebarOpen: true, layerPanelOpen: panelOpen })
        }
      }
      return next
    })
  }, [wardAmenityItems, isMobile, panelOpen])

  // Flies to a single named amenity clicked in the sidebar list and highlights
  // its pin among the ones already drawn for the expanded category.
  const handleAmenityItemClick = useCallback((item: AmenityPoint) => {
    setActiveAmenityId(item.id)
    const map = mapRef.current
    if (!map) return
    if (isMobile) setSheetExpanded(false)
    fitBoundsForPanels(
      map,
      L.latLng(item.lat, item.lon).toBounds(400),
      { sidebarOpen: true, layerPanelOpen: panelOpen },
      { maxZoom: 18 },
    )
  }, [isMobile, panelOpen])

  // Ward number / constituency links both open the officials directory,
  // pre-filtered — that page already resolves a constituency to its MLA via
  // the ward's own coverage, so no separate constituency page is needed.
  const goToOfficialsForWard = useCallback((wardName: string) => {
    if (!wardName) return
    router.push(`/officials?ward=${encodeURIComponent(wardName)}`)
  }, [router])

  const goToOfficialsForConstituency = useCallback((wardName: string) => {
    if (!wardName) return
    router.push(`/officials?ward=${encodeURIComponent(wardName)}&role=mla`)
  }, [router])

  // Shared by Locate Me, the deep-link effect and the search box so the ~1MB
  // ward file is fetched at most once no matter which feature asks for it first.
  const ensureWards369 = useCallback(async (): Promise<FeatureCollection | null> => {
    if (layerData.wards369) return layerData.wards369
    try {
      const res = await fetch('/api/geojson/wards')
      const data = await res.json()
      if (data) setLayerData(prev => (prev.wards369 ? prev : { ...prev, wards369: data }))
      return data ?? null
    } catch {
      return null
    }
  }, [layerData.wards369])

  // A ward picked from the search box — reveal the layer, fit to it (padded
  // for whichever panel is open) and open its popup + sidebar like a click would.
  const selectSearchWard = useCallback((feature: Feature) => {
    setEnabledOverlays(prev => (prev.has('wards369') ? prev : new Set(prev).add('wards369')))
    let latlng = L.latLng(LUCKNOW_CENTER)
    let fitted = false
    try {
      const bounds = L.geoJSON(feature as GeoJsonObject).getBounds()
      if (bounds.isValid()) {
        latlng = bounds.getCenter()
        const map = mapRef.current
        if (map) {
          fitBoundsForPanels(map, bounds, { sidebarOpen: true, layerPanelOpen: panelOpen })
          fitted = true
        }
      }
    } catch {}
    handleWardClick(feature, latlng, { boundary: 'wards369', recenter: !fitted })
  }, [handleWardClick, panelOpen])

  const clearPopups = useCallback(() => {
    setSelectedWardPopup(null)
    closeWardSidebar()
    setWardAmenities(null)
    setWardAmenityItems(null)
    setWardAmenitiesFailed(false)
    setShowNearestAmenities(false)
    setExpandedAmenityCategory(null)
    setActiveAmenityId(null)
    // On a phone the layers dropdown floats over the map — a tap on the map is
    // the obvious way to dismiss it.
    if (isMobile) setPanelOpen(false)
  }, [closeWardSidebar, isMobile])

  // Region hover — a click-triggered popup left open over a different area
  // than the one under the cursor is more confusing than useful, so the hover
  // tooltip takes over instead.
  const handleRegionHover = useCallback((feature: Feature | null) => {
    if (feature) setSelectedWardPopup(null)
  }, [])

  const baseCfg = BASE_LAYERS[activeBase]

  const ageOn = enabledOverlays.has(AREA_AGE_LAYER_ID)

  // Nearest amenity per category to the located "you are here" point, shown
  // only right after using Locate Me (not on plain ward clicks).
  const nearestAmenities = useMemo(() => {
    if (!showNearestAmenities || !userLocation || !wardAmenityItems) return []
    return AMENITY_LABELS.map(([key, icon, label]) => {
      const items = wardAmenityItems[key] ?? []
      if (!items.length) return null
      let best = items[0]
      let bestDist = haversineMeters(userLocation.lat, userLocation.lng, best.lat, best.lon)
      for (const item of items.slice(1)) {
        const d = haversineMeters(userLocation.lat, userLocation.lng, item.lat, item.lon)
        if (d < bestDist) { bestDist = d; best = item }
      }
      return { ...best, icon, label, distanceM: bestDist }
    }).filter((x): x is AmenityPoint & { icon: string; label: string; distanceM: number } => x !== null)
  }, [showNearestAmenities, userLocation, wardAmenityItems])

  // Pins for every named item in the sidebar's currently-expanded amenity
  // category, so clicking a category shows where its places actually are.
  const expandedCategoryAmenities = useMemo(() => {
    if (!expandedAmenityCategory || !wardAmenityItems) return []
    const [, icon, label] = AMENITY_LABELS.find(([key]) => key === expandedAmenityCategory)!
    return (wardAmenityItems[expandedAmenityCategory] ?? [])
      .filter(item => item.name && item.name !== 'Unnamed')
      .map(item => ({ ...item, icon, label }))
  }, [expandedAmenityCategory, wardAmenityItems])

  // Derived once per popup so the Ward No / Constituency links in the click
  // popup have something concrete to navigate to.
  const selectedWardMeta = useMemo(() => {
    if (!selectedWardPopup) return null
    const props = selectedWardPopup.feature.properties as WardProperties
    const rawWardName = String(getProp(props, 'ward_name', 'wardname', 'Ward_Name', 'WardName', 'name') ?? '')
    return { rawWardName }
  }, [selectedWardPopup])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        .ward-hover-tip {
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.18) !important;
          padding: 5px 9px !important;
        }
        .ward-hover-tip::before { display: none !important; }
        .map-link-btn {
          background: none; border: none; padding: 0; margin: 0;
          font: inherit; cursor: pointer; color: #2563eb; font-weight: 600;
          text-decoration: underline; text-decoration-color: #bfdbfe;
          text-underline-offset: 2px;
        }
        .map-link-btn:hover { color: #1d4ed8; text-decoration-color: #2563eb; }
        @keyframes locate-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes locate-attention {
          0%, 100% { box-shadow: 0 3px 14px rgba(0,0,0,0.3), 0 0 0 0 rgba(37,99,235,0.35); }
          50% { box-shadow: 0 3px 14px rgba(0,0,0,0.3), 0 0 0 8px rgba(37,99,235,0); }
        }
        @keyframes amenity-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes amenity-pulse {
          0% { transform: scale(0.7); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        /* ── Map chrome ────────────────────────────────────────────────────
           Every control lives in one of three stacks — a top bar, a
           bottom-left column and a bottom-right corner — so nothing is
           positioned into another control's space. All of them sit outside
           the Leaflet container, so a tap on a control never reaches the map
           underneath. */
        .map-topbar {
          position: absolute;
          top: 10px;
          left: 58px; /* clears the zoom control in the top-left corner */
          right: 10px;
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          pointer-events: none;
        }
        .map-topbar > * { pointer-events: auto; }

        .map-search { position: relative; flex: 0 1 320px; min-width: 0; }
        .map-search__input {
          width: 100%;
          padding: 9px 14px;
          border-radius: 999px;
          border: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.22);
          font-size: 13px;
          font-family: system-ui, sans-serif;
          outline: none;
          box-sizing: border-box;
          color: #111827;
          background: #fff;
        }
        .map-search__results {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          overflow: hidden auto;
          max-height: 320px;
          overscroll-behavior: contain;
        }

        .layer-panel-wrap { flex: 0 0 220px; max-width: calc(100vw - 24px); }
        .layer-panel {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          font-family: system-ui, sans-serif;
          font-size: 13px;
          overflow: hidden;
        }
        .layer-panel__head {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          font: inherit;
          font-weight: 700;
          font-size: 14px;
          color: #111827;
          cursor: pointer;
          user-select: none;
        }
        .layer-panel__head-icon { display: none; }
        .layer-panel__head-label { flex: 1; text-align: left; }
        .layer-panel__head-caret { font-size: 10px; color: #6b7280; }
        .layer-panel__body {
          padding: 8px 12px 12px;
          max-height: 60vh;
          overflow-y: auto;
          overscroll-behavior: contain;
          border-top: 1px solid #e5e7eb;
        }

        /* Sits above the Leaflet attribution strip along the bottom edge */
        .map-bottom-right {
          position: absolute;
          right: 12px;
          bottom: calc(32px + env(safe-area-inset-bottom, 0px));
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          max-width: calc(100vw - 24px);
          pointer-events: none;
        }
        .map-bottom-right > * { pointer-events: auto; }

        .basemap-switch {
          display: flex;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
          overflow: hidden;
          font-family: system-ui, sans-serif;
        }
        .basemap-switch__btn {
          padding: 7px 13px;
          border: none;
          border-left: 1px solid #e5e7eb;
          background: #fff;
          font: inherit;
          font-size: 12px;
          color: #374151;
          cursor: pointer;
          white-space: nowrap;
        }
        .basemap-switch__btn:first-child { border-left: none; }
        .basemap-switch__btn:hover { background: #f3f4f6; }
        .basemap-switch__btn.is-active {
          background: #1e3a5f;
          color: #fff;
          font-weight: 700;
        }

        .map-bottom-left {
          position: absolute;
          left: 12px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          max-width: calc(100vw - 24px);
          pointer-events: none;
        }
        .map-bottom-left > * { pointer-events: auto; }

        /* ── Phone layout ──────────────────────────────────────────────────
           Row 1 is the search box plus a layers button; the zoom control and
           the drill-down pill share row 2; the ward panel becomes a bottom
           sheet. Nothing shares a band with anything else. */
        @media (max-width: 640px) {
          /* Bigger, thumb-friendly Leaflet zoom buttons, dropped below row 1 */
          .leaflet-control-zoom a {
            width: 38px !important;
            height: 38px !important;
            line-height: 36px !important;
            font-size: 18px !important;
          }
          .leaflet-control-zoom { margin-top: 60px !important; margin-left: 8px !important; }

          /* Keep the attribution clear of the locate button */
          .leaflet-control-attribution {
            font-size: 9px !important;
            max-width: 58vw;
          }

          .map-topbar {
            top: 8px;
            left: 8px;
            right: 8px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .map-search { order: 1; flex: 1 1 140px; }
          /* 16px keeps iOS from zooming the page in on focus */
          .map-search__input { font-size: 16px; padding: 11px 16px; }
          .map-search__results { max-height: 46vh; }
          .map-search__hit { padding: 11px 14px !important; }

          .layer-panel-wrap { order: 2; flex: 0 0 auto; max-width: none; }
          .layer-panel {
            position: relative;
            background: transparent;
            box-shadow: none;
            overflow: visible;
          }
          .layer-panel__head {
            width: 44px;
            height: 44px;
            padding: 0;
            justify-content: center;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.22);
            font-size: 19px;
          }
          .layer-panel__head[aria-expanded="true"] { background: #1e3a5f; }
          .layer-panel__head-icon { display: block; line-height: 1; }
          .layer-panel__head-label,
          .layer-panel__head-caret { display: none; }
          .layer-panel__body {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: min(300px, calc(100vw - 16px));
            padding: 12px 14px 14px;
            background: #fff;
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-height: min(56vh, 430px);
            font-size: 13px;
          }
          /* Roomier hit areas inside the dropdown */
          .layer-panel__row { padding: 4px 0; }
          .layer-panel__row input { width: 17px; height: 17px; }
          .layer-panel__ward-search { padding: 9px 10px !important; font-size: 16px !important; }
          .layer-panel__fit { font-size: 13px !important; padding: 5px 9px !important; }

          .locate-btn { height: 46px !important; padding: 0 14px 0 12px !important; }
          .locate-btn-label { font-size: 12px !important; }

          .map-bottom-left {
            left: 8px;
            bottom: calc(10px + env(safe-area-inset-bottom, 0px));
            gap: 6px;
            max-width: calc(100vw - 16px);
          }

          /* Shares the bottom band with the locate button, which is anchored to
             the opposite corner — hence the tighter buttons, so the two still
             clear each other on a 320px screen. */
          .map-bottom-right {
            right: 8px;
            bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          }
          .basemap-switch__btn { padding: 8px 9px; font-size: 11px; }

          /* Ward details as a bottom sheet, so the map stays half visible */
          .ward-sidebar--sheet {
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 62vh !important;
            height: 62dvh !important;
            border-radius: 16px 16px 0 0 !important;
            box-shadow: 0 -8px 28px rgba(0,0,0,0.28) !important;
            transition: height 0.22s ease;
          }
          .ward-sidebar--expanded {
            height: 92vh !important;
            height: 92dvh !important;
          }
          .ward-sidebar--sheet .ward-sidebar__body {
            overscroll-behavior: contain;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .ward-sidebar__close { width: 38px !important; height: 38px !important; }
        }

        .ward-sheet-handle {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 9px 0 5px;
          background: #1e3a5f;
          border: none;
          cursor: pointer;
        }
        .ward-sheet-handle__bar {
          width: 42px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.5);
        }
      `}</style>

      <MapContainer
        center={LUCKNOW_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={MAX_MAP_ZOOM}
        maxBounds={LUCKNOW_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={false}
        // The ward layers are ~100k vertices across 374 polygons. As SVG that
        // is 374 <path> elements whose `d` attribute Leaflet rewrites on every
        // pan and zoom, which is what makes this map crawl; on canvas it is one
        // element and a paint. Restyling (hover, selection) redraws only the
        // bounds of the layers that changed, so interaction stays cheap.
        preferCanvas
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer
          key={activeBase}
          url={baseCfg.url}
          attribution={baseCfg.attribution}
          detectRetina={true}
          maxZoom={MAX_MAP_ZOOM}
          maxNativeZoom={baseCfg.maxNativeZoom}
        />

        <FitBoundsOnMount />
        <CtrlScrollZoom />
        <MapClickDeselect onDeselect={clearPopups} />

        {/* Area age tint — drawn first so every outline sits on top of it */}
        {ageOn && layerData.wards369 && <WardAgeTint data={layerData.wards369} />}

        {/* GBA Boundary */}
        {enabledOverlays.has('gba') && layerData.gba && (
          <GeoJSON
            key="gba"
            data={layerData.gba as GeoJsonObject}
            style={layerConfig('gba').style}
          />
        )}

        {/* Ward boundaries — interactive */}
        {enabledOverlays.has('wards369') && layerData.wards369 && (
          <WardGeoJSONLayer
            layerKey="wards369"
            boundary="wards369"
            data={layerData.wards369}
            style={layerConfig('wards369').style}
            selectedWard={selectedWardPopup?.feature ?? null}
            searchTerm={deferredWardSearch}
            onWardClick={handleWardClick}
            onWardHover={handleRegionHover}
          />
        )}


        {/* Year chips on each dated locality */}
        {ageOn && <AgeChips />}

        {/* Ward popup. On a phone the bottom sheet carries the same facts in a
            readable width, so a popup on top of it is just clutter. */}
        {selectedWardPopup && !isMobile && (
          <Popup
            position={selectedWardPopup.latlng}
            autoPanPaddingTopLeft={[12, 70]}
            autoPanPaddingBottomRight={[12, 90]}
            eventHandlers={{ remove: () => setSelectedWardPopup(null) }}
          >
            <WardPopupContent
              feature={selectedWardPopup.feature}
              amenities={wardAmenities}
              amenitiesLoading={wardAmenitiesLoading}
              amenitiesFailed={wardAmenitiesFailed}
              onWardNoClick={selectedWardMeta?.rawWardName ? () => goToOfficialsForWard(selectedWardMeta.rawWardName) : undefined}
              onConstituencyClick={selectedWardMeta?.rawWardName ? () => goToOfficialsForConstituency(selectedWardMeta.rawWardName) : undefined}
            />
          </Popup>
        )}

        {/* "You are here" marker + GPS accuracy ring */}
        {userLocation && (
          <>
            {userLocation.accuracy > 0 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.08 }}
              />
            )}
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
            />
          </>
        )}

        {/* Nearest amenity per category, shown after using Locate Me */}
        {nearestAmenities.map(item => (
          <Marker key={item.category} position={[item.lat, item.lon]} icon={amenityDivIcon(item.category, item.icon)}>
            <Tooltip direction="top" offset={[0, -16]} permanent>
              <span style={{ fontWeight: 700 }}>{item.icon} {formatDistance(item.distanceM)}</span>
            </Tooltip>
            <Popup>
              <div style={{ fontSize: 13, minWidth: 140 }}>
                <div style={{ color: '#6b7280', fontSize: 11 }}>{item.label}</div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ color: '#2563eb', fontWeight: 600, marginTop: 2 }}>{formatDistance(item.distanceM)} away</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Pins for the sidebar's currently-expanded amenity category. The
            item last clicked in the list gets a permanent name tooltip. */}
        {expandedCategoryAmenities.map(item => (
          <Marker key={item.id} position={[item.lat, item.lon]} icon={amenityDivIcon(item.category, item.icon)}>
            {item.id === activeAmenityId && (
              <Tooltip direction="top" offset={[0, -16]} permanent>
                <span style={{ fontWeight: 700 }}>{item.name}</span>
              </Tooltip>
            )}
            <Popup>
              <div style={{ fontSize: 13, minWidth: 140 }}>
                <div style={{ color: '#6b7280', fontSize: 11 }}>{item.label}</div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* Map chrome. All of it sits outside the Leaflet container — a tap on a
          control then can't fall through and pan or deselect the map — and in
          one of three stacks, so no control can land on top of another. */}
      <div className="map-topbar">
        <MapSearchBox
          wardsFc={layerData.wards369}
          onSelectWard={selectSearchWard}
          onFocus={() => { ensureWards369(); if (isMobile) setPanelOpen(false) }}
        />
        <LayerControlPanel
          enabledOverlays={enabledOverlays}
          onOverlayToggle={toggleOverlay}
          onFitLayer={fitLayer}
          layerData={layerData}
          wardSearch={wardSearch}
          onWardSearchChange={setWardSearch}
          open={panelOpen}
          onToggle={() => setPanelOpen(p => !p)}
        />
      </div>

      {/* Both bottom corners are covered by the sheet on a phone, so they
          stand down while it is open */}
      {!(isMobile && wardSidebar) && (
        <div className="map-bottom-right">
          <BasemapSwitch activeBase={activeBase} onBaseChange={setActiveBase} />
        </div>
      )}

      {!(isMobile && wardSidebar) && (
        <div className="map-bottom-left">
          {ageOn && <AgeLegend onClose={() => toggleOverlay(AREA_AGE_LAYER_ID)} />}
          {locateError && (
            <LocateErrorBanner message={locateError} onDismiss={() => setLocateError(null)} />
          )}
          <LocateButton locating={locating} located={!!userLocation} onClick={handleLocateMe} />
        </div>
      )}

      {wardSidebar && (
        <WardSidebar
          wardName={wardSidebar.wardName}
          wardNo={wardSidebar.wardNo}
          corporation={wardSidebar.corporation}
          constituency={wardSidebar.constituency}
          details={wardDetails}
          detailsLoading={wardDetailsLoading}
          detailsFailed={wardDetailsFailed}
          amenities={wardAmenities}
          amenityItems={wardAmenityItems}
          amenitiesLoading={wardAmenitiesLoading}
          amenitiesFailed={wardAmenitiesFailed}
          expandedAmenityCategory={expandedAmenityCategory}
          activeAmenityId={activeAmenityId}
          onToggleAmenityCategory={handleToggleAmenityCategory}
          onAmenityItemClick={handleAmenityItemClick}
          sheet={isMobile}
          sheetExpanded={sheetExpanded}
          onToggleExpand={() => setSheetExpanded(e => !e)}
          onClose={closeWardSidebar}
          onWardNoClick={() => goToOfficialsForWard(wardSidebar.wardName)}
          onConstituencyClick={() => goToOfficialsForConstituency(wardSidebar.wardName)}
        />
      )}
    </div>
  )
}
