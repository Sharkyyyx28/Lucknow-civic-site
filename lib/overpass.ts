// Shared Overpass API client for lib/amenities.ts and lib/postcodes.ts.
//
// The main public instance (overpass-api.de) frequently returns 504 "server
// too busy" under load. Falling back to other independently-run public
// mirrors before giving up meaningfully improves success rate without
// needing to self-host an Overpass instance.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// A busy/504ing mirror usually answers within a few seconds; a genuinely
// unreachable one (like overpass.kumi.systems hanging with no response at
// all) shouldn't be allowed to eat the whole budget before the next mirror
// gets a turn. 35s is under the query's own server-side [timeout:60] but
// generous for a mirror that's actually working.
export async function queryOverpass(query: string, timeoutMs = 35000): Promise<OverpassElement[]> {
  let lastErr: unknown
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        // Overpass's Apache front-end 406s requests with no Accept header, which
        // Node's fetch omits by default.
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
          'User-Agent': 'lucknow-neubitat-explorer',
        },
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`)
      const data = (await res.json()) as { elements: OverpassElement[] }
      return data.elements
    } catch (err) {
      lastErr = err
      console.error(`[overpass] ${endpoint} failed:`, (err as Error)?.message ?? err)
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Overpass endpoints failed')
}
