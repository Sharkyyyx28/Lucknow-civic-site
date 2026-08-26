import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/admin'
import { listSocialHandles, recordHandleCheck } from '../../../lib/socialHandles'
import { checkSocialHandle, mapWithConcurrency } from '../../../lib/socialHandleCheck'

// A handful of handles at a time — enough to keep a full directory sweep
// from taking minutes (each handle can involve up to three 8s-timeout
// probes), without hammering x.com/instagram.com hard enough to get every
// request rate-limited into 'unknown'.
const CONCURRENCY = 4

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/social-handles/check-all', err)
    return res.status(500).json({ error: 'Something went wrong checking the directory.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminEmail = await requireAdmin(req, res)
  if (!adminEmail) return // requireAdmin already wrote the response

  const handles = await listSocialHandles()
  const checked = await mapWithConcurrency(handles, CONCURRENCY, async handle => {
    const result = await checkSocialHandle(handle)
    return (await recordHandleCheck(handle.id, result)) ?? handle
  })

  return res.status(200).json({ handles: checked })
}
