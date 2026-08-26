import { FormEvent, useMemo, useState } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]'
import { isAdmin } from '../../lib/admin'
import { listSocialHandles } from '../../lib/socialHandles'
import {
  HANDLE_CATEGORIES,
  HANDLE_CATEGORY_LABELS,
  type HandleCategory,
  type HandleCheckStatus,
  type SocialHandle,
} from '../../lib/socialHandlesTypes'
import Layout from '../../components/layout'

interface Props {
  signedIn: boolean
  authorized: boolean
  email: string | null
  handles: SocialHandle[]
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
      handles: authorized ? await listSocialHandles() : [],
    },
  }
}

const FIELD = 'w-full border border-ink-300 px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400'
const PRIMARY_BTN =
  'bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold py-2 px-5 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none'
const QUIET_BTN = 'text-sm text-ink-500 hover:text-ink-900 hover:underline'

// Labels/colors for HandleCheckStatus — 'unchecked' renders nothing (see
// StatusBadge below), so it has no entry here.
const STATUS_LABEL: Partial<Record<HandleCheckStatus, string>> = {
  ok: 'live',
  not_found: 'not found',
  unknown: 'unverified',
}
const STATUS_CLASS: Partial<Record<HandleCheckStatus, string>> = {
  ok: 'text-green-700',
  not_found: 'font-semibold text-red-600',
  unknown: 'text-amber-600',
}

function StatusBadge({ status }: { status: HandleCheckStatus }) {
  const label = STATUS_LABEL[status]
  if (!label) return null
  return <span className={STATUS_CLASS[status]}> · {label}</span>
}

// A handle counts as "verified" only if every link it actually has came back
// 'ok' on its last check — one dead ('not_found') or unconfirmed ('unknown'/
// 'unchecked') link is enough to put the whole entry in the "needs a look"
// bucket, since that's the entry an admin would actually want to click into.
function isHandleVerified(h: SocialHandle): boolean {
  const statuses = [
    h.x ? h.xStatus : null,
    h.instagram ? h.instagramStatus : null,
    h.website ? h.websiteStatus : null,
  ].filter((s): s is HandleCheckStatus => s !== null)
  return statuses.length > 0 && statuses.every(s => s === 'ok')
}

interface FormValues {
  name: string
  category: HandleCategory
  role: string
  focus: string
  x: string
  instagram: string
  website: string
}

const BLANK_FORM: FormValues = {
  name: '',
  category: 'ngo',
  role: '',
  focus: '',
  x: '',
  instagram: '',
  website: '',
}

function toFormValues(h: SocialHandle): FormValues {
  return { name: h.name, category: h.category, role: h.role, focus: h.focus, x: h.x, instagram: h.instagram, website: h.website }
}

