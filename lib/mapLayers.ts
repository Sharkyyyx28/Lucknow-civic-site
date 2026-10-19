// Basemap and boundary-layer configuration shared by every Leaflet map on the
// site — the full explorer at /map and the small click-to-pin pickers used when
// saving a place or writing a community post. Keeping it here means a new
// basemap or boundary file only has to be added once.

import type * as L from 'leaflet'

// Real coordinates, derived from DataMeet's Lucknow Municipal Corporation
// boundary shapefile (Municipal_Spatial_Data repo) — bbox
// 80.831,26.744 – 81.061,26.934. Center is the commonly cited Lucknow
// city-centre point.
export const LUCKNOW_CENTER: [number, number] = [26.8467, 80.9462]
export const LUCKNOW_BOUNDS: [[number, number], [number, number]] = [
  [26.70, 80.75],
  [27.00, 81.15],
]

// Ward polygons are detailed enough to be useful well past the old cap of 18 —
// street-level zoom matters when someone is checking exactly which ward a
// specific building falls in.
export const MAX_MAP_ZOOM = 21

// Nothing on this site has data outside greater Lucknow, so letting a pinch
// or scroll zoom out past city scale just means loading world tiles and
// panning a mostly-empty basemap — that's what was causing the lag/rendering
// complaints. This is roughly the zoom level the full LMC extent fills the
// viewport at.
export const MIN_MAP_ZOOM = 10

// ── Base layers ──────────────────────────────────────────────────────────────

export type BaseLayer = 'osm' | 'satellite' | 'street'

export interface BaseLayerConfig {
  /** Full name, used where there is room for it (the /map layer panel) */
  label: string
  /** One-word name, for the compact switcher on the small picker maps */
  shortLabel: string
  url: string
  attribution: string
  /**
   * Highest zoom the tile server actually has imagery for. Leaflet upscales
   * beyond this up to the map's own `maxZoom`, so street-level detail past
   * this point is a blown-up version of the last real tile, not new data.
   */
  maxNativeZoom: number
}

export const BASE_LAYERS: Record<BaseLayer, BaseLayerConfig> = {
  osm: {
    label: 'OpenStreetMap',
    shortLabel: 'Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  // Note: Google tile URLs are unofficial/undocumented and may change without notice
  satellite: {
    label: 'Google Earth Satellite',
    shortLabel: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxNativeZoom: 20,
  },
  street: {
    label: 'Google Street',
    shortLabel: 'Street',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxNativeZoom: 20,
  },
}

// ── Boundary overlays ────────────────────────────────────────────────────────

export type LayerId = 'gba' | 'wards369'

export interface LayerConfig {
  id: LayerId
  label: string
  /** Trimmed label for the compact switcher */
  shortLabel: string
  url: string
  /** PolylineOptions rather than PathOptions so a layer can carry its own
   *  `smoothFactor` — how hard Leaflet thins vertices at draw time. */
  style: L.PolylineOptions
  defaultEnabled: boolean
  /**
   * Boundary files big enough that they should only be fetched when asked for.
   * The picker maps leave these off until the reader ticks them.
   */
  heavy?: boolean
}

// Bengaluru's build had four boundary overlays: the metro-region outline, a
// five-way corporation split, a current 369-ward set and a legacy 198-ward
// set. Lucknow has no corporation split (Lucknow Nagar Nigam is one unified
// corporation, not five) and no legacy ward scheme equivalent to Bengaluru's
// pre-2025 198-ward set — see lib/wards.ts and BUILD-NOTES.md. Those two never
// had real geometry to show, so they were dropped rather than kept as
// permanently-empty toggles. 'wards369' does have real geometry (see
// lib/wards.ts) but is labeled with its 2018/pre-2023 vintage since it isn't
// current.
export const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'gba',
    label: 'Lucknow Municipal Corporation boundary',
    shortLabel: 'City boundary',
    url: '/geojson/lucknow-city-boundary.geojson',
    style: { color: '#C41E3A', weight: 3, fill: false, opacity: 0.9 },
    defaultEnabled: true,
  },
  {
    id: 'wards369',
    label: 'Ward boundaries (2018, pre-2023 delimitation — names/counts may differ from current wards)',
    shortLabel: 'Wards (2018)',
    url: '/api/geojson/wards',
    style: { color: '#475569', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.08, opacity: 0.7, smoothFactor: 1.5 },
    defaultEnabled: false,
    heavy: true,
  },
]

export function layerConfig(id: LayerId): LayerConfig {
  return LAYER_CONFIGS.find(l => l.id === id)!
}

// ── Area age ─────────────────────────────────────────────────────────────────

// A layer that reads the ward file but paints it by era rather than by
// boundary, so it is switchable on its own. Only the full explorer at /map
// offers it — the small maps have no room for its legend.
export const AREA_AGE_LAYER_ID = 'areaAge'
export const AQI_LAYER_ID = 'aqi'

export type OverlayId = LayerId | typeof AREA_AGE_LAYER_ID | typeof AQI_LAYER_ID

export const AREA_AGE_LAYER = {
  id: AREA_AGE_LAYER_ID,
  label: 'Area Age (Ancient – Present)',
  shortLabel: 'Area age',
} as const

export const AQI_LAYER = {
  id: AQI_LAYER_ID,
  label: 'Air Quality (CPCB AQI Stations)',
  shortLabel: 'Air quality',
} as const

/**
 * The boundary files a set of switched-on layers needs fetched — the area-age
 * layer draws no outlines of its own but still reads a ward file.
 */
export function boundaryFilesFor(enabled: Set<OverlayId>): Set<LayerId> {
  const ids = new Set<LayerId>()
  enabled.forEach(id => {
    if (id !== AREA_AGE_LAYER_ID && id !== AQI_LAYER_ID) ids.add(id as LayerId)
  })
  if (enabled.has(AREA_AGE_LAYER_ID)) ids.add('wards369')
  return ids
}

// ── Feature properties ───────────────────────────────────────────────────────

export interface WardProperties {
  // New 369-ward dataset (wards-369-fixed.geojson)
  ward_name?: string      // e.g. "24 - Agaram"
  ward_name_kn?: string   // Kannada
  ward_id?: string
  Corporation?: string    // Central/East/North/West/South
  corporation_kn?: string
  Assembly?: string       // e.g. "163 - Shanthinagar"
  ac?: string
  ac_no?: string
  // Old LMC ward dataset (LUCKNOW.geojson)
  wardname?: string
  wardcode?: string
  districtname?: string
  ulbname?: string
  // Corporation datasets (lucknow-5-corporations.geojson / corporations.geojson)
  NewCorp?: string
  Corporatio?: string
  Zone?: string
  // Generic / future schemas
  Ward_Name?: string
  WardName?: string
  name?: string
  Name?: string
  ward_no?: number
  Ward_No?: number
  WardNo?: number
  ward_number?: number
  assembly_constituency?: string
  Assembly_Constituency?: string
  corporation?: string
  zone?: string
  [key: string]: unknown
}

export function getProp(props: WardProperties, ...keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = props[k]
    if (v !== undefined && v !== null && v !== '') return v as string | number
  }
  return undefined
}
