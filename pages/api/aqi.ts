import type { NextApiRequest, NextApiResponse } from 'next'
import { getLucknowAqiData } from '../../lib/aqi'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const data = getLucknowAqiData()
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  return res.status(200).json(data)
}
