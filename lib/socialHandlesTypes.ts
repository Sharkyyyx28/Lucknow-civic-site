// Shapes, category metadata and filtering for the social handles directory —
// kept free of any `mysql2`/db import so both the public page and the admin
// pages (client bundles) can use them. DB access lives in lib/socialHandles.ts,
// same split as officialsTypes.ts / lib/officials.ts.

export type HandleCategory = 'official' | 'ngo' | 'individual' | 'media'

export const HANDLE_CATEGORIES: HandleCategory[] = ['official', 'ngo', 'individual', 'media']

export const HANDLE_CATEGORY_LABELS: Record<HandleCategory, string> = {
  official: 'Government & civic bodies',
  ngo: 'NGOs & civic groups',
  individual: 'Civic voices',
  media: 'Civic media',
}

export function isHandleCategory(value: unknown): value is HandleCategory {
  return typeof value === 'string' && (HANDLE_CATEGORIES as readonly string[]).includes(value)
}

// Shared by the admin form and the API route, so neither can drift from the
// column widths in database/schema.sql.
export const NAME_MAX = 255
export const ROLE_MAX = 255
export const FOCUS_MAX = 1000
export const HANDLE_MAX = 100
export const WEBSITE_MAX = 500

// Result of probing whether a handle/URL actually resolves — see
// lib/socialHandleCheck.ts for how each value is decided. 'unchecked' also
// covers a blank field, since there's nothing to probe.
export type HandleCheckStatus = 'unchecked' | 'ok' | 'not_found' | 'unknown'

export function isHandleCheckStatus(value: unknown): value is HandleCheckStatus {
  return value === 'unchecked' || value === 'ok' || value === 'not_found' || value === 'unknown'
}

export interface SocialHandle {
  id: string
  name: string
  category: HandleCategory
  /** Title or one-line identity — designation for individuals, blank for orgs. */
  role: string
  /** What they actually work on, said plainly. */
  focus: string
  x: string
  xStatus: HandleCheckStatus
  instagram: string
  instagramStatus: HandleCheckStatus
  website: string
  websiteStatus: HandleCheckStatus
  /** When x/instagram/website were last probed, ISO — null if never checked. */
  checkedAt: string | null
  updatedAt: string
}

export function xUrl(handle: string): string {
  return `https://x.com/${handle}`
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle}`
}

export interface SocialHandleQuery {
  q?: string
  category?: string
}

export function filterSocialHandles(
  handles: SocialHandle[],
  { q, category }: SocialHandleQuery
): SocialHandle[] {
  const tokens = (q ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  return handles.filter(handle => {
    if (category && handle.category !== category) return false
    if (!tokens.length) return true

    const haystack = [handle.name, handle.role, handle.focus, handle.x, handle.instagram]
      .join(' ')
      .toLowerCase()

    return tokens.every(token => haystack.includes(token))
  })
}
