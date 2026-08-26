import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import cn from 'classnames'
import AuthButton from './auth-button'
import Container from './container'
import WardMark from './ward-mark'
import { isNavGroup, NAV_LINKS, NavGroup } from '../lib/tools'
import { useIsAdmin } from '../lib/useIsAdmin'

// z-index has to clear Leaflet's panes (max 700) and controls (1000), because
// pages like /profile embed a map underneath this sticky bar.
const NAV_Z = 'z-[1100]'

const NavDropdown = ({
  group,
  isActive,
}: {
  group: NavGroup
  isActive: (href: string) => boolean
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLLIElement>(null)
  const groupActive = group.items.some(item => isActive(item.href))

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <li ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-1 py-1 text-sm border-b-2 transition-colors duration-200',
          groupActive
            ? 'font-semibold text-ink-900 border-accent-500'
            : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-ink-300'
        )}
      >
        {group.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn('transition-transform', open && 'rotate-180')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[180px] rounded-md border border-ink-200 bg-white py-1.5 shadow-lg">
          {group.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'block px-3.5 py-2 text-sm transition-colors',
                isActive(item.href)
                  ? 'font-semibold text-ink-900 bg-ink-50'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </li>
  )
}

const AdminLink = ({ className }: { className: string }) => (
  <Link href="/admin" className={className}>
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
    >
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
    </svg>
    Admin
  </Link>
)

const Navbar = () => {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = useIsAdmin()

  // A tap on a link inside the open mobile menu should navigate *and* close it.
  useEffect(() => {
    const close = () => setMenuOpen(false)
    router.events.on('routeChangeComplete', close)
    return () => router.events.off('routeChangeComplete', close)
  }, [router.events])

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(`${href}/`)

  return (
    <header
      className={cn(
        'sticky top-0 bg-white/95 backdrop-blur border-b-2 border-brand-700',
        NAV_Z
      )}
    >
      <Container>
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <WardMark size={28} />
            <span className="font-display text-xl font-bold tracking-tight text-ink-900">
              Lucknow
            </span>
            <span className="hidden sm:inline text-sm text-ink-500">
              civic data
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {NAV_LINKS.map(entry =>
                isNavGroup(entry) ? (
                  <NavDropdown key={entry.label} group={entry} isActive={isActive} />
                ) : (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      aria-current={isActive(entry.href) ? 'page' : undefined}
                      className={cn(
                        'py-1 text-sm border-b-2 transition-colors duration-200',
                        isActive(entry.href)
                          ? 'font-semibold text-ink-900 border-accent-500'
                          : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-ink-300'
                      )}
                    >
                      {entry.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          <div className="hidden md:flex md:items-center md:gap-3">
            {isAdmin && (
              <AdminLink className="flex items-center gap-1.5 rounded-md border border-brand-700 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50" />
            )}
            <AuthButton isAdmin={isAdmin} />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 -mr-2 rounded-md text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div id="mobile-nav" className="md:hidden border-t border-ink-200">
          <Container>
            <nav aria-label="Main">
              <ul className="py-2">
                {NAV_LINKS.map(entry =>
                  isNavGroup(entry) ? (
                    <li key={entry.label} className="pt-3 first:pt-0">
                      <div className="pl-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        {entry.label}
                      </div>
                      <ul>
                        {entry.items.map(item => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={isActive(item.href) ? 'page' : undefined}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                'block py-3 pl-3 border-l-2 transition-colors',
                                isActive(item.href)
                                  ? 'font-semibold text-ink-900 border-accent-500 bg-ink-50'
                                  : 'border-transparent text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                              )}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        aria-current={isActive(entry.href) ? 'page' : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'block py-3 pl-3 border-l-2 transition-colors',
                          isActive(entry.href)
                            ? 'font-semibold text-ink-900 border-accent-500 bg-ink-50'
                            : 'border-transparent text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                        )}
                      >
                        {entry.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </nav>
            {isAdmin && (
              <AdminLink className="flex items-center gap-1.5 border-t border-ink-200 py-3 pl-3 text-sm font-semibold text-brand-700" />
            )}
            <div className="py-4">
              <AuthButton isAdmin={isAdmin} />
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}

export default Navbar
