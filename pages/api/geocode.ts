import type { NextApiRequest, NextApiResponse } from 'next'

export interface GeocodeResult {
  placeId: string
  name: string
  label: string
  lat: number
  lng: number
  type: string
}

// In-memory cache for recent queries to stay well under Nominatim usage limits
const cache = new Map<string, { results: GeocodeResult[]; expires: number }>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!q || q.length < 2) {
    return res.status(200).json({ results: [] })
  }

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return res.status(200).json({ results: cached.results })
  }

  try {
    // Restrict bounding box strictly to greater Lucknow region
    // bbox: minLng, maxLat, maxLng, minLat (viewbox=left,top,right,bottom)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q + ', Lucknow'
    )}&format=json&viewbox=80.75,27.00,81.15,26.70&bounded=1&limit=6&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LucknowCivicData/1.0 (https://lucknow-civic.in)',
      },
    })

    if (!response.ok) {
      return res.status(200).json({ results: [] })
    }

    const data: any[] = await response.json()
    const results: GeocodeResult[] = (data || [])
      .map(item => {
        const addr = item.address || {}
        const primary =
          item.name ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.road ||
          item.display_name.split(',')[0]
        const secondary = [
          addr.suburb !== primary ? addr.suburb : null,
          addr.city || addr.town || 'Lucknow',
          addr.postcode,
        ]
          .filter(Boolean)
          .join(', ')

        return {
          placeId: String(item.place_id),
          name: primary,
          label: secondary ? `${primary}, ${secondary}` : primary,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type || 'place',
        }
      })
      .filter(item => !isNaN(item.lat) && !isNaN(item.lng))

    cache.set(cacheKey, { results, expires: Date.now() + 1000 * 60 * 30 }) // 30 min cache
    return res.status(200).json({ results })
  } catch (err) {
    console.error('api/geocode error:', err)
    return res.status(200).json({ results: [] })
  }
}
