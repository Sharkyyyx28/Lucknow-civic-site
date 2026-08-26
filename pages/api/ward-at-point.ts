import type { NextApiRequest, NextApiResponse } from 'next'
import { wardAtPoint } from '../../lib/wardLookup'

// Server-side point-in-ward lookup, so callers (e.g. the profile page's
// "Locate me") don't need to download the ~4MB ward boundary geometry the
// interactive map uses to do this same lookup client-side.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lng } = req.query
  const latitude = parseFloat(lat as string)
  const longitude = parseFloat(lng as string)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'lat and lng query params are required' })
  }

  const hit = await wardAtPoint(latitude, longitude)
  if (!hit) {
    return res.status(404).json({ error: 'Outside the mapped Lucknow ward boundaries' })
  }

  return res.status(200).json({ wardName: hit.wardName, corporation: hit.corporation })
}
