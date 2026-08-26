import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../../lib/admin'
import { getSocialHandle, recordHandleCheck } from '../../../../lib/socialHandles'
import { checkSocialHandle } from '../../../../lib/socialHandleCheck'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/social-handles/[id]/check', err)
    return res.status(500).json({ error: 'Something went wrong checking this handle.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const adminEmail = await requireAdmin(req, res)
  if (!adminEmail) return // requireAdmin already wrote the response

  const existing = await getSocialHandle(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const result = await checkSocialHandle(existing)
  const handle = await recordHandleCheck(id, result)
  return res.status(200).json({ handle })
}
