import type { NextApiRequest, NextApiResponse } from 'next'
import { getWards369 } from '../../../lib/wards'

// Serves Lucknow's ward boundaries — a locally bundled 2018/pre-2023 file, see
// lib/wards.ts and BUILD-NOTES.md. There is no live upstream to fetch from,
// unlike the Bengaluru build this project started from.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { geojson, source, lastModified, fetchedAt } = await getWards369()
  res.setHeader('X-Data-Source', source)
  if (lastModified) res.setHeader('X-Data-Last-Modified', lastModified)
  res.setHeader('X-Data-Fetched-At', fetchedAt)
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return res.status(200).json(geojson)
}
