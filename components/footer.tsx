import Container from './container'
import WardMark from './ward-mark'

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t-2 border-brand-700 bg-brand-50">
      {/* Echoes the hero mark, faded down to a watermark — the band should
          still read as the same printed map, just closing the page out. */}
      <WardMark
        size={340}
        className="pointer-events-none absolute -right-16 -top-24 opacity-[0.05] lg:-right-8"
      />
      <Container>
        <div className="relative py-16 md:py-20 flex flex-col lg:flex-row lg:items-center">
          <div className="lg:w-1/2 lg:pr-10 mb-10 lg:mb-0 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-4">
              <WardMark size={26} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
                Lucknow civic data
              </span>
            </div>
            <h3 className="font-display text-3xl lg:text-[2.5rem] font-bold tracking-tight leading-tight text-ink-900">
              A part of <span className="marker">Neubitat Initiatives</span>
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 lg:justify-end lg:w-1/2 lg:border-l lg:border-brand-700/15 lg:pl-10">
            <a
              href="https://neubitat.com/"
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-brand-700 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              Know More
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a
              href="https://neubitat.com/contact"
              className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-8 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-100 hover:text-ink-900"
            >
              Get involved
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
