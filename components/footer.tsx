import Link from 'next/link'
import Container from './container'
import WardMark from './ward-mark'
import { isNavGroup, NAV_LINKS } from '../lib/tools'

// Flattens the navbar's groups, so the footer lists every destination without
// the site map having to be written out a second time.
const ALL_LINKS = NAV_LINKS.flatMap(entry =>
  isNavGroup(entry) ? entry.items : [entry]
)

const EXTERNAL = [
  { label: 'Source on GitHub', href: 'https://github.com/Sharkyyyx28/Lucknow-civic-site' },
  { label: 'Know about Sharkyyyx28', href: 'https://sharkyyyx28.space' },
]

const Footer = () => {
  return (
    <footer className="border-t-2 border-brand-700 bg-brand-900 text-brand-200">
      <Container>
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <WardMark size={28} />
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Lucknow
              </span>
              <span className="text-sm text-brand-300">civic data</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed">
              Public data about Lucknow — who represents it, how it moves, and
              what its residents are reporting — gathered in one place and free
              to use.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-300">
              Explore
            </h2>
            <ul className="space-y-2.5 text-sm">
              {ALL_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-300">
              About
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/posts/about-lucknow"
                  className="transition-colors hover:text-white"
                >
                  About this project
                </Link>
              </li>
              {EXTERNAL.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-brand-800 py-6 text-sm sm:flex-row">
          <span>
            A free, open project by{' '}
            <span className="font-semibold text-white">Aditya</span>.
          </span>
          <span>
            Built by{' '}
            <a
              href="https://github.com/Sharkyyyx28"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white hover:underline"
            >
              Sharkyyyx28
            </a>
          </span>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
