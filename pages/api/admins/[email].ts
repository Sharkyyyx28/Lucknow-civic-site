import type { NextApiRequest, NextApiResponse } from 'next'
import { removeAdmin, requireAdmin } from '../../../lib/admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/admins/[email]', err)
    return res.status(500).json({ error: 'Something went wrong removing that admin.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.query
  if (typeof email !== 'string') return res.status(400).json({ error: 'Missing email' })

  const adminEmail = await requireAdmin(req, res)
  if (!adminEmail) return // requireAdmin already wrote the response

  if (req.method === 'DELETE') {
    const { ok, error } = await removeAdmin(email)
    if (!ok) return res.status(400).json({ error })
    return res.status(204).end()
  }

  res.setHeader('Allow', 'DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
