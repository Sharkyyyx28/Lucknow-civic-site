import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { wardAtPoint } from '../../../lib/wardLookup'
import { createPost, listPosts, type PostFilter } from '../../../lib/community'
import { BODY_MAX, TITLE_MAX, isPostCategory, isPostStatus } from '../../../lib/communityTypes'

/** `?ward=A&ward=B` and `?ward=A,B` both work; blank entries are dropped. */
function listParam(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined
  const raw = Array.isArray(value) ? value : [value]
  return raw
    .flatMap(v => v.split(','))
    .map(v => v.trim())
    .filter(Boolean)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/community/posts', err)
    return res.status(500).json({ error: 'Something went wrong loading the community feed.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const viewerKey = session?.user?.email ?? undefined

  // Reading is open — these are civic notes about public places, and the feed
  // is what a signed-out visitor lands on. Only posting needs an account.
  if (req.method === 'GET') {
    const { ward, corporation, category, status, mine, limit, offset } = req.query

    if (category !== undefined && !isPostCategory(category)) {
      return res.status(400).json({ error: 'Unknown category' })
    }
    if (status !== undefined && !isPostStatus(status)) {
      return res.status(400).json({ error: 'Unknown status' })
    }
    if (mine === '1' && !viewerKey) {
      return res.status(401).json({ error: 'Sign in required' })
    }

    const filter: PostFilter = {
      wardNames: listParam(ward),
      corporations: listParam(corporation),
      ...(isPostCategory(category) ? { category } : {}),
      ...(isPostStatus(status) ? { status } : {}),
      ...(mine === '1' && viewerKey ? { authorKey: viewerKey } : {}),
      ...(typeof limit === 'string' && Number.isFinite(parseInt(limit))
        ? { limit: parseInt(limit) }
        : {}),
      ...(typeof offset === 'string' && Number.isFinite(parseInt(offset))
        ? { offset: parseInt(offset) }
        : {}),
    }

    const { posts, total } = await listPosts(filter, viewerKey)
    return res.status(200).json({ posts, total })
  }

  if (req.method === 'POST') {
    if (!viewerKey) {
      return res.status(401).json({ error: 'Sign in required' })
    }

    const { title, body, category, lat, lng, placeLabel } = req.body ?? {}

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'A title is required' })
    }
    if (title.trim().length > TITLE_MAX) {
      return res.status(400).json({ error: `Keep the title under ${TITLE_MAX} characters` })
    }
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Write something in the post' })
    }
    if (body.trim().length > BODY_MAX) {
      return res.status(400).json({ error: `Posts are limited to ${BODY_MAX} characters` })
    }
    if (!isPostCategory(category)) {
      return res.status(400).json({ error: 'Pick what kind of post this is' })
    }
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Pin the place this post is about' })
    }
    if (placeLabel !== undefined && typeof placeLabel !== 'string') {
      return res.status(400).json({ error: 'placeLabel must be a string' })
    }

    // The ward and corporation come from the boundary geometry, not from the
    // client — otherwise a post could be filed into any ward's feed.
    const hit = await wardAtPoint(lat, lng)
    if (!hit) {
      return res.status(400).json({
        error: 'That pin is outside the mapped Lucknow ward boundaries.',
      })
    }

    const post = await createPost(viewerKey, {
      title,
      body,
      category,
      wardName: hit.wardName,
      corporation: hit.corporation,
      placeLabel,
      lat,
      lng,
    })
    return res.status(201).json({ post })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
