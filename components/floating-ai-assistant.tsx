import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function FloatingAiAssistant() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Don't show floating trigger if user is already on the dedicated /ask page
  if (router.pathname === '/ask') return null

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div className="w-80 rounded-xl border border-brand-300 bg-white p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-ink-100 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 font-bold text-xs text-white">
                अ
              </span>
              <div>
                <h4 className="text-xs font-bold text-ink-900 leading-tight">Awadh Mitr</h4>
                <p className="text-[10px] text-ink-500">Lucknow Civic Copilot</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-400 hover:text-ink-700 text-sm font-bold p-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-ink-700 mb-3 leading-relaxed">
            Need help with Lucknow house tax, water supply, non-working streetlights, or corporator contacts?
          </p>

          <div className="space-y-1.5 mb-3">
            <Link
              href="/ask"
              className="block rounded border border-ink-200 bg-ink-50/60 p-2 text-xs text-ink-800 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              💬 Ask a civic question →
            </Link>
            <Link
              href="/find-my-ward"
              className="block rounded border border-ink-200 bg-ink-50/60 p-2 text-xs text-ink-800 hover:border-brand-500 hover:bg-brand-50/50 transition-colors"
            >
              📍 Find your ward & corporator →
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink-100 text-[10px] text-ink-400">
            <span>Helpline: <strong className="text-ink-700 font-mono">1533</strong></span>
            <Link href="/ask" className="text-brand-700 font-semibold hover:underline">
              Open Full Chat →
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-brand-300 bg-white/95 px-4 py-2.5 text-xs font-semibold text-brand-900 shadow-xl backdrop-blur hover:bg-brand-50 hover:border-brand-500 hover:scale-105 transition-all duration-200"
          aria-label="Ask Awadh Mitr AI"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white font-bold text-xs shadow-xs">
            अ
          </span>
          <span className="font-display">Ask Awadh Mitr</span>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold text-brand-800 uppercase tracking-wider">
            AI
          </span>
        </button>
      )}
    </div>
  )
}