function HandleFormFields({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial: FormValues
  submitLabel: string
  submitting: boolean
  error: string | null
  onSubmit: (values: FormValues) => void
  onCancel?: () => void
}) {
  const [values, setValues] = useState(initial)
  const set = <K extends keyof FormValues>(key: K) => (e: { target: { value: string } }) =>
    setValues(v => ({ ...v, [key]: e.target.value as FormValues[K] }))

  const canSubmit = values.name.trim() && values.focus.trim() && (values.x.trim() || values.instagram.trim() || values.website.trim())

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit(values)
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={LABEL}>Name</label>
          <input value={values.name} onChange={set('name')} maxLength={255} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Category</label>
          <select value={values.category} onChange={set('category')} className={`${FIELD} bg-white`}>
            {HANDLE_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {HANDLE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>Role / title (optional — mainly for individuals)</label>
        <input value={values.role} onChange={set('role')} maxLength={255} className={FIELD} />
      </div>

      <div>
        <label className={LABEL}>Focus — what they work on</label>
        <textarea value={values.focus} onChange={set('focus')} rows={3} maxLength={1000} className={`${FIELD} resize-y`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={LABEL}>X handle (no @)</label>
          <input value={values.x} onChange={set('x')} maxLength={100} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Instagram handle (no @)</label>
          <input value={values.instagram} onChange={set('instagram')} maxLength={100} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Website</label>
          <input value={values.website} onChange={set('website')} placeholder="https://…" maxLength={500} className={FIELD} />
        </div>
      </div>
      <p className="text-xs text-ink-500">At least one of X, Instagram or website is required.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={submitting || !canSubmit} className={PRIMARY_BTN}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={QUIET_BTN}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default function AdminSocialHandlesPage({ signedIn, authorized, email, handles: initialHandles }: Props) {
  const [handles, setHandles] = useState(initialHandles)

  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checkingAll, setCheckingAll] = useState(false)
  const [checkAllError, setCheckAllError] = useState<string | null>(null)

  const verifiedCount = useMemo(() => handles.filter(isHandleVerified).length, [handles])
  const unverifiedCount = handles.length - verifiedCount

  const sections = useMemo(() => {
    const byCategory = new Map<HandleCategory, SocialHandle[]>()
    for (const h of handles) {
      if (!byCategory.has(h.category)) byCategory.set(h.category, [])
      byCategory.get(h.category)!.push(h)
    }
    return HANDLE_CATEGORIES.filter(c => byCategory.has(c)).map(c => ({
      category: c,
      handles: byCategory.get(c)!.sort((a, b) => a.name.localeCompare(b.name)),
    }))
  }, [handles])

  const handleAdd = async (values: FormValues) => {
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/social-handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add')
      setHandles(prev => [...prev, data.handle])
      setAddOpen(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const handleEditSave = async (id: string, values: FormValues) => {
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/social-handles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setHandles(prev => prev.map(h => (h.id === id ? data.handle : h)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/social-handles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete')
      }
      setHandles(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleCheck = async (id: string) => {
    setCheckingId(id)
    setCheckError(null)
    try {
      const res = await fetch(`/api/social-handles/${id}/check`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to check')
      setHandles(prev => prev.map(h => (h.id === id ? data.handle : h)))
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Failed to check')
    } finally {
      setCheckingId(null)
    }
  }

  const handleCheckAll = async () => {
    setCheckingAll(true)
    setCheckAllError(null)
    try {
      const res = await fetch('/api/social-handles/check-all', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to check handles')
      setHandles(data.handles)
    } catch (err) {
      setCheckAllError(err instanceof Error ? err.message : 'Failed to check handles')
    } finally {
      setCheckingAll(false)
    }
  }

  return (
    <Layout preview={false}>
      <div className="px-5">
        <Head><title>Manage social handles | Admin | Lucknow</title></Head>

        <div className="pb-24 pt-10 md:pt-14">
          <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-900 hover:underline">
            ← Admin
          </Link>

          <h1 className="mb-4 mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-4xl">
            Manage social handles
          </h1>

          {!signedIn && (
            <div className="max-w-md">
              <p className="mb-6 text-lg leading-relaxed text-ink-600">
                Sign in to check whether your account has admin access.
              </p>
              <button onClick={() => signIn('google')} className={PRIMARY_BTN}>
                Sign in with Google
              </button>
            </div>
          )}

          {signedIn && !authorized && (
            <p className="max-w-md text-lg leading-relaxed text-ink-600">
              {email} does not have admin access. Ask an existing admin to add this email
              from the{' '}
              <Link href="/admin/admins" className="font-semibold text-brand-700 hover:underline">
                Admins
              </Link>{' '}
              section.
            </p>
          )}

          {authorized && (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <p className="text-ink-500">
                    {handles.length.toLocaleString('en-IN')} {handles.length === 1 ? 'entry' : 'entries'}
                  </p>
                  <p className="text-green-700" title="Every link on this entry last checked as live">
                    <span className="font-semibold">{verifiedCount}</span> verified
                  </p>
                  <p className="text-amber-600" title="Never checked, unconfirmed, or has a dead link">
                    <span className="font-semibold">{unverifiedCount}</span> unverified
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCheckAll}
                    disabled={checkingAll || handles.length === 0}
                    className={QUIET_BTN + ' disabled:opacity-40 disabled:pointer-events-none'}
                  >
                    {checkingAll ? 'Checking all…' : 'Check all'}
                  </button>
                  <button type="button" onClick={() => setAddOpen(v => !v)} className={PRIMARY_BTN}>
                    {addOpen ? 'Cancel' : '+ Add handle'}
                  </button>
                </div>
              </div>
              {checkAllError && <p className="mt-2 text-sm text-red-600">{checkAllError}</p>}

              {addOpen && (
                <div className="mt-6 rounded-md border border-ink-300 bg-white p-5 md:p-6">
                  <h2 className="mb-4 font-display text-lg font-bold tracking-tight text-ink-900">
                    Add a handle
                  </h2>
                  <HandleFormFields
                    key="new"
                    initial={BLANK_FORM}
                    submitLabel="Add handle"
                    submitting={adding}
                    error={addError}
                    onSubmit={handleAdd}
                    onCancel={() => setAddOpen(false)}
                  />
                </div>
              )}

              <div className="mt-10 space-y-10">
                {sections.map(section => (
                  <section key={section.category}>
                    <h2 className="mb-4 font-display text-xl font-bold tracking-tight text-ink-900">
                      {HANDLE_CATEGORY_LABELS[section.category]}
                      <span className="ml-2 text-base font-normal text-ink-400">
                        {section.handles.length}
                      </span>
                    </h2>
                    <ul className="space-y-4">
                      {section.handles.map(handle => {
                        const isEditing = editingId === handle.id
                        return (
                          <li key={handle.id} className="rounded-md border border-ink-200 bg-white p-5">
                            {isEditing ? (
                              <HandleFormFields
                                key={handle.id}
                                initial={toFormValues(handle)}
                                submitLabel="Save"
                                submitting={editSaving}
                                error={editError}
                                onSubmit={values => handleEditSave(handle.id, values)}
                                onCancel={() => {
                                  setEditingId(null)
                                  setEditError(null)
                                }}
                              />
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">
                                    {handle.name}
                                  </h3>
                                  {handle.role && <p className="text-sm text-ink-600">{handle.role}</p>}
                                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{handle.focus}</p>
                                  <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-500">
                                    {handle.x && (
                                      <span>
                                        X: @{handle.x}
                                        <StatusBadge status={handle.xStatus} />
                                      </span>
                                    )}
                                    {handle.instagram && (
                                      <span>
                                        Instagram: @{handle.instagram}
                                        <StatusBadge status={handle.instagramStatus} />
                                      </span>
                                    )}
                                    {handle.website && (
                                      <span>
                                        {handle.website}
                                        <StatusBadge status={handle.websiteStatus} />
                                      </span>
                                    )}
                                  </p>
                                  {handle.checkedAt && (
                                    <p className="mt-1 text-xs text-ink-400">
                                      Checked {new Date(handle.checkedAt).toLocaleString('en-IN')}
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-3 text-xs">
                                  {confirmDeleteId === handle.id ? (
                                    <>
                                      <span className="text-ink-500">Remove?</span>
                                      <button
                                        onClick={() => handleDelete(handle.id)}
                                        disabled={deletingId === handle.id}
                                        className="font-bold text-red-600 hover:underline disabled:opacity-40"
                                      >
                                        {deletingId === handle.id ? 'Removing…' : 'Yes'}
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-ink-500 hover:text-ink-900 hover:underline"
                                      >
                                        No
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleCheck(handle.id)}
                                        disabled={checkingId === handle.id}
                                        className="text-ink-500 hover:text-ink-900 hover:underline disabled:opacity-40"
                                      >
                                        {checkingId === handle.id ? 'Checking…' : 'Check'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingId(handle.id)
                                          setEditError(null)
                                        }}
                                        className="text-ink-500 hover:text-ink-900 hover:underline"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(handle.id)}
                                        className="text-ink-500 hover:text-red-600 hover:underline"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>

              {deleteError && <p className="mt-4 text-sm text-red-600">{deleteError}</p>}
              {checkError && <p className="mt-4 text-sm text-red-600">{checkError}</p>}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
