import Link from 'next/link'
import Reveal from './reveal'
import { TOOLS } from '../lib/tools'

// The full list, always visible — the picker above is a shortcut, not a gate.
const ToolDirectory = () => {
  return (
    <section id="tools" className="mb-20 scroll-mt-24 md:mb-28">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
        The directory
      </p>
      <h2 className="mb-8 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
        Everything here
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {TOOLS.map((tool, i) => (
          <Reveal
            key={tool.id}
            // Nudging each card's transition slightly later makes the grid
            // arrive as a wave rather than all at once.
            className={i % 2 === 1 ? '[transition-delay:90ms]' : undefined}
          >
            <Link
              href={tool.href}
              className="card-mark group flex h-full flex-col rounded-md border border-ink-200 bg-white p-6 pl-7"
            >
              <h3 className="mb-2 font-display text-xl font-bold tracking-tight text-ink-900 transition-colors group-hover:text-brand-800 md:text-2xl">
                {tool.name}
              </h3>
              <p className="mb-6 leading-relaxed text-ink-600">{tool.blurb}</p>
              <span className="mt-auto inline-flex items-center text-sm font-semibold text-brand-700">
                {tool.cta}
                <svg
                  className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default ToolDirectory
