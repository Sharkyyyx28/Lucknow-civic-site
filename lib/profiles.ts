// MySQL-backed store for signed-in users' civic profile (name + a list of
// labeled locations, e.g. "Home"/"Office"). See database/schema.sql for the
// `users` / `user_locations` tables.

import { RowDataPacket } from 'mysql2/promise'
import crypto from 'crypto'
import pool from './db'

export interface SavedLocation {
  id: string
  label: string
  wardName: string
  // Exact point within the ward, set when the user drops a pin (or uses
  // "Locate me") instead of just picking a ward from the list. Lets
  // nearest-amenity distances be measured from this point rather than just
  // showing the ward's aggregate counts.
  lat?: number
  lng?: number
}

export interface UserProfile {
  name: string
  locations: SavedLocation[]
  updatedAt: string
}

interface UserRow extends RowDataPacket {
  id: number
  email: string
  name: string
  updated_at: Date
}

interface LocationRow extends RowDataPacket {
  id: string
  label: string
  ward_name: string
  lat: number | null
  lng: number | null
}

async function findUser(email: string): Promise<UserRow | null> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, name, updated_at FROM users WHERE email = ?',
    [email]
  )
  return rows[0] ?? null
}

async function ensureUser(email: string): Promise<UserRow> {
  const existing = await findUser(email)
  if (existing) return existing
  await pool.query('INSERT INTO users (email, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = email', [
    email,
    '',
  ])
  return (await findUser(email))!
}

/**
 * Upserts the signed-in user and returns their row id. Community posts
 * (lib/community.ts) hang off the same `users` row as saved locations, so the
 * upsert lives here rather than being repeated per feature.
 */
export async function ensureUserId(email: string): Promise<number> {
  return (await ensureUser(email)).id
}

async function touchUser(userId: number): Promise<Date> {
  await pool.query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId])
  const [rows] = await pool.query<RowDataPacket[]>('SELECT updated_at FROM users WHERE id = ?', [userId])
  return rows[0].updated_at as Date
}

async function loadProfile(userId: number, name: string, updatedAt: Date): Promise<UserProfile> {
  const [rows] = await pool.query<LocationRow[]>(
    'SELECT id, label, ward_name, lat, lng FROM user_locations WHERE user_id = ? ORDER BY created_at ASC',
    [userId]
  )
  const locations: SavedLocation[] = rows.map(r => ({
    id: r.id,
    label: r.label,
    wardName: r.ward_name,
    ...(r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : {}),
  }))
  return { name, locations, updatedAt: updatedAt.toISOString() }
}

export async function getProfile(userKey: string): Promise<UserProfile | null> {
  const user = await findUser(userKey)
  if (!user) return null
  return loadProfile(user.id, user.name, user.updated_at)
}

export async function saveName(userKey: string, name: string): Promise<UserProfile> {
  const user = await ensureUser(userKey)
  await pool.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, user.id])
  return loadProfile(user.id, name, await touchUser(user.id))
}

export async function addLocation(
  userKey: string,
  label: string,
  wardName: string,
  coords?: { lat: number; lng: number }
): Promise<UserProfile> {
  const user = await ensureUser(userKey)
  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO user_locations (id, user_id, label, ward_name, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
    [id, user.id, label, wardName, coords?.lat ?? null, coords?.lng ?? null]
  )
  return loadProfile(user.id, user.name, await touchUser(user.id))
}

export async function updateLocation(
  userKey: string,
  id: string,
  // lat/lng: number to set, null to explicitly clear the pin, undefined to
  // leave whatever's already stored untouched.
  changes: Partial<Pick<SavedLocation, 'label' | 'wardName'>> & { lat?: number | null; lng?: number | null }
): Promise<UserProfile | null> {
  const user = await findUser(userKey)
  if (!user) return null

  const [rows] = await pool.query<LocationRow[]>(
    'SELECT id, label, ward_name, lat, lng FROM user_locations WHERE id = ? AND user_id = ?',
    [id, user.id]
  )
  const existing = rows[0]
  if (!existing) return null

  const label = changes.label ?? existing.label
  const wardName = changes.wardName ?? existing.ward_name
  const lat = changes.lat !== undefined ? changes.lat : existing.lat
  const lng = changes.lng !== undefined ? changes.lng : existing.lng
  const hasCoords = lat != null && lng != null

  await pool.query('UPDATE user_locations SET label = ?, ward_name = ?, lat = ?, lng = ? WHERE id = ?', [
    label,
    wardName,
    hasCoords ? lat : null,
    hasCoords ? lng : null,
    id,
  ])
  return loadProfile(user.id, user.name, await touchUser(user.id))
}

export async function removeLocation(userKey: string, id: string): Promise<UserProfile> {
  const user = await ensureUser(userKey)
  await pool.query('DELETE FROM user_locations WHERE id = ? AND user_id = ?', [id, user.id])
  return loadProfile(user.id, user.name, await touchUser(user.id))
}
