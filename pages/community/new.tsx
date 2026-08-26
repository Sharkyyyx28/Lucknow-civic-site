import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../../components/layout'
import Container from '../../components/container'
import LocateIcon from '../../components/locate-icon'
import type { SavedLocation } from '../../lib/profiles'
import { locateCurrentWard, resolveWardAtPoint } from '../../lib/locate'
import {
  BODY_MAX,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  PLACE_LABEL_MAX,
  POST_CATEGORIES,
  TITLE_MAX,
  wardDisplayName,
  type PostCategory,
} from '../../lib/communityTypes'
import { INPUT, INLINE_BTN, PRIMARY_BTN, QUIET_BTN } from '../../lib/ui'
import { fetchJson } from '../../lib/fetchJson'

const LocationPickerMap = dynamic(() => import('../../components/location-picker-map'), { ssr: false })

export default function NewCommunityPostPage() {
  const router = useRouter()
  const { status } = useSession()

  const [category, setCategory] = useState<PostCategory>('issue')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [placeLabel, setPlaceLabel] = useState('')

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [wardName, setWardName] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only saved places with a pin can seed a post — a post needs an exact point,
  // not just the ward the place sits in.
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        const locations: SavedLocation[] = data.profile?.locations ?? []
        setSavedPlaces(locations.filter(loc => loc.lat != null && loc.lng != null))
      })
      .catch(() => {})
  }, [status])

  const handleLocateMe = useCallback(async () => {
    setLocating(true)
    setLocateError(null)
    try {
      const located = await locateCurrentWard()
      setLat(located.lat)
      setLng(located.lng)
      setWardName(located.wardName)
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "Couldn't determine your ward.")
    } finally {
      setLocating(false)
    }
  }, [])

  const handlePick = useCallback(async (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat)
    setLng(pickedLng)
    setLocateError(null)
    setWardName('')
    try {
      setWardName(await resolveWardAtPoint(pickedLat, pickedLng))
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "Couldn't determine the ward for that point.")
    }
  }, [])

  const useSavedPlace = (place: SavedLocation) => {
    setLat(place.lat!)
    setLng(place.lng!)
    setWardName(place.wardName)
    setLocateError(null)
    if (!placeLabel.trim()) setPlaceLabel(place.label)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (lat == null || lng == null) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await fetchJson<{ post: { id: string } }>('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category, lat, lng, placeLabel }),
      })
      router.push(`/community/${data.post.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the post')
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <Layout preview={false}>
        <Container>
          <div className="max-w-2xl mx-auto py-24" aria-busy="true">
            <div className="h-9 w-56 bg-neutral-100 animate-pulse mb-4" />
            <div className="h-4 w-72 bg-neutral-100 animate-pulse" />
            <span className="sr-only">Loading…</span>
          </div>
        </Container>
      </Layout>
    )
  }

  if (status !== 'authenticated') {
    return (
      <Layout preview={false}>
        <Container>
          <Head><title>Write a post | Lucknow</title></Head>
          <div className="max-w-xl mx-auto py-20 md:py-28">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-4">
              Write a post
            </h1>
            <p className="text-lg text-neutral-700 mb-8">
              Sign in to share something about a place in Lucknow. Your post shows up for
              everyone reading that ward&apos;s feed, under the name on your profile.
            </p>
            <button onClick={() => signIn('google')} className={PRIMARY_BTN}>
              Sign in with Google
            </button>
            <p className="text-sm text-neutral-500 mt-4">
              <Link href="/community" className="hover:underline">
                Or keep reading the feed →
              </Link>
            </p>
          </div>
        </Container>
      </Layout>
    )
  }

  const canSubmit = !!title.trim() && !!body.trim() && lat != null && lng != null && !submitting

  return (
    <Layout preview={false}>
      <Container>
        <Head><title>Write a post | Lucknow</title></Head>

        <div className="max-w-2xl mx-auto pt-10 md:pt-14 pb-24">
          <Link href="/community" className="text-sm text-neutral-500 hover:text-black hover:underline">
            ← Community
          </Link>

          <h1 className="text-4xl font-bold tracking-tighter leading-tight mt-4 mb-2">
            Write a post
          </h1>
          <p className="text-neutral-600 mb-8">
            Pin the place you are writing about — the ward and corporation are worked out from
            the pin, so your neighbours see it in their feed.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset>
              <legend className="block text-sm font-semibold mb-2">What kind of post is this?</legend>
              <div className="flex flex-wrap gap-2">
                {POST_CATEGORIES.map(c => {
                  const selected = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 border px-3 py-2 text-sm duration-200 transition-colors ${
                        selected
                          ? 'border-black bg-black text-white font-bold'
                          : 'border-neutral-300 text-neutral-700 hover:border-black'
                      }`}
                    >
                      <span aria-hidden="true">{CATEGORY_STYLES[c].icon}</span>
                      {CATEGORY_LABELS[c]}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 3rd Cross has been dug up for three weeks"
                maxLength={TITLE_MAX}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="body" className="block text-sm font-semibold mb-1">
                Your post
              </label>
              <textarea
                id="body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                maxLength={BODY_MAX}
                placeholder="What is happening, how long it has been going on, and what would help. Leave a blank line between paragraphs."
                className={`${INPUT} resize-y`}
              />
              <p className="text-xs text-neutral-500 mt-1">
                {body.length}/{BODY_MAX} characters · plain text, no formatting
              </p>
            </div>

            <div>
              <label htmlFor="placeLabel" className="block text-sm font-semibold mb-1">
                Landmark <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <input
                id="placeLabel"
                type="text"
                value={placeLabel}
                onChange={e => setPlaceLabel(e.target.value)}
                placeholder="e.g. opposite the 5th Cross bus stop"
                maxLength={PLACE_LABEL_MAX}
                className={INPUT}
              />
            </div>

            <div>
              <span className="block text-sm font-semibold mb-2">Where is this?</span>

              {savedPlaces.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs text-neutral-500">Your saved places:</span>
                  {savedPlaces.map(place => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => useSavedPlace(place)}
                      className="border border-neutral-300 px-2 py-1 text-xs hover:border-black duration-200 transition-colors"
                    >
                      {place.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mb-3">
                <button type="button" onClick={handleLocateMe} disabled={locating} className={INLINE_BTN}>
                  {locating ? (
                    'Locating…'
                  ) : (
                    <>
                      <LocateIcon size={14} />
                      Use my current location
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setShowPicker(v => !v)} className={INLINE_BTN}>
                  {showPicker ? 'Hide map' : 'Pick on the map'}
                </button>
              </div>

              {(showPicker || lat == null) && (
                <LocationPickerMap lat={lat} lng={lng} onPick={handlePick} />
              )}

              {lat != null && lng != null && (
                <p className="text-sm text-neutral-600 mt-2">
                  📍 {lat.toFixed(5)}, {lng.toFixed(5)}
                  {wardName ? (
                    <>
                      {' '}· <span className="font-semibold">{wardDisplayName(wardName)}</span>
                    </>
                  ) : (
                    ' · working out the ward…'
                  )}
                </p>
              )}
              {locateError && <p className="text-amber-600 text-sm mt-2">{locateError}</p>}
              {lat == null && (
                <p className="text-xs text-neutral-500 mt-2">
                  Tap the map to drop a pin. A post needs one so it can be filed under the right ward.
                </p>
              )}
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex items-center gap-4 border-t border-neutral-200 pt-6">
              <button type="submit" disabled={!canSubmit} className={PRIMARY_BTN}>
                {submitting ? 'Publishing…' : 'Publish post'}
              </button>
              <Link href="/community" className={QUIET_BTN}>
                Cancel
              </Link>
            </div>
            <p className="text-xs text-neutral-500">
              Posts are public. Your profile name is shown — never the email you signed in with.
            </p>
          </form>
        </div>
      </Container>
    </Layout>
  )
}
