import type { PostCategory } from '../communityTypes'

export interface TriageRequest {
  image?: string // Base64 data URL e.g. "data:image/jpeg;base64,..."
  description?: string
  lat?: number
  lng?: number
  wardName?: string
}

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface TriageResult {
  category: PostCategory
  subcategory: string
  severity: IssueSeverity
  severityScore: number // 1 to 5
  severityReason: string
  suggestedTitle: string
  suggestedBody: string
  responsibleAgency: string
  helpline: string
  jansunwaiDraft: string
  tweetDraft: string
  detectedHazards: string[]
}

const AGENCY_DIRECTORIES: Record<string, { agency: string; helpline: string; twitter: string }> = {
  pothole: {
    agency: 'Lucknow Municipal Corporation (LMC) Works & Road Dept / PWD',
    helpline: '1533 / 1076',
    twitter: '@LMC_Lucknow @AdminLKO @UPGovt',
  },
  garbage: {
    agency: 'Lucknow Municipal Corporation (Nagar Nigam) — Sanitation Wing',
    helpline: '1533 (Toll Free)',
    twitter: '@LMC_Lucknow @AdminLKO',
  },
  water_sewer: {
    agency: 'Lucknow Jal Sansthan (Jal Nigam)',
    helpline: '0522-2239611 / 1533',
    twitter: '@LMC_Lucknow @AdminLKO',
  },
  electrical: {
    agency: 'LESA / Madhyanchal Vidyut Vitaran Nigam Ltd & LMC Lighting',
    helpline: '1912 (LESA) / 1533 (Streetlight)',
    twitter: '@UPPCLLko @AdminLKO',
  },
  encroachment: {
    agency: 'LMC Anti-Encroachment Cell & Lucknow Police',
    helpline: '1533 / 112',
    twitter: '@LMC_Lucknow @lkopolice',
  },
  traffic_parking: {
    agency: 'Lucknow Traffic Police',
    helpline: '112 / 9454405155',
    twitter: '@lkopolice @AdminLKO',
  },
  general: {
    agency: 'Lucknow Municipal Corporation (Nagar Nigam)',
    helpline: '1533',
    twitter: '@LMC_Lucknow @AdminLKO',
  },
}

/**
 * Heuristic fallback classifier when Gemini API is offline or not configured.
 */
