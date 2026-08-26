import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// Client-side check the header uses to decide whether to show the admin
// shortcut. Hits /api/admin-status rather than embedding the flag in the
// session JWT, so admin access changes (added/removed via /admin/admins)
// take effect without forcing a re-login.
export function useIsAdmin(): boolean {
  const { data: session } = useSession()
  const email = session?.user?.email
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!email) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    fetch('/api/admin-status')
      .then(res => (res.ok ? res.json() : { isAdmin: false }))
      .then(data => {
        if (!cancelled) setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  return isAdmin
}
