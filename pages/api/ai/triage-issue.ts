import type { NextApiRequest, NextApiResponse } from 'next'
import { triageCivicIssue, type TriageRequest } from '../../../lib/ai/issueTriage'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Support base64 photo uploads for inspection
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { image, description, lat, lng, wardName } = req.body || {}

  if (!image && !description) {
    return res.status(400).json({ error: 'Please provide either an image or a brief description for AI triage.' })
  }

  try {
    const payload: TriageRequest = {
      image: typeof image === 'string' ? image : undefined,
      description: typeof description === 'string' ? description : undefined,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      wardName: typeof wardName === 'string' ? wardName : undefined,
    }

    const triageResult = await triageCivicIssue(payload)
    return res.status(200).json(triageResult)
  } catch (error) {
    console.error('Error in /api/ai/triage-issue:', error)
    return res.status(500).json({ error: 'Failed to triage issue with AI.' })
  }
}
