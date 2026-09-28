import type { NextApiRequest, NextApiResponse } from 'next'
import { upvotePost } from '../../../../lib/community'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'id is required' })
  }

  try {
    const upvotes = await upvotePost(id)
    if (upvotes === null) {
      return res.status(404).json({ error: 'Post not found' })
    }
    return res.status(200).json({ ok: true, upvotes })
  } catch (err) {
    console.error('api/community/[id]/upvote', err)
    return res.status(500).json({ error: 'Failed to record upvote' })
  }
}