function heuristicTriage(req: TriageRequest): TriageResult {
  const text = (req.description || '').toLowerCase()

  let subcategory = 'general'
  let agencyKey = 'general'
  let hazards: string[] = []
  let severity: IssueSeverity = 'medium'
  let severityScore = 3
  let severityReason = 'Standard municipal maintenance issue reported by resident.'

  if (text.match(/pothole|gaddha|road|sadak|broken road|asphalt|tar/)) {
    subcategory = 'pothole'
    agencyKey = 'pothole'
    severity = 'high'
    severityScore = 4
    severityReason = 'Road crater/pothole causes vehicular damage and accident risk for two-wheelers.'
    hazards.push('Accident Risk for Two-Wheelers')
  } else if (text.match(/garbage|kachra|dump|dustbin|kuda|waste|litter|smell|safai/)) {
    subcategory = 'garbage'
    agencyKey = 'garbage'
    severity = 'medium'
    severityScore = 3
    severityReason = 'Uncollected solid waste causes public hygiene concern, foul odor, and vector breeding.'
    hazards.push('Public Health & Vector Hazard')
  } else if (text.match(/water|sewer|drain|leak|pipeline|nal|manhole|overflow|waterlogging|paani/)) {
    subcategory = 'water_sewer'
    agencyKey = 'water_sewer'
    if (text.match(/manhole|overflow|drain/)) {
      severity = 'high'
      severityScore = 4
      severityReason = 'Sewer overflow or open manhole poses significant pedestrian hazard and water contamination.'
      hazards.push('Submerged Obstacle / Open Manhole')
    } else {
      severity = 'medium'
      severityScore = 3
      severityReason = 'Drinking water pipeline leakage or supply issue.'
    }
  } else if (text.match(/light|streetlight|wire|pole|current|bijli|spark|transformer|power/)) {
    subcategory = 'electrical'
    agencyKey = 'electrical'
    if (text.match(/wire|spark|current|hanging/)) {
      severity = 'critical'
      severityScore = 5
      severityReason = 'Live electric wire or sparking transformer poses imminent electrocution hazard!'
      hazards.push('Electrocution Hazard', 'Fire Risk')
    } else {
      severity = 'medium'
      severityScore = 2
      severityReason = 'Non-functional streetlight creates dark spots impacting night safety.'
    }
  } else if (text.match(/encroachment|illegal|kabza|footpath|blocked/)) {
    subcategory = 'encroachment'
    agencyKey = 'encroachment'
    severity = 'medium'
    severityScore = 3
    severityReason = 'Footpath encroachment obstructing pedestrian walkway.'
  }

  const agencyConfig = AGENCY_DIRECTORIES[agencyKey] || AGENCY_DIRECTORIES.general
  const locationTag = req.wardName ? ` [Ward: ${req.wardName}]` : ''

  const suggestedTitle = req.description
    ? req.description.slice(0, 60).trim()
    : `Civic grievance regarding ${subcategory.replace('_', ' ')} in Lucknow${locationTag}`

  const suggestedBody = req.description && req.description.length > 30
    ? req.description
    : `Civic issue regarding ${subcategory.replace('_', ' ')} observed in Lucknow${locationTag}. This requires inspection and repair by ${agencyConfig.agency}. Please dispatch field staff to resolve this at the earliest.`

  const jansunwaiDraft = `सेवा में,\nसम्बंधित अधिकारी,\n${agencyConfig.agency},\nलखनऊ नगर निगम / उत्तर प्रदेश सरकार।\n\nविषय: ${suggestedTitle}\n\nमहोदय,\nसविनय निवेदन है कि उपरोक्त क्षेत्र में ${subcategory.replace('_', ' ')} की गंभीर समस्या उत्पन्न हो गई है।\n\nस्थान विवरण: ${req.wardName ? 'वार्ड: ' + req.wardName : 'लखनऊ'}\n${req.lat && req.lng ? `GPS निर्देशांक: ${req.lat.toFixed(5)}, ${req.lng.toFixed(5)}\n` : ''}\nविवरण:\n${suggestedBody}\n\nप्राथमिकता स्तर: ${severity.toUpperCase()}\nअतः आपसे विनम्र अनुरोध है कि जनहित में इस समस्या का शीघ्र संज्ञान लेकर निवारण कराने का कष्ट करें।\n\nभवदीय,\nजागरूक नागरिक, लखनऊ`

  const tweetDraft = `🚨 Civic attention required in Lucknow${locationTag}!\n\nIssue: ${suggestedTitle}\nCategory: ${subcategory.replace('_', ' ')} (${severity.toUpperCase()})\n\ncc: ${agencyConfig.twitter} #LucknowCivic #NagarNigam`

  return {
    category: 'issue',
    subcategory,
    severity,
    severityScore,
    severityReason,
    suggestedTitle,
    suggestedBody,
    responsibleAgency: agencyConfig.agency,
    helpline: agencyConfig.helpline,
    jansunwaiDraft,
    tweetDraft,
    detectedHazards: hazards,
  }
}

/**
 * Triage civic issue using Gemini Multimodal Vision API when available,
 * or fallback to smart heuristics.
 */
