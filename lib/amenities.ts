// Live civic amenities (hospitals, parks, schools, police/fire) per ward,
// sourced from OpenStreetMap and bucketed into whichever ward boundary set the
// caller asks for — the live GBA 369-ward boundaries from lib/opencity.ts, or
// the old LMC 198-ward boundaries the map still offers as an overlay.
//
// Points are read from the osm_amenities MySQL table (kept warm by
// scripts/refresh-osm.ts) rather than the public Overpass API directly, since
// that API's free instances are shared infra that regularly 504 under load.
// A live Overpass fetch only happens as a one-time fallback when the table is
// empty (e.g. a fresh clone before the first refresh has run). Ward
// assignment is a point-in-polygon test done server-side so we don't need
// per-ward queries (which would be 369x slower and more fragile).

import { RowDataPacket } from 'mysql2/promise'
import pool from './db'
import { getWardPolygons, findWardForPoint, wardKey, type WardBoundarySet } from './wardGeometry'
import { queryOverpass } from './overpass'

// Bounding box loosely covering Lucknow Municipal Corporation and surrounds
const BBOX = '26.70,80.75,27.00,81.15'

export type AmenityCategory = 'hospitals' | 'parks' | 'schools' | 'safety'

const CATEGORY_TAGS: Record<AmenityCategory, Array<[string, string]>> = {
  hospitals: [['amenity', 'hospital'], ['amenity', 'clinic']],
  parks: [['leisure', 'park'], ['leisure', 'playground']],
  schools: [['amenity', 'school'], ['amenity', 'college'], ['amenity', 'university']],
  safety: [['amenity', 'police'], ['amenity', 'fire_station']],
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface AmenityPoint {
  id: number
  name: string
  category: AmenityCategory
  lat: number
  lon: number
}

// Carries the OSM element type alongside an AmenityPoint — only needed while
// writing to osm_amenities, where (osm_type, osm_id) is the primary key.
type AmenityPointWithType = AmenityPoint & { osmType: 'node' | 'way' }

export interface WardAmenities {
  counts: Record<AmenityCategory, number>
  items: Record<AmenityCategory, AmenityPoint[]>
}

function buildQuery(): string {
  const clauses = Object.values(CATEGORY_TAGS)
    .flat()
    .flatMap(([k, v]) => [
      `node["${k}"="${v}"](${BBOX});`,
      `way["${k}"="${v}"](${BBOX});`,
    ])
    .join('\n  ')
  return `[out:json][timeout:60];\n(\n  ${clauses}\n);\nout center tags;`
}

function classify(tags: Record<string, string>): AmenityCategory | null {
  for (const [category, pairs] of Object.entries(CATEGORY_TAGS) as Array<[AmenityCategory, Array<[string, string]>]>) {
    if (pairs.some(([k, v]) => tags[k] === v)) return category
  }
  return null
}

async function fetchOverpassAmenities(): Promise<AmenityPointWithType[]> {
  const elements = await queryOverpass(buildQuery())

  const points: AmenityPointWithType[] = []
  for (const el of elements) {
    if (!el.tags) continue
    const category = classify(el.tags)
    if (!category) continue
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined) continue
    if (el.type !== 'node' && el.type !== 'way') continue
    points.push({ id: el.id, osmType: el.type, name: el.tags.name ?? 'Unnamed', category, lat, lon })
  }
  return points
}

interface AmenityRow extends RowDataPacket {
  id: number
  category: AmenityCategory
  name: string
  lat: number
  lon: number
}

async function loadAmenitiesFromDb(): Promise<AmenityPoint[]> {
  const [rows] = await pool.query<AmenityRow[]>(
    'SELECT osm_id AS id, category, name, lat, lon FROM osm_amenities'
  )
  return rows.map(r => ({ id: r.id, category: r.category, name: r.name, lat: r.lat, lon: r.lon }))
}

// Full replace (not diff/merge) inside a transaction: OSM ids that no longer
// match a category (demolished/retagged) should disappear, and a mid-refresh
// failure should leave the previous data intact rather than a half-written
// table.
async function saveAmenitiesToDb(points: AmenityPointWithType[]): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM osm_amenities')
    const CHUNK = 500
    for (let i = 0; i < points.length; i += CHUNK) {
      const chunk = points.slice(i, i + CHUNK)
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
      const values = chunk.flatMap(p => [p.osmType, p.id, p.category, p.name, p.lat, p.lon])
      await conn.query(
        `INSERT INTO osm_amenities (osm_type, osm_id, category, name, lat, lon) VALUES ${placeholders}`,
        values
      )
    }
    await conn.query('INSERT INTO osm_refresh_log (dataset, row_count) VALUES (?, ?)', ['amenities', points.length])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// Used by scripts/refresh-osm.ts to warm the cache on a schedule.
