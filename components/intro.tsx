import Link from 'next/link'
import CountUp from './count-up'
import LucknowCorpMap from './lucknow-map-hero'

const STATS: Array<[string, string]> = [
  ['9', 'assembly constituencies'],
  ['1', 'municipal corporation'],
  ['2', 'metro lines'],
  ['33', 'metro stations'],
]

// Sibling stagger classes, applied in order to the stat figures.
const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4']

const Intro = () => {
  return (
    <section className="relative flex min-h-[86vh] items-center overflow-hidden border-b border-ink-200 bg-ink-50">

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-fadeInUp space-y-8">
            {/* A filing tag rather than a pill — squared off, ruled on the
                left, the way a register entry is labelled. */}
            <p className="inline-flex items-center gap-2.5 border-l-2 border-brand-600 bg-white py-1.5 pl-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
              Officials · Metro · Community
            </p>

            <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-ink-900 md:text-6xl lg:text-[4.25rem]">
              Lucknow civic data,
              <br />
              <span className="marker">in one place.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink-600">
              Who represents Lucknow, the metro network, and neighbourhood
              amenities — gathered from public sources and made searchable.
              A free, open project by{' '}
              <a
                href="https://neubitat.com/"
                className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-800 hover:decoration-brand-600"
              >
                Neubitat
              </a>
              .
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/map"
                className="inline-flex items-center justify-center rounded-md bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Open the map
                <svg
                  className="ml-2 h-4 w-4"
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
              </Link>
              <Link
                href="#tools"
                className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-100 hover:text-ink-900"
              >
                Browse everything
              </Link>
            </div>

            <dl className="flex flex-wrap gap-x-10 gap-y-5 border-t border-ink-200 pt-8">
              {STATS.map(([value, label], i) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <CountUp
                      value={value}
                      className={`block animate-fadeInUp font-display text-3xl font-bold tabular-nums tracking-tight text-brand-800 opacity-0 ${STAGGER[i]}`}
                    />
                    <span className="mt-1 block text-sm text-ink-500">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Lucknow corporation boundaries map — draws on page load. */}
          <div className="hidden justify-center lg:flex lg:justify-end">
            <LucknowCorpMap />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Intro
