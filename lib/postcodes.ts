// Live per-ward postcodes, sourced from OpenStreetMap and bucketed into the
// live GBA 369-ward boundaries. Supplements — doesn't replace — the static
// old-198-ward-scheme CSV in pages/api/wards-list.ts: OSM's addr:postcode
// tagging is itself incomplete, so that route unions both sources.
//
// Points are read from the osm_postcode_points MySQL table (kept warm by
// scripts/refresh-osm.ts) rather than the public Overpass API directly — see
// lib/amenities.ts for why. A live Overpass fetch only happens as a one-time
// fallback when the table is empty.

import { RowDataPacket } from 'mysql2/promise'
import pool from './db'
import { getWardPolygons, findWardForPoint, wardKey, type WardBoundarySet } from './wardGeometry'
import { queryOverpass } from './overpass'

// Bounding box loosely covering Lucknow Municipal Corporation and surrounds
const BBOX = '26.70,80.75,27.00,81.15'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface PostcodePoint {
  id: number
  lat: number
  lon: number
  postcode: string
}

// OSM's addr:postcode tagging is free text, entered by many contributors, and
// carries stray formatting ("560 001", "- 560095") and outright typos
// ("560001ph", 7-digit values) — reject anything that isn't a plausible
// 6-digit Indian PIN after stripping non-digits.
export function normalizePincode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return /^\d{6}$/.test(digits) ? digits : null
}

// Nodes only — adding a `way["addr:postcode"]` clause (building footprints,
// far more numerous than standalone address nodes) reliably 504s the public
// Overpass instance ("server too busy") for a bbox this size. Node-tagged
// addresses alone are still several thousand points across the city.
function buildQuery(): string {
  return `[out:json][timeout:60];\nnode["addr:postcode"](${BBOX});\nout center tags;`
}

async function fetchOverpassPostcodes(): Promise<PostcodePoint[]> {
  const elements = await queryOverpass(buildQuery())

  const points: PostcodePoint[] = []
  for (const el of elements) {
    const raw = el.tags?.['addr:postcode']
    const postcode = raw ? normalizePincode(raw) : null
    if (!postcode) continue
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined) continue
    points.push({ id: el.id, lat, lon, postcode })
  }
  return points
}

interface PostcodeRow extends RowDataPacket {
  id: number
  postcode: string
  lat: number
  lon: number
}

async function loadPostcodePointsFromDb(): Promise<PostcodePoint[]> {
  const [rows] = await pool.query<PostcodeRow[]>(
    'SELECT osm_id AS id, postcode, lat, lon FROM osm_postcode_points'
  )
  return rows.map(r => ({ id: r.id, postcode: r.postcode, lat: r.lat, lon: r.lon }))
}

// Full replace inside a transaction — see saveAmenitiesToDb in
// lib/amenities.ts for why. buildQuery() only requests nodes (way queries
// 504 the public API for this bbox), so osm_type is always 'node' here.
async function savePostcodePointsToDb(points: PostcodePoint[]): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM osm_postcode_points')
    const CHUNK = 500
    for (let i = 0; i < points.length; i += CHUNK) {
      const chunk = points.slice(i, i + CHUNK)
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ')
      const values = chunk.flatMap(p => ['node', p.id, p.postcode, p.lat, p.lon])
      await conn.query(
        `INSERT INTO osm_postcode_points (osm_type, osm_id, postcode, lat, lon) VALUES ${placeholders}`,
        values
      )
    }
    await conn.query('INSERT INTO osm_refresh_log (dataset, row_count) VALUES (?, ?)', ['postcodes', points.length])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// Used by scripts/refresh-osm.ts to warm the cache on a schedule.
export async function refreshPostcodesFromOverpass(): Promise<number> {
  const points = await fetchOverpassPostcodes()
  // See the matching guard in lib/amenities.ts's refreshAmenitiesFromOverpass
  // — a near-empty result shouldn't wipe out good existing data.
  if (points.length < 500) {
    throw new Error(`Overpass postcodes fetch returned only ${points.length} points — refusing to replace existing data`)
  }
  await savePostcodePointsToDb(points)
  return points.length
}

// osm_postcode_points is normally kept warm by the scheduled refresh job. An
// empty table (fresh clone, refresh never run) falls back to a one-time live
// Overpass fetch and opportunistically warms the table for next time.
async function getPostcodePoints(): Promise<PostcodePoint[]> {
  const stored = await loadPostcodePointsFromDb()
  if (stored.length > 0) return stored

  console.error('[postcodes] osm_postcode_points is empty — falling back to a live Overpass fetch (run `npm run refresh:osm` to warm the cache)')
  const live = await fetchOverpassPostcodes()
  savePostcodePointsToDb(live).catch(err => console.error('[postcodes] failed to warm db cache after live fallback:', err))
  return live
}

async function computeWardPostcodes(set: WardBoundarySet): Promise<Map<string, Set<string>>> {
  const [wards, postcodePoints] = await Promise.all([
    getWardPolygons(set),
    getPostcodePoints(),
  ])

  const result = new Map<string, Set<string>>()
  for (const w of wards) result.set(w.key, new Set())

  for (const p of postcodePoints) {
    const ward = findWardForPoint(p.lon, p.lat, wards)
    if (!ward) continue
    result.get(ward.key)!.add(p.postcode)
  }

  return result
}

// Cached per boundary set, the same way lib/amenities.ts caches its buckets:
// the same points fall into different wards under the 369- and 198-ward
// polygons, and a ward name only means something within its own set.
const cached = new Map<WardBoundarySet, { map: Map<string, Set<string>>; atMs: number }>()
const inflight = new Map<WardBoundarySet, Promise<Map<string, Set<string>>>>()

async function getAllWardPostcodes(set: WardBoundarySet): Promise<Map<string, Set<string>>> {
  const hit = cached.get(set)
  if (hit && Date.now() - hit.atMs < CACHE_TTL_MS) return hit.map

  let pending = inflight.get(set)
  if (!pending) {
    pending = computeWardPostcodes(set)
      .then(result => {
        cached.set(set, { map: result, atMs: Date.now() })
        return result
      })
      .catch(err => {
        console.error(`[postcodes] computing ward postcodes for ${set} failed:`, err?.message ?? err)
        // Reusing a previously-successful (if stale) cache is still real data;
        // a bare failure with nothing to fall back on just yields no live
        // postcodes, leaving the static CSV to answer on its own.
        return cached.get(set)?.map ?? new Map<string, Set<string>>()
      })
      .finally(() => {
        inflight.delete(set)
      })
    inflight.set(set, pending)
  }
  return pending
}

export async function getPostcodesForWard(
  wardName: string,
  set: WardBoundarySet = 'wards369'
): Promise<string[]> {
  const map = await getAllWardPostcodes(set)
  return [...(map.get(wardKey(wardName)) ?? [])]
}
