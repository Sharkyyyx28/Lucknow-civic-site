import Link from 'next/link'
import Reveal from './reveal'
import ToolIcon from './tool-icon'
import { TOOLS, Tool } from '../lib/tools'

const Arrow = ({ className = '' }: { className?: string }) => (
  <svg
    className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${className}`}
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
)

/** Entry number, set the way a register numbers its rows. */
const EntryNo = ({ n, className }: { n: number; className: string }) => (
  <span
    aria-hidden="true"
    className={`font-display text-xs font-bold tabular-nums tracking-[0.16em] ${className}`}
  >
    {String(n).padStart(2, '0')}
  </span>
)

// The map is the reason most people arrive, so it gets the wide entry at the
// head of the register rather than an equal share of a seven-card grid.
const Featured = ({ tool }: { tool: Tool }) => (
  <Reveal className="mb-5 md:mb-6">
    <Link
      href={tool.href}
      className="group relative flex flex-col overflow-hidden rounded-md border border-brand-200 bg-brand-800 p-7 text-brand-100 transition-colors hover:bg-brand-900 md:flex-row md:items-center md:gap-10 md:p-10"
    >
      {/* The same ruled ground as the hero, held back so the type stays first. */}
      <div
        className="pointer-events-none absolute inset-0 bg-graticule opacity-[0.07]"
        aria-hidden="true"
      />

      <div className="relative flex-1">
        <div className="mb-4 flex items-center gap-3">
          <EntryNo n={1} className="text-accent-300" />
          <span className="h-px w-8 bg-brand-500" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-300">
            Start here
          </span>
        </div>
        <h3 className="mb-3 font-display text-2xl font-bold tracking-tight text-white md:text-4xl">
          {tool.name}
        </h3>
        <p className="mb-6 max-w-2xl leading-relaxed text-brand-200">
          {tool.blurb}
        </p>
        <span className="inline-flex items-center gap-2 border-b-2 border-accent-500 pb-1 text-sm font-semibold text-white">
          {tool.cta}
          <Arrow />
        </span>
      </div>

      <div className="relative mt-8 shrink-0 md:mt-0">
        <ToolIcon
          id={tool.id}
          className="h-24 w-24 text-brand-400 transition-colors group-hover:text-accent-400 md:h-32 md:w-32"
        />
      </div>
    </Link>
  </Reveal>
)

const Card = ({ tool, n, delay }: { tool: Tool; n: number; delay: boolean }) => (
  <Reveal className={delay ? '[transition-delay:90ms]' : undefined}>
    <Link
      href={tool.href}
      className="card-mark group flex h-full flex-col rounded-md border border-ink-200 bg-white p-6 pl-7"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-brand-700 transition-colors group-hover:border-accent-300 group-hover:bg-accent-50 group-hover:text-accent-700">
          <ToolIcon id={tool.id} className="h-6 w-6" />
        </span>
        <EntryNo n={n} className="mt-1 text-ink-300" />
      </div>

      <h3 className="mb-2 font-display text-xl font-bold tracking-tight text-ink-900 transition-colors group-hover:text-brand-800">
        {tool.name}
      </h3>
      <p className="mb-6 text-[0.95rem] leading-relaxed text-ink-600">
        {tool.blurb}
      </p>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        {tool.cta}
        <Arrow />
      </span>
    </Link>
  </Reveal>
)

// The full list, always visible — the picker above is a shortcut, not a gate.
const ToolDirectory = () => {
  const [featured, ...rest] = TOOLS

  return (
    <section id="tools" className="mb-20 scroll-mt-24 md:mb-28">
      <div className="mb-9 max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          The directory
        </p>
        <h2 className="mb-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
          Everything here
        </h2>
        <p className="text-lg leading-relaxed text-ink-600">
          Every tool on the site, in the order most people need them — the
          map first, the background reading last.
        </p>
      </div>

      {featured && <Featured tool={featured} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {rest.map((tool, i) => (
          <Card key={tool.id} tool={tool} n={i + 2} delay={i % 2 === 1} />
        ))}
      </div>
    </section>
  )
}

export default ToolDirectory
