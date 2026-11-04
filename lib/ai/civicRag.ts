import { LUCKNOW_CIVIC_KNOWLEDGE, type CivicKnowledgeDoc } from './civicKnowledge'

// Synonym and Hindi/Hinglish vocabulary mapping for Lucknow civic terms
const CIVIC_SYNONYMS: Record<string, string[]> = {
  tax: ['house tax', 'property tax', 'grih kar', 'makan tax', 'assessment', 'mutation', 'namantaran'],
  sanitation: ['kachra', 'garbage', 'safai', 'cleaning', 'dustbin', 'sweeper', 'waste', 'nala', 'drain', 'litter'],
  water: ['paani', 'pani', 'water', 'sewer', 'jal sansthan', 'tanker', 'pipeline', 'leakage', 'ganda paani', 'manhole'],
  electricity: ['bijli', 'power', 'light', 'streetlight', 'street light', 'lesa', 'transformer', 'voltage', 'current', 'uppcl'],
  certificate: ['birth', 'death', 'janam', 'mrityu', 'praman patra', 'certificate', 'crs', 'hospital'],
  grievance: ['jansunwai', 'igrs', 'complaint', 'shikayat', 'cm helpline', 'escalate', 'helpline', 'officer'],
  metro: ['metro', 'upmrc', 'train', 'fare', 'ticket', 'gosmart', 'red line', 'airport', 'charbagh', 'station'],
  zones: ['zone', 'zonal', 'ward', 'corporator', 'office', 'gomti nagar', 'hazratganj', 'aliganj', 'chowk', 'indira nagar'],
  animal: ['dog', 'kutta', 'cat', 'rabies', 'kanha upvan', 'pet', 'license', 'stray', 'animal'],
}

export interface RagSearchResult {
  doc: CivicKnowledgeDoc
  score: number
  matchedTerms: string[]
}

/**
 * Searches the curated Lucknow civic knowledge base using tokenized semantic keyword matching.
 */
export function searchCivicKnowledge(query: string, maxResults = 3): RagSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim()
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2)

  const results: RagSearchResult[] = []

  for (const doc of LUCKNOW_CIVIC_KNOWLEDGE) {
    let score = 0
    const matchedTerms: string[] = []

    // 1. Direct title match
    if (doc.title.toLowerCase().includes(normalizedQuery)) {
      score += 25
      matchedTerms.push('exact title')
    }

    // 2. Keyword matches
    for (const kw of doc.keywords) {
      if (normalizedQuery.includes(kw.toLowerCase())) {
        score += 15
        matchedTerms.push(kw)
      } else {
        for (const token of queryTokens) {
          if (kw.toLowerCase().includes(token)) {
            score += 5
            if (!matchedTerms.includes(kw)) matchedTerms.push(kw)
          }
        }
      }
    }

    // 3. Synonym dictionary matching
    const categorySynonyms = CIVIC_SYNONYMS[doc.category] || []
    for (const syn of categorySynonyms) {
      if (normalizedQuery.includes(syn)) {
        score += 12
        if (!matchedTerms.includes(syn)) matchedTerms.push(syn)
      }
    }

    // 4. Check FAQs
    for (const faq of doc.faqs) {
      if (faq.q.toLowerCase().includes(normalizedQuery)) {
        score += 20
        matchedTerms.push('faq match')
      }
    }

    // 5. Summary keyword frequency
    const summaryLower = doc.summary.toLowerCase()
    for (const token of queryTokens) {
      if (summaryLower.includes(token)) {
        score += 3
      }
    }

    if (score > 0) {
      results.push({ doc, score, matchedTerms })
    }
  }

  // Sort descending by relevance score
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, maxResults)
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface CivicAiResponse {
  answer: string
  sources: { id: string; title: string; category: string }[]
  helplines: { name: string; number: string }[]
  portals: { name: string; url: string }[]
  mode: 'llm_rag' | 'knowledge_synthesis'
}

/**
 * Answers a citizen query using either Gemini 1.5 Flash (if API key available)
 * or smart contextual knowledge synthesis.
 */
