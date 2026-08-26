import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { getProfile, saveName } from '../../lib/profiles'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Sign in required' })
  }
  const userKey = session.user.email

  if (req.method === 'GET') {
    return res.status(200).json({ profile: await getProfile(userKey) })
  }

  if (req.method === 'POST') {
    const { name } = req.body ?? {}
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string' })
    }
    const profile = await saveName(userKey, name.trim().slice(0, 200))
    return res.status(200).json({ profile })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
