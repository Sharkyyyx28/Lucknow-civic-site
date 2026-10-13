import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Container from '../components/container'
import Layout from '../components/layout'
import LocateIcon from '../components/locate-icon'
import { getOfficialsDirectory } from '../lib/officials'
import { wardDisplayName } from '../lib/communityTypes'
import { INPUT, PRIMARY_BTN } from '../lib/ui'
import type { OfficialsDirectory, OfficialContact } from '../lib/officialsTypes'
import type { GeocodeResult } from './api/geocode'

interface Props {
  directory: OfficialsDirectory
}

const QUICK_SUGGESTIONS = [
  'Hazratganj',
  'Gomti Nagar',
  'Chowk',
  'Aliganj',
  'Indira Nagar',
  'Alambagh',
  'Charbagh',
  'Mahanagar',
  'Rajajipuram',
  'Jankipuram',
]

export async function getStaticProps() {
  return {
    props: { directory: await getOfficialsDirectory() },
    revalidate: 86400,
  }
}

export default function FindMyWardPage({ directory }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [detectedWard, setDetectedWard] = useState<string | null>(null)
  const [detectedCorp, setDetectedCorp] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [searchingPoint, setSearchingPoint] = useState(false)

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setLoadingSuggestions(true)
      fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        .then(res => res.json())
        .then(data => {
          setSuggestions(Array.isArray(data.results) ? data.results : [])
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false))
    }, 250)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [query])

  const resolvePoint = async (lat: number, lng: number, placeLabel: string) => {
    setSearchingPoint(true)
    setError(null)
    setSuggestions([])
    setSelectedPlace(placeLabel)
    setCoords({ lat, lng })

    try {
      const res = await fetch(`/api/ward-at-point?lat=${lat}&lng=${lng}`)
      if (!res.ok) {
        throw new Error('This point falls outside the mapped Lucknow municipal ward boundaries.')
      }
      const data = await res.json()
      setDetectedWard(data.wardName)
      setDetectedCorp(data.corporation || 'Lucknow Municipal Corporation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not determine ward at this location.')
      setDetectedWard(null)
    } finally {
      setSearchingPoint(false)
    }
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        resolvePoint(pos.coords.latitude, pos.coords.longitude, 'Your current location')
      },
      err => {
        setLocating(false)
        setError('Location permission denied or unavailable.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Find corporator matching detected ward name
  const corporator = detectedWard
    ? directory.contacts.find(
        c =>
          c.role === 'corporator' &&
          c.wards.some(
            w =>
              w.toLowerCase().includes(detectedWard.toLowerCase()) ||
              detectedWard.toLowerCase().includes(w.toLowerCase())
          )
      )
    : null

  // MLAs in Lucknow
  const mlas = directory.contacts.filter(c => c.role === 'mla')
  const mp = directory.contacts.find(c => c.role === 'mp')
  const mayor = directory.contacts.find(c => c.role === 'mayor')

  return (
    <Layout>
      <Head>
        <title>Find My Ward & Corporator | Lucknow Civic Data</title>
        <meta
          name="description"
          content="Look up any Lucknow address, locality or pincode to find your municipal ward, corporator, Vidhan Sabha MLA, and civic details."
        />
      </Head>

      <Container>
        <div className="max-w-3xl mx-auto pt-10 md:pt-14 pb-24">
          <Link href="/officials" className="text-sm text-ink-500 hover:text-black hover:underline">
            ← Officials Directory
          </Link>

          <header className="mt-4 mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 mb-1">
              Civic Finder
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-ink-900 mb-3">
              Find my ward & corporator
            </h1>
            <p className="text-lg text-ink-600 leading-relaxed">
              Enter any Lucknow colony, landmark, or address to see which municipal ward you
              belong to and who represents you in the Nagar Nigam and UP Vidhan Sabha.
            </p>
          </header>

          {/* Search Box */}
          <div className="relative mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type colony, landmark or area (e.g. Gomti Nagar, Chowk, Aliganj)..."
                  className={`${INPUT} pl-10 pr-4 py-3 text-base shadow-sm`}
                />
                <span className="absolute left-3.5 top-3.5 text-ink-400">🔍</span>
                {loadingSuggestions && (
                  <span className="absolute right-3.5 top-3.5 text-xs text-ink-400">Searching…</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded-md border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-100 disabled:opacity-50"
              >
                <LocateIcon size={18} />
                <span>{locating ? 'Locating…' : 'Locate Me'}</span>
              </button>
            </div>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-md border border-ink-200 shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={() => resolvePoint(s.lat, s.lng, s.name)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-ink-100 last:border-b-0 transition-colors"
                  >
                    <div className="text-sm font-semibold text-ink-900">📍 {s.name}</div>
                    <div className="text-xs text-ink-500 truncate">{s.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick suggestions pills */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Quick Localities:</span>
            {QUICK_SUGGESTIONS.map(place => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setQuery(place)
                  fetch(`/api/geocode?q=${encodeURIComponent(place)}`)
                    .then(r => r.json())
                    .then(data => {
                      if (data.results?.[0]) {
                        const top = data.results[0]
                        resolvePoint(top.lat, top.lng, top.name)
                      }
                    })
                }}
                className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                {place}
              </button>
            ))}
          </div>

          {searchingPoint && (
            <div className="p-8 text-center bg-white rounded-lg border border-ink-200 shadow-sm mb-8">
              <p className="text-sm font-semibold text-brand-700">Looking up ward geometry and representatives…</p>
            </div>
          )}

          {error && (
            <div className="p-4 mb-8 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Results section */}
          {detectedWard && coords && (
            <div className="space-y-6">
              <div className="rounded-lg border-2 border-brand-600 bg-brand-50/40 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-800">
                    Municipal Ward Match
                  </span>
                  <span className="text-xs font-mono text-ink-500">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                </div>
                <h2 className="font-display text-3xl font-bold text-ink-900 mb-1">
                  {wardDisplayName(detectedWard)}
                </h2>
                <p className="text-sm text-ink-600 mb-4">
                  {detectedCorp} · Pre-2023 110-ward spatial delimitation
                </p>

                <div className="flex flex-wrap gap-3 pt-3 border-t border-brand-200/60">
                  <Link
                    href={`/map?ward=${encodeURIComponent(detectedWard)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:underline"
                  >
                    🗺️ View boundaries & amenities on map →
                  </Link>
                  <span className="text-brand-300">·</span>
                  <Link
                    href={`/community?ward=${encodeURIComponent(detectedWard)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:underline"
                  >
                    📢 Read community reports ({wardDisplayName(detectedWard)}) →
                  </Link>
                  <span className="text-brand-300">·</span>
                  <Link
                    href="/community/new"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 hover:underline"
                  >
                    🛠️ Report issue in this ward →
                  </Link>
                </div>
              </div>

              {/* Representatives breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Corporator Card */}
                <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-700">
                    Nagar Nigam Corporator
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink-900 mt-1">
                    {corporator ? corporator.name : 'Elected Corporator'}
                  </h3>
                  {corporator?.party && (
                    <p className="text-sm font-medium text-ink-600 mt-0.5">{corporator.party}</p>
                  )}
                  <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                    {corporator
                      ? `Represents ${wardDisplayName(detectedWard)} in the Lucknow Municipal Corporation council.`
                      : `2023 delimitation list available on the officials directory.`}
                  </p>
                  <Link
                    href={`/officials?ward=${encodeURIComponent(detectedWard)}`}
                    className="inline-block mt-3 text-xs font-bold text-brand-700 hover:underline"
                  >
                    Browse all ward corporators →
                  </Link>
                </div>

                {/* Mayor Card */}
                <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                    Mayor of Lucknow
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink-900 mt-1">
                    {mayor ? mayor.name : 'Smt. Sushma Kharkwal'}
                  </h3>
                  {mayor?.party && (
                    <p className="text-sm font-medium text-ink-600 mt-0.5">{mayor.party}</p>
                  )}
                  <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                    Head of the Lucknow Municipal Corporation, representing all 110 municipal wards.
                  </p>
                  <Link href="/officials" className="inline-block mt-3 text-xs font-bold text-brand-700 hover:underline">
                    View in officials directory →
                  </Link>
                </div>

                {/* Lok Sabha MP */}
                <div className="rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                    Member of Parliament (Lok Sabha)
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink-900 mt-1">
                    {mp ? mp.name : 'Rajnath Singh'}
                  </h3>
                  <p className="text-sm font-medium text-ink-600 mt-0.5">
                    {mp?.party ?? 'BJP'} · Lucknow Parliamentary Constituency
                  </p>
                  <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                    Represents the Lucknow parliamentary constituency in the Indian Parliament.
                  </p>
                </div>

                {/* Emergency Helplines quick block */}
                <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                    Civic Helplines
                  </span>
                  <ul className="mt-2 space-y-1.5 text-xs text-brand-900">
                    <li className="flex justify-between">
                      <span className="text-ink-600">LMC Nagar Nigam Complaints:</span>
                      <strong className="font-mono">1533</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-ink-600">LESA Electricity Outages:</span>
                      <strong className="font-mono">1912</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-ink-600">Jal Sansthan (Water Supply):</span>
                      <strong className="font-mono">0522-2239611</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-ink-600">Integrated Police / Fire / EMS:</span>
                      <strong className="font-mono">112</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </Layout>
  )
}
