// Shared ward-polygon helpers for modules that bucket point data (amenities,
// postcodes, ...) into ward boundaries — either the ward set from
// lib/wards.ts or the "old wards" overlay the map still offers, which is
// currently an empty placeholder (see public/geojson/LUCKNOW.geojson and
// BUILD-NOTES.md — Lucknow has no known legacy ward scheme equivalent to
// Bengaluru's pre-2025 198-ward set, so this slot has nothing to show yet).

import fs from 'fs'
import path from 'path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import type { Feature as TurfFeature, Point, Polygon, MultiPolygon, Geometry } from 'geojson'
import { getWards369 } from './wards'

// Matches the boundary-overlay ids in lib/mapLayers.ts, so callers can pass
// the layer the user is actually looking at straight through.
export type WardBoundarySet = 'wards369' | 'wards198'

export function isWardBoundarySet(value: unknown): value is WardBoundarySet {
  return value === 'wards369' || value === 'wards198'
}

export interface WardPolygon {
  key: string
  geometry: Polygon | MultiPolygon
  bbox: [number, number, number, number]
}

// Strip the "N - " ward-number prefix and lowercase, matching the convention
// road-lookup.ts uses to key wards by name.
export function wardKey(name: string): string {
  return name.replace(/^\d+\s*-\s*/, '').trim().toLowerCase()
}

// The OpenCity KML sometimes converts a ward's polygon-with-holes/multi-part
// shape into a GeometryCollection of separate Polygons (e.g. Aerocity, Byrathi,
// Bandepalya, Kengeri). Flatten those into a single MultiPolygon so callers
// only ever deal with Polygon | MultiPolygon.
function toPolygonal(geometry: Geometry): Polygon | MultiPolygon | null {
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') return geometry
  if (geometry.type === 'GeometryCollection') {
    const coords = geometry.geometries
      .filter((g): g is Polygon => g.type === 'Polygon')
      .map(g => g.coordinates)
    if (!coords.length) return null
    return { type: 'MultiPolygon', coordinates: coords }
  }
  return null
}

function wardBbox(geometry: Polygon | MultiPolygon): [number, number, number, number] {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  const rings = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const poly of rings) {
    for (const ring of poly) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  return [minLon, minLat, maxLon, maxLat]
}

interface RawFeature {
  properties?: Record<string, unknown> | null
  geometry?: unknown
}

function toWardPolygons(
  features: RawFeature[],
  nameOf: (props: Record<string, unknown>) => unknown
): WardPolygon[] {
  return features
    .map(f => {
      const name = nameOf(f.properties ?? {})
      const geometry = f.geometry ? toPolygonal(f.geometry as Geometry) : null
      if (typeof name !== 'string' || !name || !geometry) return null
      return { key: wardKey(name), geometry, bbox: wardBbox(geometry) }
    })
    .filter((w): w is WardPolygon => w !== null)
}

// Unlike the 369-ward set, the old 198-ward boundaries have no live upstream —
// they're a frozen historical file bundled with the app — so parse the 5MB of
// JSON once per process and keep it.
let wards198Cache: WardPolygon[] | null = null

function getWards198Polygons(): WardPolygon[] {
  if (wards198Cache) return wards198Cache
  const raw = fs.readFileSync(
    path.join(process.cwd(), 'public/geojson/LUCKNOW.geojson'),
    'utf8'
  )
  const fc = JSON.parse(raw) as { features: RawFeature[] }
  wards198Cache = toWardPolygons(fc.features, props => props.wardname)
  return wards198Cache
}

export async function getWardPolygons(set: WardBoundarySet = 'wards369'): Promise<WardPolygon[]> {
  if (set === 'wards198') return getWards198Polygons()
  const { geojson } = await getWards369()
  return toWardPolygons(geojson.features, props => props.ward_name)
}

// Bbox pre-check keeps this cheap for points nowhere near a given ward before
// paying for the exact polygon test.
export function findWardForPoint(lon: number, lat: number, wards: WardPolygon[]): WardPolygon | null {
  const pt = point([lon, lat]) as TurfFeature<Point>
  for (const w of wards) {
    const [minLon, minLat, maxLon, maxLat] = w.bbox
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue
    if (!booleanPointInPolygon(pt, w.geometry as TurfFeature<Polygon | MultiPolygon> | Polygon | MultiPolygon)) continue
    return w
  }
  return null
}
