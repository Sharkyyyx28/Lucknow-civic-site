// MySQL-backed store for community posts — a short write-up pinned to a point
// in Lucknow ("this stretch floods every monsoon", "the new park is well
// kept"), readable by anyone browsing the same ward or corporation.
// See database/schema.sql for the `community_posts` table, and
// lib/communityTypes.ts for the shapes shared with the pages.

import { RowDataPacket } from 'mysql2/promise'
import crypto from 'crypto'
import pool from './db'
import { ensureUserId } from './profiles'
import { BODY_MAX, PLACE_LABEL_MAX, TITLE_MAX, type CommunityPost, type PostCategory } from './communityTypes'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

/** Shown when a poster has not set a name on their profile — we never expose the sign-in email. */
const ANONYMOUS_AUTHOR = 'Lucknow resident'

export interface PostFilter {
  /** Restrict to these exact ward names (as stored — i.e. as the boundary set spells them). */
  wardNames?: string[]
  corporations?: string[]
  category?: PostCategory
  /** Sign-in email — restricts the feed to that person's own posts. */
  authorKey?: string
  limit?: number
  offset?: number
}

export interface PostInput {
  title: string
  body: string
  category: PostCategory
  wardName: string
  corporation: string
  placeLabel?: string
  lat: number
  lng: number
}

interface PostRow extends RowDataPacket {
  id: string
  title: string
  body: string
  category: PostCategory
  ward_name: string
  corporation: string
  place_label: string
  lat: number
  lng: number
  author_name: string
  author_email: string
  created_at: Date
  updated_at: Date
}

const SELECT_POST = `
  SELECT p.id, p.title, p.body, p.category, p.ward_name, p.corporation, p.place_label,
         p.lat, p.lng, p.created_at, p.updated_at,
         u.name AS author_name, u.email AS author_email
  FROM community_posts p
  JOIN users u ON u.id = p.user_id
`

function toPost(row: PostRow, viewerKey?: string): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    wardName: row.ward_name,
    corporation: row.corporation,
    placeLabel: row.place_label,
    lat: row.lat,
    lng: row.lng,
    authorName: row.author_name?.trim() || ANONYMOUS_AUTHOR,
    isAuthor: Boolean(viewerKey) && row.author_email === viewerKey,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/** WHERE fragments + bind values for a feed query. An empty filter list matches nothing. */
function buildWhere(filter: PostFilter): { sql: string; values: unknown[] } {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filter.wardNames) {
    if (!filter.wardNames.length) return { sql: 'WHERE 1 = 0', values: [] }
    clauses.push(`p.ward_name IN (${filter.wardNames.map(() => '?').join(', ')})`)
    values.push(...filter.wardNames)
  }
  if (filter.corporations) {
    if (!filter.corporations.length) return { sql: 'WHERE 1 = 0', values: [] }
    clauses.push(`p.corporation IN (${filter.corporations.map(() => '?').join(', ')})`)
    values.push(...filter.corporations)
  }
  if (filter.category) {
    clauses.push('p.category = ?')
    values.push(filter.category)
  }
  if (filter.authorKey) {
    clauses.push('u.email = ?')
    values.push(filter.authorKey)
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values }
}

export async function listPosts(
  filter: PostFilter = {},
  viewerKey?: string
): Promise<{ posts: CommunityPost[]; total: number }> {
  const { sql: where, values } = buildWhere(filter)
  const limit = Math.min(Math.max(filter.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(filter.offset ?? 0, 0)

  const [rows] = await pool.query<PostRow[]>(
    `${SELECT_POST} ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  )
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM community_posts p JOIN users u ON u.id = p.user_id ${where}`,
    values
  )

  return {
    posts: rows.map(row => toPost(row, viewerKey)),
    total: Number(countRows[0]?.total ?? 0),
  }
}

export async function getPost(id: string, viewerKey?: string): Promise<CommunityPost | null> {
  const [rows] = await pool.query<PostRow[]>(`${SELECT_POST} WHERE p.id = ?`, [id])
  return rows[0] ? toPost(rows[0], viewerKey) : null
}

export async function createPost(userKey: string, input: PostInput): Promise<CommunityPost> {
  const userId = await ensureUserId(userKey)
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO community_posts
       (id, user_id, title, body, category, ward_name, corporation, place_label, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      input.title.trim().slice(0, TITLE_MAX),
      input.body.trim().slice(0, BODY_MAX),
      input.category,
      input.wardName,
      input.corporation,
      (input.placeLabel ?? '').trim().slice(0, PLACE_LABEL_MAX),
      input.lat,
      input.lng,
    ]
  )
  return (await getPost(id, userKey))!
}

/**
 * Edits the text of a post. Only the author can change their own post, and the
 * pinned location is fixed once published — a post that moves would silently
 * change which ward's feed it belongs to. Returns null when the post does not
 * exist or belongs to someone else.
 */
export async function updatePost(
  userKey: string,
  id: string,
  changes: { title?: string; body?: string; category?: PostCategory; placeLabel?: string }
): Promise<CommunityPost | null> {
  const existing = await getPost(id, userKey)
  if (!existing || !existing.isAuthor) return null

  const title = (changes.title ?? existing.title).trim().slice(0, TITLE_MAX)
  const body = (changes.body ?? existing.body).trim().slice(0, BODY_MAX)
  const category = changes.category ?? existing.category
  const placeLabel = (changes.placeLabel ?? existing.placeLabel).trim().slice(0, PLACE_LABEL_MAX)

  await pool.query(
    'UPDATE community_posts SET title = ?, body = ?, category = ?, place_label = ? WHERE id = ?',
    [title, body, category, placeLabel, id]
  )
  return getPost(id, userKey)
}

/** Deletes the viewer's own post. False when it does not exist or is someone else's. */
export async function deletePost(userKey: string, id: string): Promise<boolean> {
  const existing = await getPost(id, userKey)
  if (!existing || !existing.isAuthor) return false
  await pool.query('DELETE FROM community_posts WHERE id = ?', [id])
  return true
}
