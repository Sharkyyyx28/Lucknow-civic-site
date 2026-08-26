import { useState } from 'react'
import Link from 'next/link'
import Reveal from './reveal'
import { INTENTS, toolById } from '../lib/tools'

// Asks the visitor what they came for and points them at one tool instead of
// making them read the whole directory. Everything it can recommend is also
// listed further down the page, so this is a shortcut, never the only route.
const IntentFinder = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = INTENTS.find(i => i.id === selectedId) ?? null
  const primary = selected ? toolById(selected.primary) : null
  const secondary = selected?.secondary ? toolById(selected.secondary) : null

  return (
    <Reveal className="mb-20 mt-16 md:mb-28 md:mt-20">
      <section className="rounded-md border border-ink-200 border-l-4 border-l-accent-500 bg-white p-6 md:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
          Start here
        </p>
        <h2
          id="intent-question"
          className="mb-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 md:text-3xl"
        >
          What brings you here?
        </h2>
        <p className="mb-6 text-ink-600">
          Pick the closest one and we&apos;ll point you at the right page.
        </p>

        <div
          role="group"
          aria-labelledby="intent-question"
          className="flex flex-wrap gap-3"
        >
          {INTENTS.map(intent => {
            const isSelected = intent.id === selectedId
            return (
              <button
                key={intent.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : intent.id)}
                className={`rounded-md border px-4 py-3 text-left text-sm transition-colors md:text-base ${
                  isSelected
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-ink-200 bg-ink-50 text-ink-700 hover:border-brand-400 hover:bg-brand-50 hover:text-ink-900'
                }`}
              >
                {intent.label}
              </button>
            )
          })}
        </div>

        {selected && primary && (
          <div
            aria-live="polite"
            className="mt-8 animate-fadeIn border-t border-ink-200 pt-8"
          >
            <p className="mb-6 max-w-3xl text-lg leading-relaxed text-ink-700">
              {selected.answer}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={primary.href}
                className="inline-flex items-center justify-center rounded-md bg-brand-700 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                {primary.cta} →
              </Link>
              {secondary && (
                <Link
                  href={secondary.href}
                  className="text-sm font-semibold text-ink-600 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-brand-700"
                >
                  or try {secondary.name}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </Reveal>
  )
}

export default IntentFinder
