// MySQL-backed store for the social handles directory — X/Instagram/website
// entries for NGOs, civic voices, media and government accounts working on
// Lucknow's civic issues. See database/schema.sql for the `social_handles`
// table, and lib/socialHandlesTypes.ts for the shapes shared with the pages.
// Managed entirely through /admin/social-handles (lib/admin.ts gates who can
// write) — there is no live upstream to fall back to, unlike lib/officials.ts.

import { RowDataPacket } from 'mysql2/promise'
import crypto from 'crypto'
import pool from './db'
import {
  FOCUS_MAX,
  HANDLE_MAX,
  NAME_MAX,
  ROLE_MAX,
  WEBSITE_MAX,
  type HandleCategory,
  type HandleCheckStatus,
  type SocialHandle,
} from './socialHandlesTypes'

interface HandleRow extends RowDataPacket {
  id: string
  name: string
  category: HandleCategory
  role: string
  focus: string
  x_handle: string
  x_status: HandleCheckStatus
  instagram_handle: string
  instagram_status: HandleCheckStatus
  website: string
  website_status: HandleCheckStatus
  checked_at: Date | null
  updated_at: Date
}

const SELECT_HANDLE = `
  SELECT id, name, category, role, focus,
         x_handle, x_status, instagram_handle, instagram_status, website, website_status,
         checked_at, updated_at
  FROM social_handles
`

function toHandle(row: HandleRow): SocialHandle {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    role: row.role,
    focus: row.focus,
    x: row.x_handle,
    xStatus: row.x_status,
    instagram: row.instagram_handle,
    instagramStatus: row.instagram_status,
    website: row.website,
    websiteStatus: row.website_status,
    checkedAt: row.checked_at ? row.checked_at.toISOString() : null,
    updatedAt: row.updated_at.toISOString(),
  }
}

export interface SocialHandleInput {
  name: string
  category: HandleCategory
  role?: string
  focus: string
  x?: string
  instagram?: string
  website?: string
}

/** Strips a leading '@' (people paste handles either way) and enforces the column width. */
function cleanHandle(value: string | undefined): string {
  return (value ?? '').trim().replace(/^@/, '').slice(0, HANDLE_MAX)
}

export async function listSocialHandles(category?: HandleCategory): Promise<SocialHandle[]> {
  const where = category ? 'WHERE category = ?' : ''
  const [rows] = await pool.query<HandleRow[]>(
    `${SELECT_HANDLE} ${where} ORDER BY category, name`,
    category ? [category] : []
  )
  return rows.map(toHandle)
}

export async function getSocialHandle(id: string): Promise<SocialHandle | null> {
  const [rows] = await pool.query<HandleRow[]>(`${SELECT_HANDLE} WHERE id = ?`, [id])
  return rows[0] ? toHandle(rows[0]) : null
}

export async function createSocialHandle(
  input: SocialHandleInput,
  createdBy: string
): Promise<SocialHandle> {
  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO social_handles
       (id, name, category, role, focus, x_handle, instagram_handle, website, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim().slice(0, NAME_MAX),
      input.category,
      (input.role ?? '').trim().slice(0, ROLE_MAX),
      input.focus.trim().slice(0, FOCUS_MAX),
      cleanHandle(input.x),
      cleanHandle(input.instagram),
      (input.website ?? '').trim().slice(0, WEBSITE_MAX),
      createdBy,
      createdBy,
    ]
  )
  return (await getSocialHandle(id))!
}

export async function updateSocialHandle(
  id: string,
  changes: Partial<SocialHandleInput>,
  updatedBy: string
): Promise<SocialHandle | null> {
  const existing = await getSocialHandle(id)
  if (!existing) return null

  const name = (changes.name ?? existing.name).trim().slice(0, NAME_MAX)
  const category = changes.category ?? existing.category
  const role = (changes.role ?? existing.role).trim().slice(0, ROLE_MAX)
  const focus = (changes.focus ?? existing.focus).trim().slice(0, FOCUS_MAX)
  const x = changes.x !== undefined ? cleanHandle(changes.x) : existing.x
  const instagram = changes.instagram !== undefined ? cleanHandle(changes.instagram) : existing.instagram
  const website = (changes.website !== undefined ? changes.website : existing.website)
    .trim()
    .slice(0, WEBSITE_MAX)

  // A changed handle/URL invalidates whatever the old check found, so reset
  // that field's status rather than carry a stale 'ok'/'not_found' forward.
  // The caller (pages/api/social-handles/[id].ts) re-checks right after, but
  // this keeps the row honest even if that check is skipped or fails.
  const xStatus = x !== existing.x ? 'unchecked' : existing.xStatus
  const instagramStatus = instagram !== existing.instagram ? 'unchecked' : existing.instagramStatus
  const websiteStatus = website !== existing.website ? 'unchecked' : existing.websiteStatus

  await pool.query(
    `UPDATE social_handles
     SET name = ?, category = ?, role = ?, focus = ?,
         x_handle = ?, x_status = ?, instagram_handle = ?, instagram_status = ?, website = ?, website_status = ?,
         updated_by = ?
     WHERE id = ?`,
    [name, category, role, focus, x, xStatus, instagram, instagramStatus, website, websiteStatus, updatedBy, id]
  )
  return getSocialHandle(id)
}

export interface HandleCheckResult {
  x?: HandleCheckStatus
  instagram?: HandleCheckStatus
  website?: HandleCheckStatus
}

/** Persists the outcome of lib/socialHandleCheck.ts's probe for one handle. */
export async function recordHandleCheck(id: string, result: HandleCheckResult): Promise<SocialHandle | null> {
  const sets: string[] = []
  const params: unknown[] = []
  if (result.x !== undefined) {
    sets.push('x_status = ?')
    params.push(result.x)
  }
  if (result.instagram !== undefined) {
    sets.push('instagram_status = ?')
    params.push(result.instagram)
  }
  if (result.website !== undefined) {
    sets.push('website_status = ?')
    params.push(result.website)
  }
  if (!sets.length) return getSocialHandle(id)

  sets.push('checked_at = CURRENT_TIMESTAMP')
  params.push(id)
  await pool.query(`UPDATE social_handles SET ${sets.join(', ')} WHERE id = ?`, params)
  return getSocialHandle(id)
}

export async function deleteSocialHandle(id: string): Promise<boolean> {
  const existing = await getSocialHandle(id)
  if (!existing) return false
  await pool.query('DELETE FROM social_handles WHERE id = ?', [id])
  return true
}
