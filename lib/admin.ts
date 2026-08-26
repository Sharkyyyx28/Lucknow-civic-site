// Who can manage admin-only content (currently: the social handles
// directory). Two tiers, deliberately:
//
// - ADMIN_EMAILS (env var, comma-separated) — permanent, can't be revoked
//   through the app. Bootstraps the system: someone has to be an admin
//   before the "add other admins" UI has anyone able to use it, and an env
//   var can't be locked out by an accidental DELETE the way a database row
//   can.
// - The `admins` table — anyone an env-admin (or another DB-admin) has added
//   via /admin/admins. Removable through the UI.
//
// isAdmin() checks both. See database/schema.sql for the `admins` table.

import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { RowDataPacket } from 'mysql2/promise'
import pool from './db'
import { authOptions } from '../pages/api/auth/[...nextauth]'

function envAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

interface AdminRow extends RowDataPacket {
  email: string
  added_by: string
  created_at: Date
}

export async function isAdmin(email: string): Promise<boolean> {
  const key = email.trim().toLowerCase()
  if (!key) return false
  if (envAdmins().includes(key)) return true
  const [rows] = await pool.query<AdminRow[]>('SELECT email FROM admins WHERE email = ?', [key])
  return rows.length > 0
}

export interface AdminEntry {
  email: string
  source: 'env' | 'database'
  addedBy?: string
  createdAt?: string
}

export async function listAdmins(): Promise<AdminEntry[]> {
  const [rows] = await pool.query<AdminRow[]>('SELECT email, added_by, created_at FROM admins ORDER BY created_at ASC')
  const dbAdmins: AdminEntry[] = rows.map(r => ({
    email: r.email,
    source: 'database',
    addedBy: r.added_by,
    createdAt: r.created_at.toISOString(),
  }))
  const envOnly: AdminEntry[] = envAdmins()
    .filter(e => !dbAdmins.some(d => d.email === e))
    .map(email => ({ email, source: 'env' }))
  return [...envOnly, ...dbAdmins]
}

export async function addAdmin(email: string, addedBy: string): Promise<void> {
  const key = email.trim().toLowerCase()
  await pool.query('INSERT INTO admins (email, added_by) VALUES (?, ?) ON DUPLICATE KEY UPDATE added_by = added_by', [
    key,
    addedBy,
  ])
}

export async function removeAdmin(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const key = email.trim().toLowerCase()
  if (envAdmins().includes(key)) {
    return { ok: false, error: 'This admin is set via the ADMIN_EMAILS env var — remove it there instead.' }
  }
  await pool.query('DELETE FROM admins WHERE email = ?', [key])
  return { ok: true }
}

/**
 * Shared guard for every admin API route: writes 401 if signed out, 403 if
 * signed in but not an admin, and otherwise returns the session email. Same
 * role getServerSession() calls already play inline in
 * pages/api/community/posts.ts, just centralized since every admin route
 * needs the same check.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions)
  const email = session?.user?.email
  if (!email) {
    res.status(401).json({ error: 'Sign in required' })
    return null
  }
  if (!(await isAdmin(email))) {
    res.status(403).json({ error: 'Your account does not have admin access.' })
    return null
  }
  return email
}