export async function triageCivicIssue(req: TriageRequest): Promise<TriageResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (geminiApiKey && (req.image || req.description)) {
    try {
      const parts: any[] = []

      // If user uploaded an image base64
      if (req.image) {
        const matches = req.image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          })
        }
      }

      const promptText = `You are an expert AI Municipal Civic Inspector for Lucknow Municipal Corporation (LMC / Nagar Nigam).
Analyze the uploaded image and/or user description of a civic problem in Lucknow.
Context:
- User Description: "${req.description || 'None provided'}"
- Location Coordinates: ${req.lat && req.lng ? `${req.lat}, ${req.lng}` : 'Not provided'}
- Ward: ${req.wardName || 'Lucknow city'}

Inspect and return a valid JSON object matching this schema:
{
  "category": "issue" (or "place" / "question"),
  "subcategory": "pothole" | "garbage" | "water_sewer" | "electrical" | "encroachment" | "traffic_parking" | "general",
  "severity": "low" | "medium" | "high" | "critical",
  "severityScore": 1 to 5,
  "severityReason": "Brief explanation of safety/public hazard",
  "suggestedTitle": "Concise, actionable issue title (max 70 chars)",
  "suggestedBody": "Clear, objective, formal description of the issue suitable for municipal filing",
  "responsibleAgency": "Exact Lucknow authority name (e.g. Lucknow Municipal Corporation Sanitation Dept, Jal Sansthan, LESA, PWD)",
  "helpline": "Official helpline number (e.g. 1533, 1912, 0522-2239611)",
  "detectedHazards": ["list of hazards if any, e.g. Electrocution, Two-wheeler skid risk"]
}
ONLY return the JSON object, nothing else.`

      parts.push({ text: promptText })

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          const agencyConfig = AGENCY_DIRECTORIES[parsed.subcategory] || AGENCY_DIRECTORIES.general
          const locationTag = req.wardName ? ` [Ward: ${req.wardName}]` : ''

          const jansunwaiDraft = `सेवा में,\nसम्बंधित अधिकारी,\n${parsed.responsibleAgency || agencyConfig.agency},\nलखनऊ नगर निगम / उत्तर प्रदेश सरकार।\n\nविषय: ${parsed.suggestedTitle}\n\nमहोदय,\nसविनय निवेदन है कि उपरोक्त क्षेत्र में जनहित से संबंधित निम्न समस्या पर तत्काल कार्रवाई अपेक्षित है।\n\nस्थान विवरण: ${req.wardName ? 'वार्ड: ' + req.wardName : 'लखनऊ'}\n${req.lat && req.lng ? `GPS निर्देशांक: ${req.lat.toFixed(5)}, ${req.lng.toFixed(5)}\n` : ''}\nसमस्या विवरण:\n${parsed.suggestedBody}\n\nप्राथमिकता स्तर: ${(parsed.severity || 'medium').toUpperCase()}\nअतः आपसे विनम्र निवेदन है कि इसका शीघ्र निरीक्षण एवं समाधान कराने का कष्ट करें।\n\nभवदीय,\nजागरूक नागरिक, लखनऊ`

          const tweetDraft = `🚨 Civic attention required in Lucknow${locationTag}!\n\nIssue: ${parsed.suggestedTitle}\nCategory: ${parsed.subcategory || 'civic'} (${(parsed.severity || 'medium').toUpperCase()})\n\ncc: ${agencyConfig.twitter} #LucknowCivic #NagarNigam`

          return {
            category: parsed.category || 'issue',
            subcategory: parsed.subcategory || 'general',
            severity: parsed.severity || 'medium',
            severityScore: parsed.severityScore || 3,
            severityReason: parsed.severityReason || 'Reported municipal issue requiring field attention.',
            suggestedTitle: parsed.suggestedTitle,
            suggestedBody: parsed.suggestedBody,
            responsibleAgency: parsed.responsibleAgency || agencyConfig.agency,
            helpline: parsed.helpline || agencyConfig.helpline,
            jansunwaiDraft,
            tweetDraft,
            detectedHazards: Array.isArray(parsed.detectedHazards) ? parsed.detectedHazards : [],
          }
        }
      }
    } catch {
      // Fallback to heuristic
    }
  }

  return heuristicTriage(req)
}
