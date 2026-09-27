// Shapes and constants for community posts, kept free of any database import
// so both the pages (client bundle) and lib/community.ts (server) can use
// them. Anything that touches MySQL belongs in lib/community.ts instead.

export const POST_CATEGORIES = ['issue', 'praise', 'update', 'question'] as const
export type PostCategory = (typeof POST_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  issue: 'Needs attention',
  praise: 'Something good',
  update: 'Update',
  question: 'Question',
}

/** Emoji + card accent per category, so a feed scans at a glance. */
export const CATEGORY_STYLES: Record<PostCategory, { icon: string; chip: string }> = {
  issue: { icon: '🛠️', chip: 'border-amber-300 bg-amber-50 text-amber-800' },
  praise: { icon: '🌳', chip: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  update: { icon: '📣', chip: 'border-sky-300 bg-sky-50 text-sky-800' },
  question: { icon: '❓', chip: 'border-neutral-300 bg-neutral-50 text-neutral-700' },
}

export const POST_STATUSES = ['reported', 'in_progress', 'resolved'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

export const STATUS_LABELS: Record<PostStatus, string> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const STATUS_STYLES: Record<PostStatus, { chip: string; dot: string }> = {
  reported: { chip: 'border-rose-300 bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
  in_progress: { chip: 'border-amber-300 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  resolved: { chip: 'border-emerald-300 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
}

export const TITLE_MAX = 200
export const BODY_MAX = 8000
export const PLACE_LABEL_MAX = 120

export interface CommunityPost {
  id: string
  title: string
  body: string
  category: PostCategory
  status: PostStatus
  wardName: string
  corporation: string
  /** Free text from the poster, e.g. "opposite the 5th cross bus stop". */
  placeLabel: string
  upvotes: number
  lat: number
  lng: number
  authorName: string
  /** True when the viewer wrote this post — drives the edit/delete controls. */
  isAuthor: boolean
  createdAt: string
  updatedAt: string
}

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === 'string' && (POST_CATEGORIES as readonly string[]).includes(value)
}

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === 'string' && (POST_STATUSES as readonly string[]).includes(value)
}

/** Ward names are stored with their number prefix ("123 - Domlur"); drop it for display. */
export function wardDisplayName(wardName: string): string {
  return wardName.replace(/^\d+\s*-\s*/, '').trim()
}
