import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/admin'
import { deleteSocialHandle, recordHandleCheck, updateSocialHandle, type SocialHandleInput } from '../../../lib/socialHandles'
import { checkSocialHandle } from '../../../lib/socialHandleCheck'
import { validateHandleInput } from './index'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/social-handles/[id]', err)
    return res.status(500).json({ error: 'Something went wrong updating the social handles directory.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const adminEmail = await requireAdmin(req, res)
  if (!adminEmail) return // requireAdmin already wrote the response

  if (req.method === 'PUT') {
    const error = validateHandleInput(req.body)
    if (error) return res.status(400).json({ error })

    let handle = await updateSocialHandle(id, req.body as Partial<SocialHandleInput>, adminEmail)
    if (!handle) return res.status(404).json({ error: 'Not found' })
    // Best effort, same as the create path — a save shouldn't fail just
    // because the existence check timed out or was blocked.
    try {
      const result = await checkSocialHandle(handle)
      handle = (await recordHandleCheck(handle.id, result)) ?? handle
    } catch (err) {
      console.error('api/social-handles/[id] update-check', err)
    }
    return res.status(200).json({ handle })
  }

  if (req.method === 'DELETE') {
    const ok = await deleteSocialHandle(id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.status(204).end()
  }

  res.setHeader('Allow', 'PUT, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
