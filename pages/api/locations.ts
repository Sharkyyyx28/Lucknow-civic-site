import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { addLocation, updateLocation, removeLocation } from '../../lib/profiles'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Sign in required' })
  }
  const userKey = session.user.email

  if (req.method === 'POST') {
    const { label, wardName, lat, lng } = req.body ?? {}
    if (typeof wardName !== 'string' || !wardName.trim()) {
      return res.status(400).json({ error: 'wardName is required' })
    }
    if (typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ error: 'label is required' })
    }
    let coords: { lat: number; lng: number } | undefined
    if (lat !== undefined || lng !== undefined) {
      if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'lat and lng must both be finite numbers' })
      }
      coords = { lat, lng }
    }
    const profile = await addLocation(userKey, label.trim().slice(0, 50), wardName.trim(), coords)
    return res.status(200).json({ profile })
  }

  if (req.method === 'PATCH') {
    const { id, label, wardName, lat, lng } = req.body ?? {}
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'id is required' })
    }
    const changes: { label?: string; wardName?: string; lat?: number | null; lng?: number | null } = {}
    if (label !== undefined) {
      if (typeof label !== 'string' || !label.trim()) {
        return res.status(400).json({ error: 'label must be a non-empty string' })
      }
      changes.label = label.trim().slice(0, 50)
    }
    if (wardName !== undefined) {
      if (typeof wardName !== 'string' || !wardName.trim()) {
        return res.status(400).json({ error: 'wardName must be a non-empty string' })
      }
      changes.wardName = wardName.trim()
    }
    if (lat !== undefined) {
      if (lat !== null && (typeof lat !== 'number' || !Number.isFinite(lat))) {
        return res.status(400).json({ error: 'lat must be a finite number or null' })
      }
      changes.lat = lat
    }
    if (lng !== undefined) {
      if (lng !== null && (typeof lng !== 'number' || !Number.isFinite(lng))) {
        return res.status(400).json({ error: 'lng must be a finite number or null' })
      }
      changes.lng = lng
    }
    const profile = await updateLocation(userKey, id, changes)
    if (!profile) return res.status(404).json({ error: 'Location not found' })
    return res.status(200).json({ profile })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'id is required' })
    }
    const profile = await removeLocation(userKey, id)
    return res.status(200).json({ profile })
  }

  res.setHeader('Allow', 'POST, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
