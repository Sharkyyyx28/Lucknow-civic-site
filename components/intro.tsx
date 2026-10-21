import { useEffect, useState } from 'react'
import Link from 'next/link'
import CountUp from './count-up'
import HeroBackdrop from './hero-backdrop'
import LucknowCorpMap from './lucknow-map-hero'
import type { CityAqiSummary } from '../lib/aqi'

const STATS: Array<[string, string]> = [
  ['9', 'assembly constituencies'],
  ['1', 'municipal corporation'],
  ['2', 'metro lines'],
  ['33', 'metro stations'],
]

// Sibling stagger classes, applied in order to the stat figures.
const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4']

// Registration marks, the way a printed sheet is trimmed. Two hairlines per
// corner rather than a full border, so the map reads as something laid on the
// page instead of something boxed in.
const TICKS = [
  'left-0 top-0 border-l-2 border-t-2',
  'right-0 top-0 border-r-2 border-t-2',
  'left-0 bottom-0 border-l-2 border-b-2',
  'right-0 bottom-0 border-r-2 border-b-2',
]

const Intro = () => {
  const [aqi, setAqi] = useState<CityAqiSummary | null>(null)

  useEffect(() => {
    fetch('/api/aqi')
      .then(r => r.json())
      .then(setAqi)
      .catch(() => {})
  }, [])

  // The height is capped as well as proportional: on a tall or zoomed-out
  // viewport a bare 88vh opens a screen-deep empty band under the type.
  return (
    <section className="relative flex min-h-[min(88vh,900px)] items-center overflow-hidden border-b border-ink-200 bg-ink-50">
      {/* The sheet this is printed on. The graticule is full-bleed, but the
          contours and scale bar belong to the content column — pinned to the
          section they stranded themselves hundreds of pixels off the text on a
          wide display. `container` here so the hero lines up with the
          Container the rest of the page uses. */}
      <div className="pointer-events-none absolute inset-0 bg-graticule" aria-hidden="true" />

      <div className="container relative mx-auto px-5 py-20">
        <HeroBackdrop />

        <div className="relative z-10 grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="animate-fadeInUp space-y-7">
            {/* A filing tag rather than a pill — squared off, ruled on the
                left, the way a register entry is labelled. */}
            <div className="flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2.5 border-l-2 border-accent-500 bg-white py-1.5 pl-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800 shadow-sm">
                Officials · Metro · Community
              </p>
              {aqi && (
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-sm hover:border-brand-500 transition-colors"
                  title={aqi.advisory}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: aqi.color }}
                  />
                  <span>
                    Lucknow AQI <strong className="font-semibold text-ink-900">{aqi.cityAqi}</strong> ({aqi.category})
                  </span>
                </Link>
              )}
            </div>

            {/* Sized to what the left column can actually hold at each
                breakpoint — "Lucknow civic data," runs about 10.3x the font
                size, so anything larger breaks after "civic" and the intended
                two-line shape becomes three. */}
            <h1 className="font-display text-5xl font-bold leading-[1.06] tracking-tight text-ink-900 md:text-6xl xl:text-[3.5rem] 2xl:text-[4.25rem]">
              Lucknow civic data,
              <br />
              <span className="marker">in one place.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink-600">
              Who represents Lucknow, the metro network, and neighbourhood
              amenities — gathered from public sources and made searchable.
              A free, open project by Aditya.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/map"
                className="group inline-flex items-center justify-center rounded-md bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
              >
                Open the map
                <svg
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
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
                className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-6 py-3.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
              >
                Browse everything
              </Link>
            </div>

            {/* The figures, set as a ruled register strip: divided cells
                between two rules, rather than four numbers floating. */}
            {/* gap-px over an ink-200 ground is what draws the dividers: it
                stays correct at both column counts, which per-cell borders do
                not once the grid wraps. */}
            <dl className="grid grid-cols-2 gap-px border-y border-ink-200 bg-ink-200 sm:grid-cols-4">
              {STATS.map(([value, label], i) => (
                <div key={label} className="bg-ink-50 px-4 py-5 sm:px-5">
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <CountUp
                      value={value}
                      className={`block animate-fadeInUp font-display text-3xl font-bold tabular-nums tracking-tight text-brand-800 opacity-0 md:text-4xl ${STAGGER[i]}`}
                    />
                    <span className="mt-1.5 block text-xs uppercase tracking-[0.08em] text-ink-500">
                      {label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The corporation outline, presented as a sheet pinned to the page
              rather than a loose graphic. */}
          <div className="hidden lg:block">
            <figure className="relative mx-auto w-fit">
              {TICKS.map(tick => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className={`absolute h-5 w-5 border-accent-500 ${tick}`}
                />
              ))}
              <div className="border border-ink-200 bg-white p-6 shadow-sheet">
                <LucknowCorpMap />
                <figcaption className="mt-2 border-t border-ink-100 pt-3 text-center text-[11px] uppercase tracking-[0.16em] text-ink-500">
                  Stylised outline · not a traced boundary
                </figcaption>
              </div>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Intro
