import type { NextApiRequest, NextApiResponse } from 'next'
import { getPostcodesForWard } from '../../lib/postcodes'

// Live postcodes for a single ward, sourced from OpenStreetMap. See
// lib/postcodes.ts for how addr:postcode points are bucketed into ward
// boundaries. Fetched lazily per-ward (same pattern as ward-amenities.ts)
// rather than folded into the bulk wards-list.ts response, since the
// underlying Overpass query can take tens of seconds on a cold cache.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ward_name } = req.query
  if (!ward_name || typeof ward_name !== 'string') {
    return res.status(400).json({ error: 'ward_name is required' })
  }

  const pincodes = await getPostcodesForWard(ward_name)
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return res.status(200).json({ ward_name, pincodes })
}
