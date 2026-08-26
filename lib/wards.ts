// Ward boundary data for Lucknow.
//
// Bengaluru's build (lib/opencity.ts) fetched a live, current 369-ward
// delimitation from OpenCity's CKAN portal (data.opencity.in), because
// Bengaluru's wards were re-delimited in 2025 and OpenCity kept the dataset
// current. Lucknow has no equivalent open-data portal publishing ward
// boundaries, so there is nothing to fetch live — this module only serves a
// locally bundled file.
//
// public/geojson/lucknow-wards.geojson is DataMeet's Lucknow_ward_boundary.geojson
// (Municipal_Spatial_Data repo, CC BY 4.0 — the same source as the outer
// corporation boundary in gba-boundary.geojson), with properties normalized to
// ward_name/ward_id/zone. It's real, surveyed geometry — 112 wards — but its
// last upstream commit is from 2018, i.e. the PRE-2023 delimitation. LMC's
// current scheme (post the 2023 delimitation) has 110 wards, with some renamed,
// merged, or newly created (see BUILD-NOTES.md). No open GIS source for the
// current scheme was found — OpenCity's CKAN portal has no Lucknow dataset, and
// OpenStreetMap has zero ward-level (admin_level 9/10) boundaries for Lucknow.
// Treat ward names/counts here as "roughly current, not exact" — same spirit as
// the `indicative: true` flag on the metro station coordinates.

import fs from 'fs'
import path from 'path'

export interface WardFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: unknown
  }>
}

export interface WardsResult {
  geojson: WardFeatureCollection
  source: 'local-fallback'
  lastModified: string | null
  fetchedAt: string
}

let cached: WardsResult | null = null

function loadLocal(): WardsResult {
  const raw = fs.readFileSync(
    path.join(process.cwd(), 'public/geojson/lucknow-wards.geojson'),
    'utf8'
  )
  return {
    geojson: JSON.parse(raw) as WardFeatureCollection,
    source: 'local-fallback',
    lastModified: null,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Kept as `getWards369()` (rather than renamed) purely so every existing
 * caller — lib/wardGeometry.ts, lib/wardLookup.ts, the ward-list/ward-details/
 * corporation-stats API routes — needed only an import-path change, not a
 * call-site rewrite. The name no longer means "369 wards"; it just means "the
 * ward dataset".
 */
export async function getWards369(): Promise<WardsResult> {
  if (!cached) cached = loadLocal()
  return cached
}
