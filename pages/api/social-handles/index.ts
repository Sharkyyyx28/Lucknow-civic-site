import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '../../../lib/admin'
import { createSocialHandle, listSocialHandles, recordHandleCheck, type SocialHandleInput } from '../../../lib/socialHandles'
import { checkSocialHandle } from '../../../lib/socialHandleCheck'
import {
  FOCUS_MAX,
  HANDLE_MAX,
  NAME_MAX,
  ROLE_MAX,
  WEBSITE_MAX,
  isHandleCategory,
} from '../../../lib/socialHandlesTypes'

/** Shared by POST here and PUT in [id].ts. Returns an error string, or null when valid. */
export function validateHandleInput(body: unknown): string | null {
  const { name, category, focus, role, x, instagram, website } = (body ?? {}) as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) return 'A name is required'
  if (name.trim().length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters`
  if (!isHandleCategory(category)) return 'Pick a valid category'
  if (typeof focus !== 'string' || !focus.trim()) return 'A focus description is required'
  if (focus.trim().length > FOCUS_MAX) return `Keep the focus under ${FOCUS_MAX} characters`
  if (role !== undefined && (typeof role !== 'string' || role.length > ROLE_MAX)) {
    return `Role must be under ${ROLE_MAX} characters`
  }
  if (x !== undefined && (typeof x !== 'string' || x.length > HANDLE_MAX)) {
    return `X handle must be under ${HANDLE_MAX} characters`
  }
  if (instagram !== undefined && (typeof instagram !== 'string' || instagram.length > HANDLE_MAX)) {
    return `Instagram handle must be under ${HANDLE_MAX} characters`
  }
  if (website !== undefined && website !== '') {
    if (typeof website !== 'string' || website.length > WEBSITE_MAX) {
      return `Website must be under ${WEBSITE_MAX} characters`
    }
    if (!/^https?:\/\//i.test(website)) return 'Website must start with http:// or https://'
  }

  const hasX = typeof x === 'string' && x.trim().replace(/^@/, '')
  const hasInstagram = typeof instagram === 'string' && instagram.trim().replace(/^@/, '')
  const hasWebsite = typeof website === 'string' && website.trim()
  if (!hasX && !hasInstagram && !hasWebsite) {
    return 'Add at least one of X, Instagram or a website'
  }

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/social-handles', err)
    return res.status(500).json({ error: 'Something went wrong loading the social handles directory.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { category } = req.query
    const handles = await listSocialHandles(isHandleCategory(category) ? category : undefined)
    return res.status(200).json({ handles })
  }

  if (req.method === 'POST') {
    const adminEmail = await requireAdmin(req, res)
    if (!adminEmail) return // requireAdmin already wrote the response

    const error = validateHandleInput(req.body)
    if (error) return res.status(400).json({ error })

    let handle = await createSocialHandle(req.body as SocialHandleInput, adminEmail)
    // Best effort — a newly added handle shouldn't fail to save just because
    // the existence check timed out or the platform blocked the probe.
    try {
      const result = await checkSocialHandle(handle)
      handle = (await recordHandleCheck(handle.id, result)) ?? handle
    } catch (err) {
      console.error('api/social-handles create-check', err)
    }
    return res.status(201).json({ handle })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
