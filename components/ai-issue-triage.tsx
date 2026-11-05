import { useState, useRef, ChangeEvent } from 'react'
import type { PostCategory } from '../lib/communityTypes'
import type { TriageResult, IssueSeverity } from '../lib/ai/issueTriage'

interface Props {
  lat: number | null
  lng: number | null
  wardName: string
  currentTitle: string
  currentBody: string
  onApplySuggestions: (title: string, body: string, category: PostCategory) => void
}

const SEVERITY_BADGES: Record<IssueSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical Hazard', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { label: 'High Priority', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { label: 'Medium Priority', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  low: { label: 'Low / Routine', bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
}

export default function AiIssueTriage({
  lat,
  lng,
  wardName,
  currentTitle,
  currentBody,
  onApplySuggestions,
}: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<TriageResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedJansunwai, setCopiedJansunwai] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP).')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file is too large (maximum 8MB).')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      // Automatically trigger triage once photo is loaded
      runTriage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const runTriage = async (base64Image?: string) => {
    const img = base64Image || imagePreview || undefined
    const desc = (currentBody || currentTitle || '').trim() || undefined

    if (!img && !desc) {
      setError('Please upload an issue photo or type a few words first.')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/triage-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: img,
          description: desc,
          lat: lat || undefined,
          lng: lng || undefined,
          wardName: wardName || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Could not analyze issue.')
      }

      const data: TriageResult = await res.json()
      setResult(data)
    } catch {
      setError('AI triage service is temporarily unavailable. You can still fill out the form manually.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onApplySuggestions(result.suggestedTitle, result.suggestedBody, result.category)
  }

  const copyJansunwai = () => {
    if (!result) return
    navigator.clipboard.writeText(result.jansunwaiDraft)
    setCopiedJansunwai(true)
    setTimeout(() => setCopiedJansunwai(false), 2500)
  }

  const clearImage = () => {
    setImagePreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 mb-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white font-bold text-xs">
            ⚡
          </span>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-brand-900">
            AI Civic Inspector & Photo Triage
          </h3>
        </div>
        <span className="text-[10px] font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Vision & Routing Agent
        </span>
      </div>

      <p className="text-xs text-brand-900/80 mb-4 leading-relaxed">
        Upload a photo of the civic problem (pothole, garbage heap, broken streetlight, sewer leak) or let the AI analyze your draft to detect severity and the responsible Lucknow municipal authority.
      </p>

      {/* Upload button & thumbnail */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          id="civic-photo-upload"
        />
        <label
          htmlFor="civic-photo-upload"
          className="cursor-pointer inline-flex items-center gap-2 rounded border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-2xs hover:bg-brand-50 hover:border-brand-500 transition-colors"
        >
          📷 {imagePreview ? 'Change Photo' : 'Upload / Snap Photo'}
        </label>

        {imagePreview && (
          <button
            type="button"
            onClick={clearImage}
            className="text-xs text-red-600 hover:text-red-800 hover:underline"
          >
            Remove photo
          </button>
        )}

        <button
          type="button"
          onClick={() => runTriage()}
          disabled={analyzing}
          className="inline-flex items-center gap-1.5 rounded bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-900 disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Inspecting...' : '⚡ Analyze with AI'}
        </button>
      </div>

      {imagePreview && (
        <div className="mb-4">
          <div className="relative inline-block border-2 border-brand-300 rounded-lg overflow-hidden max-h-48 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Issue preview" className="object-cover max-h-48 w-auto rounded" />
          </div>
        </div>
      )}

      {analyzing && (
        <div className="p-3 bg-white border border-brand-200 rounded-lg flex items-center gap-2 text-xs text-brand-800 font-medium mb-3">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-600 animate-ping" />
          AI is analyzing photo pixels, identifying civic hazard, and matching Lucknow authority...
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      {/* Triage Results Card */}
      {result && !analyzing && (
        <div className="rounded-lg border border-brand-300 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  SEVERITY_BADGES[result.severity]?.bg || 'bg-ink-100'
                } ${SEVERITY_BADGES[result.severity]?.text || 'text-ink-800'} ${
                  SEVERITY_BADGES[result.severity]?.border || 'border-ink-200'
                }`}
              >
                ● {SEVERITY_BADGES[result.severity]?.label || result.severity} (Score: {result.severityScore}/5)
              </span>
              <span className="text-xs font-semibold text-ink-700 capitalize">
                Category: {result.subcategory.replace('_', ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 rounded bg-black px-3 py-1 text-xs font-bold text-white hover:bg-ink-800 transition-colors"
            >
              ✓ Apply Suggestions to Form
            </button>
          </div>

          <p className="text-xs text-ink-700 leading-relaxed">
            <strong>Hazard Assessment:</strong> {result.severityReason}
          </p>

          {result.detectedHazards && result.detectedHazards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Hazards:</span>
              {result.detectedHazards.map((h, i) => (
                <span key={i} className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium">
                  ⚠️ {h}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-ink-100 text-xs">
            <span className="text-ink-500 font-semibold">Responsible Lucknow Body: </span>
            <strong className="text-brand-900">{result.responsibleAgency}</strong>
            <span className="ml-2 text-ink-500">(Helpline: <strong className="font-mono text-ink-800">{result.helpline}</strong>)</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={copyJansunwai}
              className="inline-flex items-center gap-1.5 rounded border border-ink-300 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-white transition-colors"
            >
              📋 {copiedJansunwai ? 'Copied Formal Letter!' : 'Copy UP Jansunwai Grievance Letter'}
            </button>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.tweetDraft)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-ink-300 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-white transition-colors"
            >
              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Escalate on X/Twitter
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
