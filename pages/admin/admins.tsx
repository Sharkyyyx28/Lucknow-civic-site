import { FormEvent, useState } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]'
import { isAdmin, listAdmins, type AdminEntry } from '../../lib/admin'
import Layout from '../../components/layout'

interface Props {
  signedIn: boolean
  authorized: boolean
  email: string | null
  admins: AdminEntry[]
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  const email = session?.user?.email ?? null
  const authorized = email ? await isAdmin(email) : false
  return {
    props: {
      signedIn: Boolean(email),
      authorized,
      email,
      admins: authorized ? await listAdmins() : [],
    },
  }
}

const FIELD = 'w-full border border-ink-300 px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none'
const PRIMARY_BTN =
  'bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold py-2 px-5 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none'

export default function AdminAdminsPage({ signedIn, authorized, email, admins: initialAdmins }: Props) {
  const { data: session } = useSession()
  const [admins, setAdmins] = useState(initialAdmins)

  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add admin')
      setAdmins(data.admins ?? [])
      setNewEmail('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add admin')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (targetEmail: string) => {
    setRemoving(targetEmail)
    setRemoveError(null)
    try {
      const res = await fetch(`/api/admins/${encodeURIComponent(targetEmail)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to remove admin')
      }
      setAdmins(prev => prev.filter(a => a.email !== targetEmail))
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove admin')
    } finally {
      setRemoving(null)
      setConfirmRemove(null)
    }
  }

  return (
    <Layout preview={false}>
      <div className="px-5">
        <Head><title>Manage admins | Admin | Lucknow</title></Head>

        <div className="pb-24 pt-10 md:pt-14">
          <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-900 hover:underline">
            ← Admin
          </Link>

          <h1 className="mb-4 mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-4xl">
            Admins
          </h1>

          {!signedIn && (
            <div>
              <p className="mb-6 text-lg leading-relaxed text-ink-600">
                Sign in to check whether your account has admin access.
              </p>
              <button onClick={() => signIn('google')} className={PRIMARY_BTN}>
                Sign in with Google
              </button>
            </div>
          )}

          {signedIn && !authorized && (
            <p className="text-lg leading-relaxed text-ink-600">
              {email} does not have admin access. Ask an existing admin to add this email
              below.
            </p>
          )}

          {authorized && (
            <>
              <ul className="mt-6 divide-y divide-ink-100 border-y border-ink-200">
                {admins.map(a => {
                  const isSelf = a.email === session?.user?.email
                  return (
                    <li key={a.email} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {a.email}
                          {isSelf && <span className="ml-2 font-normal text-ink-400">(you)</span>}
                        </p>
                        <p className="text-xs text-ink-500">
                          {a.source === 'env'
                            ? 'Set via the ADMIN_EMAILS env var — remove it there to revoke'
                            : `Added by ${a.addedBy}`}
                        </p>
                      </div>
                      {a.source === 'database' && (
                        <div className="flex shrink-0 items-center gap-3 text-xs">
                          {confirmRemove === a.email ? (
                            <>
                              <span className="text-ink-500">
                                {isSelf ? 'Remove your own access?' : 'Remove?'}
                              </span>
                              <button
                                onClick={() => handleRemove(a.email)}
                                disabled={removing === a.email}
                                className="font-bold text-red-600 hover:underline disabled:opacity-40"
                              >
                                {removing === a.email ? 'Removing…' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="text-ink-500 hover:text-ink-900 hover:underline"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(a.email)}
                              className="text-ink-500 hover:text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {removeError && <p className="mt-3 text-sm text-red-600">{removeError}</p>}

              <form onSubmit={handleAdd} className="mt-8 flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Add an admin
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={FIELD}
                  />
                </div>
                <button type="submit" disabled={adding || !newEmail.trim()} className={PRIMARY_BTN}>
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </form>
              {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
              <p className="mt-2 text-xs text-ink-500">
                Anyone added here gets full admin access — the same as you have.
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
