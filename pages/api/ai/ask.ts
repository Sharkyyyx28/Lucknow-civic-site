import type { NextApiRequest, NextApiResponse } from 'next'
import { answerCivicQuery, type ChatMessage } from '../../../lib/ai/civicRag'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { query, history } = req.body || {}

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' })
  }

  try {
    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : []
    const result = await answerCivicQuery(query.trim(), chatHistory)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in /api/ai/ask:', error)
    return res.status(500).json({
      error: 'Failed to process civic query. Please try again or call LMC Helpline at 1533.',
    })
  }
}
