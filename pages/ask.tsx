import { useState, useRef, useEffect, FormEvent } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Container from '../components/container'
import Layout from '../components/layout'
import { INPUT, PRIMARY_BTN } from '../lib/ui'
import type { CivicAiResponse } from '../lib/ai/civicRag'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { id: string; title: string; category: string }[]
  helplines?: { name: string; number: string }[]
  portals?: { name: string; url: string }[]
}

const QUICK_PROMPTS = [
  'How to pay Lucknow house tax online?',
  'Street light not working in my ward',
  'How to book a water tanker from Jal Sansthan?',
  'Lucknow Metro timings and fare structure',
  'Birth certificate application procedure',
  'Which zone is Gomti Nagar or Aliganj in?',
  'How to file a grievance on UP Jansunwai?',
]

export default function AskAwadhMitrPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '**Aadaab & Namaste!** I am **Awadh Mitr** (अवध मित्र), your AI civic copilot for Lucknow.\n\nI can answer questions regarding **Lucknow Municipal Corporation (LMC)** services, house tax, sanitation schedules, Jal Sansthan water & drainage, LESA electricity, birth/death certificates, UP Jansunwai grievances, and UPMRC Metro.\n\n*Feel free to ask in English, Hindi (हिंदी), or Hinglish!*',
      helplines: [
        { name: 'LMC Citizen Helpline', number: '1533' },
        { name: 'Emergency Police/Fire', number: '112' },
        { name: 'CM Helpline', number: '1076' },
      ],
      portals: [
        { name: 'LMC Official Portal', url: 'https://lmc.up.nic.in' },
        { name: 'UP Jansunwai IGRS', url: 'https://jansunwai.up.gov.in' },
      ],
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async (queryText: string) => {
    const text = queryText.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, history: historyPayload }),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch response')
      }

      const data: CivicAiResponse = await res.json()

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        helplines: data.helplines,
        portals: data.portals,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Maafi chahenge, I encountered a temporary connection issue. For immediate municipal grievances, please call Lucknow Municipal Corporation on toll-free **1533** or CM Helpline **1076**.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  // Simple Markdown paragraph and bold text renderer
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n')
    return (
      <div className="space-y-2 text-sm leading-relaxed text-ink-800">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-ink-900 pt-2 text-sm uppercase tracking-wider">
                {line.replace('### ', '')}
              </h4>
            )
          }
          if (line.startsWith('* ') || line.startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-ink-800">
                <span dangerouslySetInnerHTML={{ __html: formatInline(line.substring(2)) }} />
              </li>
            )
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <li key={idx} className="ml-4 list-decimal text-ink-800 font-medium">
                <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, '')) }} />
              </li>
            )
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-brand-500 pl-3 py-1 my-2 bg-brand-50/50 text-brand-900 text-xs rounded-r">
                <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace('> ', '')) }} />
              </blockquote>
            )
          }
          return (
            <p key={idx}>
              <span dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
            </p>
          )
        })}
      </div>
    )
  }

  const formatInline = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-ink-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
  }

  return (
    <Layout preview={false}>
      <Container>
        <Head>
          <title>Awadh Mitr — AI Civic Copilot | Lucknow</title>
          <meta
            name="description"
            content="Ask questions about Lucknow Municipal Corporation (LMC), house tax, water supply, electricity, metro and civic bylaws."
          />
        </Head>

        <div className="max-w-3xl mx-auto pt-8 pb-20">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-brand-700 text-white font-bold text-sm shadow">
                  अ
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-ink-900">
                  Awadh Mitr <span className="text-brand-700 font-normal text-lg">(अवध मित्र)</span>
                </h1>
                <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI Civic Copilot
                </span>
              </div>
              <p className="text-xs text-ink-500">
                Official Municipal Procedures · Multi-Department Directory · Bilingual (English & हिंदी)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessages([messages[0]])
              }}
              className="text-xs text-ink-500 hover:text-black border border-ink-200 rounded px-2.5 py-1 hover:bg-ink-50 transition-colors"
            >
              Clear chat
            </button>
          </div>

          {/* Quick Prompt Pills */}
          <div className="mb-6">
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-2">
              Common Citizen Inquiries:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  disabled={loading}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-900 transition-colors shadow-2xs text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4 mb-6 min-h-[350px]">
            {messages.map(m => {
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-xl p-4 shadow-2xs ${
                      isUser
                        ? 'bg-black text-white rounded-br-none'
                        : 'bg-white border border-ink-200 text-ink-800 rounded-bl-none'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-ink-100">
                        <span className="text-xs font-bold text-brand-800 uppercase tracking-wide">
                          Awadh Mitr
                        </span>
                        <span className="text-[10px] text-ink-400">· Civic Assistant</span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      renderFormattedText(m.content)
                    )}

                    {/* Helplines and Portals Section on Assistant Bubbles */}
                    {!isUser && m.helplines && m.helplines.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-ink-100">
                        <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider block mb-1.5">
                          Direct Contact & Emergency Helplines:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {m.helplines.map((h, i) => (
                            <a
                              key={i}
                              href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 rounded text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                              <span>📞</span>
                              <span>{h.name}:</span>
                              <strong className="font-mono">{h.number}</strong>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isUser && m.portals && m.portals.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex flex-wrap gap-2">
                          {m.portals.map((p, i) => (
                            <a
                              key={i}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 underline font-medium"
                            >
                              <span>🔗</span> {p.name} →
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-ink-200 rounded-xl rounded-bl-none p-4 shadow-2xs max-w-[80%]">
                  <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-brand-600 animate-ping" />
                    Awadh Mitr is consulting Lucknow municipal knowledge base…
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Input Bar */}
          <form onSubmit={onSubmit} className="sticky bottom-4 bg-white/95 backdrop-blur border border-ink-300 rounded-lg p-2 shadow-lg flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about Lucknow civic rules, house tax, water supply, ward corporators…"
              disabled={loading}
              className={`${INPUT} border-0 focus:ring-0 text-sm`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`${PRIMARY_BTN} text-xs py-2 px-5 shrink-0 rounded`}
            >
              {loading ? 'Asking…' : 'Ask Mitr'}
            </button>
          </form>

          <p className="text-[11px] text-ink-400 text-center mt-3">
            Awadh Mitr provides automated civic guidance based on published UP Government & LMC regulations. For official disputed matters, consult your Zonal Officer.
          </p>
        </div>
      </Container>
    </Layout>
  )
}
