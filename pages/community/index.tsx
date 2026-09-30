import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../../components/layout'
import Container from '../../components/container'
import CommunityPostCard from '../../components/community-post-card'
import ScopeSelect, { type Scope } from '../../components/scope-select'
import type { WardListEntry } from '../api/wards-list'
import type { SavedLocation } from '../../lib/profiles'
import {
  CATEGORY_LABELS,
  POST_CATEGORIES,
  POST_STATUSES,
  STATUS_LABELS,
  isPostCategory,
  isPostStatus,
  wardDisplayName,
  type CommunityPost,
  type PostCategory,
  type PostStatus,
} from '../../lib/communityTypes'
import { INPUT, PRIMARY_BTN } from '../../lib/ui'
import { fetchJson } from '../../lib/fetchJson'

export default function CommunityFeedPage() {
  const { status } = useSession()
  const router = useRouter()

  const [wards, setWards] = useState<WardListEntry[]>([])
  const [myLocations, setMyLocations] = useState<SavedLocation[]>([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  const deepLinkApplied = useRef(false)

  const [scope, setScope] = useState<Scope>('all')
  // Until the profile comes back we don't know whether "My wards" is even an
  // option, so the default is only applied once, on first load.
  const [scopeTouched, setScopeTouched] = useState(false)
  const [category, setCategory] = useState<PostCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/wards-list')
      .then(r => r.json())
      .then(data => setWards(data.wards ?? []))
      .catch(() => {})
  }, [])

  // Deep links — a post page sends readers here as /community?ward=<name>, and
  // the same shape works for ?corporation= and ?category=. Applied once: after
  // that the filters belong to whoever is using them.
  useEffect(() => {
    if (!router.isReady || deepLinkApplied.current) return
    deepLinkApplied.current = true
    const { ward, corporation, category: queryCategory } = router.query
    if (typeof ward === 'string' && ward) {
      setScope(`ward:${ward}`)
      setScopeTouched(true)
    } else if (typeof corporation === 'string' && corporation) {
      setScope(`corp:${corporation}`)
      setScopeTouched(true)
    }
    if (isPostCategory(queryCategory)) setCategory(queryCategory)
  }, [router.isReady, router.query])

  useEffect(() => {
    if (status === 'unauthenticated') {
      setProfileLoaded(true)
      return
    }
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => setMyLocations(data.profile?.locations ?? []))
      .catch(() => {})
      .finally(() => setProfileLoaded(true))
  }, [status])

  const myWardNames = useMemo(
    () => [...new Set(myLocations.map(loc => loc.wardName))],
    [myLocations]
  )

  const myCorporations = useMemo(() => {
    const byWard = new Map(wards.map(w => [w.wardName, w.corporation]))
    return [...new Set(myWardNames.map(name => byWard.get(name)).filter((c): c is string => !!c))]
  }, [myWardNames, wards])

  // Start people on their own wards when they have saved places, and on all of
  // Lucknow otherwise — an empty feed is a bad first impression.
  useEffect(() => {
    if (scopeTouched || !profileLoaded) return
    if (myWardNames.length) setScope('mine:wards')
  }, [profileLoaded, myWardNames, scopeTouched])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (scope === 'mine:wards') myWardNames.forEach(w => params.append('ward', w))
    else if (scope === 'mine:corps') myCorporations.forEach(c => params.append('corporation', c))
    else if (scope.startsWith('ward:')) params.append('ward', scope.slice(5))
    else if (scope.startsWith('corp:')) params.append('corporation', scope.slice(5))
    if (category) params.append('category', category)
    if (statusFilter) params.append('status', statusFilter)
    return params.toString()
  }, [scope, category, statusFilter, myWardNames, myCorporations])

  // "My wards" with nothing saved yet would ask the server for an empty ward
  // list; skip the round trip and show the prompt to save a place instead.
  const scopeUnresolved =
    (scope === 'mine:wards' && !myWardNames.length) ||
    (scope === 'mine:corps' && !myCorporations.length)

  const loadPosts = useCallback(() => {
    if (scopeUnresolved) {
      setPosts([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchJson<{ posts?: CommunityPost[]; total?: number }>(`/api/community/posts?${query}`)
      .then(data => {
        setPosts(data.posts ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load the community feed'))
      .finally(() => setLoading(false))
  }, [query, scopeUnresolved])

  useEffect(() => {
    if (!profileLoaded) return
    loadPosts()
  }, [profileLoaded, loadPosts])

  const scopeDescription = () => {
    if (scope === 'mine:wards') return `Posts from the ${myWardNames.length === 1 ? 'ward' : 'wards'} you saved on your profile.`
    if (scope === 'mine:corps') return 'Posts from anywhere in the corporations your saved places fall under.'
    if (scope.startsWith('ward:')) return `Posts pinned inside ${wardDisplayName(scope.slice(5))}.`
    if (scope.startsWith('corp:')) return `Posts from anywhere in ${scope.slice(5)}.`
    return 'Every post, across all of Lucknow.'
  }

  return (
    <Layout preview={false}>
      <Container>
        <Head><title>Community | Lucknow</title></Head>

        <div className="max-w-3xl mx-auto pt-10 md:pt-14 pb-24">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-2">
                Community
              </h1>
              <p className="text-lg text-ink-700">
                What people are reporting about their part of Lucknow — a road that needs
                repair, a park worth visiting, a footpath that finally got fixed.
              </p>
            </div>
            <Link href="/community/new" className={`${PRIMARY_BTN} shrink-0 whitespace-nowrap`}>
              Write a post
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-b border-ink-200 py-4 mb-2">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="scope"
                className="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1"
              >
                Where
              </label>
              <ScopeSelect
                value={scope}
                onChange={next => {
                  setScope(next)
                  setScopeTouched(true)
                }}
                wards={wards}
                myWardNames={myWardNames}
                myCorporations={myCorporations}
              />
            </div>

            <label className="sm:w-56">
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">
                Kind of post
              </span>
              <select
                value={category}
                onChange={e => setCategory(isPostCategory(e.target.value) ? e.target.value : '')}
                className={`${INPUT} bg-white`}
              >
                <option value="">Everything</option>
                {POST_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>

            <label className="sm:w-44">
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(isPostStatus(e.target.value) ? e.target.value : '')}
                className={`${INPUT} bg-white`}
              >
                <option value="">All statuses</option>
                {POST_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-sm text-ink-500 mb-8">
            {scopeDescription()}
            {!loading && !scopeUnresolved && total > 0 && (
              <> {total} {total === 1 ? 'post' : 'posts'}.</>
            )}
          </p>

          {loading ? (
            <div className="space-y-6" aria-busy="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-40 bg-ink-100 animate-pulse" />
              ))}
              <span className="sr-only">Loading posts…</span>
            </div>
          ) : error ? (
            <div className="border border-amber-300 bg-amber-50 p-5">
              <p className="text-amber-800 mb-3">{error}</p>
              <button type="button" onClick={loadPosts} className="text-sm font-bold hover:underline">
                Try again
              </button>
            </div>
          ) : scopeUnresolved ? (
            <div className="border border-ink-300 p-6">
              <h2 className="text-lg font-bold tracking-tighter mb-1">
                Tell us where you live first
              </h2>
              <p className="text-sm text-ink-600 mb-4">
                Save a place on your profile and this feed will show what your neighbours are
                posting about that ward.
              </p>
              <Link href="/profile" className="text-sm font-bold hover:underline">
                Set up your places →
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <div className="border border-ink-300 p-6">
              <h2 className="text-lg font-bold tracking-tighter mb-1">Nothing here yet</h2>
              <p className="text-sm text-ink-600 mb-4">
                No posts match this filter. Be the first to write about what is going on around
                you — or widen the search to all of Lucknow.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/community/new" className="text-sm font-bold hover:underline">
                  Write a post →
                </Link>
                {scope !== 'all' && (
                  <button
                    type="button"
                    onClick={() => { setScope('all'); setScopeTouched(true) }}
                    className="text-sm text-ink-500 hover:text-black hover:underline"
                  >
                    Show all of Lucknow
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </Layout>
  )
}
