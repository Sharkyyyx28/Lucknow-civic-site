import type { NextApiRequest, NextApiResponse } from 'next'
import { addAdmin, listAdmins, requireAdmin } from '../../../lib/admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/admins', err)
    return res.status(500).json({ error: 'Something went wrong loading admins.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  const adminEmail = await requireAdmin(req, res)
  if (!adminEmail) return // requireAdmin already wrote the response

  if (req.method === 'GET') {
    return res.status(200).json({ admins: await listAdmins() })
  }

  if (req.method === 'POST') {
    const { email } = (req.body ?? {}) as Record<string, unknown>
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }
    await addAdmin(email.trim(), adminEmail)
    return res.status(201).json({ admins: await listAdmins() })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
