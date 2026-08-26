// Best-effort existence check for a social handle's X/Instagram/website
// links — run on demand from /admin/social-handles ("Check" / "Check all")
// and automatically whenever a handle is created or updated (see
// pages/api/social-handles/index.ts and [id].ts). Results are persisted via
// lib/socialHandles.ts's recordHandleCheck().
//
// This is a signal, not a guarantee. X and Instagram serve their SPA shell
// to logged-out requests for most routes regardless of whether the handle
// exists, so a 2xx there just means "the platform answered", not "this
// account is real" — hence 'ok' is a soft read for those two. A plain
// website is a much stronger signal: 'ok' there really does mean the URL
// resolved. Only an unambiguous 404 (either platform) counts as
// 'not_found'; anything else uncertain (timeout, 403/429 challenge, 5xx)
// comes back as 'unknown' rather than guessing.

import { instagramUrl, xUrl, type HandleCheckStatus } from './socialHandlesTypes'

const TIMEOUT_MS = 8000
const USER_AGENT = 'lucknow-neubitat-explorer (social handle checker)'

async function probe(url: string): Promise<HandleCheckStatus> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
    })
    if (res.status === 404) return 'not_found'
    return res.ok ? 'ok' : 'unknown'
  } catch {
    return 'unknown'
  } finally {
    clearTimeout(timer)
  }
}

export interface HandleCheckInput {
  x: string
  instagram: string
  website: string
}

export interface HandleCheckOutput {
  x?: HandleCheckStatus
  instagram?: HandleCheckStatus
  website?: HandleCheckStatus
}

/** Only probes whichever of x/instagram/website are non-blank. */
export async function checkSocialHandle(handle: HandleCheckInput): Promise<HandleCheckOutput> {
  const [x, instagram, website] = await Promise.all([
    handle.x ? probe(xUrl(handle.x)) : Promise.resolve(undefined),
    handle.instagram ? probe(instagramUrl(handle.instagram)) : Promise.resolve(undefined),
    handle.website ? probe(handle.website) : Promise.resolve(undefined),
  ])
  const result: HandleCheckOutput = {}
  if (x !== undefined) result.x = x
  if (instagram !== undefined) result.instagram = instagram
  if (website !== undefined) result.website = website
  return result
}

/** Runs `fn` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
