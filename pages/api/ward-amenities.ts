import type { NextApiRequest, NextApiResponse } from 'next'
import { getAmenitiesForWard } from '../../lib/amenities'
import { isWardBoundarySet } from '../../lib/wardGeometry'

// Live civic amenities (hospitals, parks, schools, police/fire stations) for a
// ward, sourced from OpenStreetMap. See lib/amenities.ts for how points are
// bucketed into ward boundaries.
//
// `boundary` selects which ward set the name belongs to — the current 369-ward
// delimitation (default) or the old 198-ward one. Ward names are only unique
// within a set and the two sets have different geometry, so counting against
// the wrong one gives wrong or empty answers.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ward_name, boundary } = req.query
  if (!ward_name || typeof ward_name !== 'string') {
    return res.status(400).json({ error: 'ward_name is required' })
  }
  const set = boundary === undefined ? 'wards369' : boundary
  if (!isWardBoundarySet(set)) {
    return res.status(400).json({ error: 'boundary must be wards369 or wards198' })
  }

  const { ok, ...data } = await getAmenitiesForWard(ward_name, set)
  if (ok) {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  } else {
    // Either Overpass failed with no prior cache to fall back on, or the ward
    // isn't in this boundary set — these are placeholder zero counts, not real
    // data. Don't let clients/CDNs cache them.
    res.setHeader('Cache-Control', 'no-store')
  }
  return res.status(200).json({ ward_name, boundary: set, ...data, ok })
}
