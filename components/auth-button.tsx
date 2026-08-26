import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('')
}

const AuthButton = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const { data: session, status } = useSession()
  const [imgFailed, setImgFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  if (status === 'loading') {
    return null
  }

  if (session?.user) {
    const avatar =
      session.user.image && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user.name ?? 'User avatar'}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-bold">
          {initials(session.user.name)}
        </span>
      )

    return (
      <div ref={rootRef} className="relative text-sm">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          className="flex items-center gap-2 py-1 rounded-md hover:bg-ink-50 transition-colors"
        >
          {avatar}
          <span className="hidden sm:inline text-ink-600">
            {session.user.name}
          </span>
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
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 min-w-[160px] rounded-md border border-ink-200 bg-white py-1.5 shadow-lg">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 text-ink-700 hover:text-brand-700 hover:bg-ink-50 transition-colors"
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2 text-ink-700 hover:text-brand-700 hover:bg-ink-50 transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="block w-full text-left px-3.5 py-2 text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-md text-sm font-semibold transition-colors"
    >
      Sign in with Google
    </button>
  )
}

export default AuthButton