export async function answerCivicQuery(
  userQuery: string,
  history: ChatMessage[] = []
): Promise<CivicAiResponse> {
  const retrieved = searchCivicKnowledge(userQuery, 3)
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const topSources = retrieved.map(r => ({
    id: r.doc.id,
    title: r.doc.title,
    category: r.doc.category,
  }))

  const allHelplines = retrieved.flatMap(r => r.doc.helplines)
  // Deduplicate helplines by number
  const uniqueHelplines = Array.from(
    new Map(allHelplines.map(h => [h.number, h])).values()
  )

  const allPortals = retrieved.flatMap(r => r.doc.officialPortals)
  const uniquePortals = Array.from(
    new Map(allPortals.map(p => [p.url, p])).values()
  )

  // Ground truth context formulation
  const contextBlock = retrieved
    .map(
      r => `
DOCUMENT: ${r.doc.title} (Category: ${r.doc.category})
Summary: ${r.doc.summary}
Official Procedure:
${r.doc.officialProcedure.map(p => `- ${p}`).join('\n')}
Helplines: ${r.doc.helplines.map(h => `${h.name}: ${h.number}`).join(', ')}
Official Portals: ${r.doc.officialPortals.map(p => `${p.name} (${p.url})`).join(', ')}
Key FAQs:
${r.doc.faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n')}
`
    )
    .join('\n---\n')

  // If Gemini API Key is configured, run live LLM RAG
  if (geminiApiKey) {
    try {
      const systemPrompt = `You are 'Awadh Mitr' (अवध मित्र), an expert, polite, and helpful AI Civic Assistant for the citizens of Lucknow, Uttar Pradesh.
You represent the municipal digital helpdesk for Lucknow Municipal Corporation (LMC / Nagar Nigam), Lucknow Jal Sansthan, LESA (Electricity), UPMRC Lucknow Metro, and UP Jansunwai.
Speak with the renowned politeness (Tehzeeb) of Lucknow. You understand and answer fluently in English, Hindi (हिंदी), and Hinglish depending on how the user greets or asks.

Use the provided GROUND TRUTH CONTEXT to give accurate, actionable answers. Mention exact helpline numbers (e.g., LMC 1533, Police 112, CM Helpline 1076, LESA 1912) and official websites where applicable. If the context does not contain the answer, provide standard UP Government civic guidance politely.

GROUND TRUTH CONTEXT FOR LUCKNOW:
${contextBlock}
`

      const contents = [
        ...history.slice(-4).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userQuery }],
        },
      ]

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 800,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return {
            answer: text,
            sources: topSources,
            helplines: uniqueHelplines,
            portals: uniquePortals,
            mode: 'llm_rag',
          }
        }
      }
    } catch {
      // Fallback below if API call times out or fails
    }
  }

  // Fallback: Intelligent Contextual Knowledge Synthesis
  if (retrieved.length > 0) {
    const primary = retrieved[0].doc
    const secondary = retrieved[1]?.doc

    let text = `**Aadaab!** Regarding **${primary.title}** in Lucknow:\n\n`
    text += `${primary.summary}\n\n`
    text += `### Official Procedure & Steps:\n`
    primary.officialProcedure.forEach((step, idx) => {
      text += `${idx + 1}. ${step}\n`
    })

    if (primary.faqs && primary.faqs.length > 0) {
      text += `\n### Common Clarifications:\n`
      primary.faqs.forEach(faq => {
        text += `* **${faq.q}**\n  ${faq.a}\n`
      })
    }

    if (secondary) {
      text += `\n*Also see related information for **${secondary.title}**: ${secondary.summary}*\n`
    }

    text += `\n> **Need immediate municipal assistance?** You can connect with Lucknow Municipal Corporation directly on toll-free **1533** or log an official grievance on the UP Jansunwai portal.`

    return {
      answer: text,
      sources: topSources,
      helplines: uniqueHelplines,
      portals: uniquePortals,
      mode: 'knowledge_synthesis',
    }
  }

  // General fallback for unknown topics
  return {
    answer: `**Aadaab!** I am **Awadh Mitr** (अवध मित्र), your civic guide for Lucknow.\n\nI can assist you with:\n- **Property / House Tax:** Payment steps, rebates, and mutation.\n- **Sanitation & Waste:** Door-to-door garbage collection, missed pickups, dead animal removal (Helpline: **1533**).\n- **Water & Sewerage:** Jal Sansthan complaints, emergency tanker booking (**0522-2239611**).\n- **Electricity / Streetlights:** LESA power cuts (**1912**), non-functional municipal streetlights.\n- **Certificates:** Birth & death certificate registration via LMC Health Dept.\n- **UP Jansunwai / IGRS:** Grievance registration & escalation to District Magistrate.\n- **Lucknow Metro:** UPMRC Red Line routes, fares, and timings.\n\nPlease ask about any of these services or specify your locality (e.g., *Gomti Nagar, Aliganj, Hazratganj, Chowk*).`,
    sources: [],
    helplines: [
      { name: 'LMC Citizen Helpline', number: '1533' },
      { name: 'Police / Emergency', number: '112' },
      { name: 'CM Helpline UP', number: '1076' },
      { name: 'LESA Electricity', number: '1912' },
    ],
    portals: [
      { name: 'Lucknow Municipal Corporation', url: 'https://lmc.up.nic.in' },
      { name: 'UP Jansunwai Portal', url: 'https://jansunwai.up.gov.in' },
    ],
    mode: 'knowledge_synthesis',
  }
}