export async function refreshAmenitiesFromOverpass(): Promise<number> {
  const points = await fetchOverpassAmenities()
  // A near-empty result (bad query, a mirror serving a truncated response)
  // would otherwise silently wipe out good existing data via the full
  // DELETE+replace below — treat it as a failure instead, same as the KML
  // truncation guard in lib/opencity.ts.
  if (points.length < 500) {
    throw new Error(`Overpass amenities fetch returned only ${points.length} points — refusing to replace existing data`)
  }
  await saveAmenitiesToDb(points)
  return points.length
}

// osm_amenities is normally kept warm by the scheduled refresh job. An empty
// table (fresh clone, refresh never run) falls back to a one-time live
// Overpass fetch and opportunistically warms the table for next time.
async function getAmenityPoints(): Promise<AmenityPoint[]> {
  const stored = await loadAmenitiesFromDb()
  if (stored.length > 0) return stored

  console.error('[amenities] osm_amenities is empty — falling back to a live Overpass fetch (run `npm run refresh:osm` to warm the cache)')
  const live = await fetchOverpassAmenities()
  saveAmenitiesToDb(live).catch(err => console.error('[amenities] failed to warm db cache after live fallback:', err))
  return live
}

function emptyWardAmenities(): WardAmenities {
  return {
    counts: { hospitals: 0, parks: 0, schools: 0, safety: 0 },
    items: { hospitals: [], parks: [], schools: [], safety: [] },
  }
}

async function computeWardAmenities(set: WardBoundarySet): Promise<Map<string, WardAmenities>> {
  const [wards, amenityPoints] = await Promise.all([
    getWardPolygons(set),
    getAmenityPoints(),
  ])

  const result = new Map<string, WardAmenities>()
  for (const w of wards) result.set(w.key, emptyWardAmenities())

  for (const amenity of amenityPoints) {
    const ward = findWardForPoint(amenity.lon, amenity.lat, wards)
    if (!ward) continue
    const wa = result.get(ward.key)!
    wa.counts[amenity.category]++
    wa.items[amenity.category].push(amenity)
  }

  return result
}

// Cached per boundary set: the same amenity points bucket differently into the
// 369-ward and 198-ward polygons, and a ward name is only meaningful within the
// set it came from.
type AmenitiesResult = { map: Map<string, WardAmenities>; ok: boolean }

const cached = new Map<WardBoundarySet, { map: Map<string, WardAmenities>; atMs: number }>()
const inflight = new Map<WardBoundarySet, Promise<AmenitiesResult>>()

async function getAllWardAmenities(set: WardBoundarySet): Promise<AmenitiesResult> {
  const hit = cached.get(set)
  if (hit && Date.now() - hit.atMs < CACHE_TTL_MS) return { map: hit.map, ok: true }

  let pending = inflight.get(set)
  if (!pending) {
    pending = computeWardAmenities(set)
      .then(result => {
        cached.set(set, { map: result, atMs: Date.now() })
        return { map: result, ok: true }
      })
      .catch(err => {
        console.error(`[amenities] computing ward amenities for ${set} failed:`, err?.message ?? err)
        // Reusing a previously-successful (if stale) cache is still real data.
        // Only a bare failure with nothing to fall back on should be treated
        // as "not ok" so callers don't cache the all-zero placeholder.
        const stale = cached.get(set)
        if (stale) return { map: stale.map, ok: true }
        return { map: new Map<string, WardAmenities>(), ok: false }
      })
      .finally(() => {
        inflight.delete(set)
      })
    inflight.set(set, pending)
  }
  return pending
}

export async function getAmenitiesForWard(
  wardName: string,
  set: WardBoundarySet = 'wards369'
): Promise<WardAmenities & { ok: boolean }> {
  const { map, ok } = await getAllWardAmenities(set)
  const key = wardKey(wardName)
  const data = map.get(key)
  if (!data) {
    // A name that isn't in the requested boundary set at all: returning zeros
    // would be indistinguishable from a genuinely amenity-free ward, so report
    // it as not-ok and let the caller show "unavailable" instead.
    if (ok) console.error(`[amenities] no ward named "${wardName}" in the ${set} boundary set`)
    return { ...emptyWardAmenities(), ok: false }
  }
  return { ...data, ok }
}
