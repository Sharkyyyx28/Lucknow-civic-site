import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { deletePost, getPost, updatePost } from '../../../lib/community'
import { BODY_MAX, TITLE_MAX, isPostCategory, isPostStatus } from '../../../lib/communityTypes'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return await handleRequest(req, res)
  } catch (err) {
    console.error('api/community/[id]', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

async function handleRequest(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  const viewerKey = session?.user?.email ?? undefined

  const { id } = req.query
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'id is required' })
  }

  if (req.method === 'GET') {
    const post = await getPost(id, viewerKey)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    return res.status(200).json({ post })
  }

  if (req.method === 'PATCH') {
    if (!viewerKey) return res.status(401).json({ error: 'Sign in required' })

    const { title, body, category, placeLabel } = req.body ?? {}
    const changes: Parameters<typeof updatePost>[2] = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'A title is required' })
      }
      if (title.trim().length > TITLE_MAX) {
        return res.status(400).json({ error: `Keep the title under ${TITLE_MAX} characters` })
      }
      changes.title = title
    }
    if (body !== undefined) {
      if (typeof body !== 'string' || !body.trim()) {
        return res.status(400).json({ error: 'Write something in the post' })
      }
      if (body.trim().length > BODY_MAX) {
        return res.status(400).json({ error: `Posts are limited to ${BODY_MAX} characters` })
      }
      changes.body = body
    }
    if (category !== undefined) {
      if (!isPostCategory(category)) {
        return res.status(400).json({ error: 'Unknown category' })
      }
      changes.category = category
    }
    if (placeLabel !== undefined) {
      if (typeof placeLabel !== 'string') {
        return res.status(400).json({ error: 'placeLabel must be a string' })
      }
      changes.placeLabel = placeLabel
    }
    if (req.body?.status !== undefined) {
      if (!isPostStatus(req.body.status)) {
        return res.status(400).json({ error: 'Unknown status' })
      }
      changes.status = req.body.status
    }

    const post = await updatePost(viewerKey, id, changes)
    // Same response whether the post is missing or someone else's — no reason
    // to tell a stranger which post ids exist.
    if (!post) return res.status(404).json({ error: 'Post not found' })
    return res.status(200).json({ post })
  }

  if (req.method === 'DELETE') {
    if (!viewerKey) return res.status(401).json({ error: 'Sign in required' })
    const deleted = await deletePost(viewerKey, id)
    if (!deleted) return res.status(404).json({ error: 'Post not found' })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
