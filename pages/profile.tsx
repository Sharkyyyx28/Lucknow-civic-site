import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useSession, signIn } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/layout'
import Container from '../components/container'
import LocateIcon from '../components/locate-icon'
import WardSelect from '../components/ward-select'
import type { WardListEntry } from './api/wards-list'
import type { SavedLocation } from '../lib/profiles'
import { haversineMeters } from '../lib/geo'

const LocationPickerMap = dynamic(() => import('../components/location-picker-map'), { ssr: false })

interface AmenityCounts {
  hospitals: number
  parks: number
  schools: number
  safety: number
}

interface AmenityItem {
  name: string
  lat: number
  lon: number
}

type AmenityItems = Record<keyof AmenityCounts, AmenityItem[]>

const AMENITY_LABELS: Array<[keyof AmenityCounts, string, string]> = [
  ['hospitals', '🏥', 'Hospitals & clinics'],
  ['parks', '🌳', 'Parks & playgrounds'],
  ['schools', '🏫', 'Schools & colleges'],
  ['safety', '🚓', 'Police & fire stations'],
]

function wardLookupName(wardName: string): string {
  return wardName.replace(/^\d+\s*-\s*/, '')
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

// Shared field/button styling, so the forms on this page look like the rest of
// the site: square corners, neutral borders, black primary action.
const INPUT =
  'w-full border border-neutral-300 px-3 py-2 duration-200 transition-colors focus:outline-none focus:border-black'
const PRIMARY_BTN =
  'bg-black hover:bg-white hover:text-black border border-black text-white font-bold py-2 px-6 duration-200 transition-colors disabled:opacity-40 disabled:pointer-events-none'
const SMALL_BTN =
  'bg-black hover:bg-white hover:text-black border border-black text-white text-sm font-bold py-1.5 px-4 duration-200 transition-colors disabled:opacity-40 disabled:pointer-events-none'
const QUIET_BTN = 'text-sm text-neutral-500 hover:text-black hover:underline'
const INLINE_BTN =
  'shrink-0 flex items-center gap-1 text-xs text-neutral-600 hover:text-black hover:underline disabled:opacity-40 whitespace-nowrap'

/** One ward fact — ward number, corporation, constituency, pincodes. */
const Chip = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-baseline gap-1.5 border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs">
    <span className="font-semibold text-neutral-500">{label}</span>
    <span className="text-neutral-800">{value}</span>
  </span>
)

/**
 * One amenity category. `primary` is the headline figure — a distance when the
 * location has a pin, a count when it is only resolved to a ward.
 */
const AmenityTile = ({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: string
  label: string
  primary: string
  secondary: string
}) => (
  <div className="border border-neutral-200 p-3">
    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
      <span aria-hidden="true">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
    <div className="text-lg font-bold tracking-tighter leading-tight">{primary}</div>
    <div className="text-xs text-neutral-500 truncate" title={secondary}>
      {secondary}
    </div>
  </div>
)

// Nearest amenity per category to an exact pinned point — the same
// nearest-amenity calculation the full map does after "Locate me", just
// driven by whatever point the user pinned for this saved location.
function nearestAmenities(items: AmenityItems | null, lat: number, lng: number) {
  if (!items) return []
  return AMENITY_LABELS.map(([key, icon, label]) => {
    const list = items[key] ?? []
    if (!list.length) return null
    let best = list[0]
    let bestDist = haversineMeters(lat, lng, best.lat, best.lon)
    for (const item of list.slice(1)) {
      const d = haversineMeters(lat, lng, item.lat, item.lon)
      if (d < bestDist) { bestDist = d; best = item }
    }
    return { key, icon, label, name: best.name, distanceM: bestDist }
  }).filter((x): x is { key: keyof AmenityCounts; icon: string; label: string; name: string; distanceM: number } => x !== null)
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

// Server-side point-in-ward lookup (/api/ward-at-point) — reuses the same
// reverse-geocode the map's own "Locate me" relies on, without having to
// ship the ~4MB ward boundary geometry to this page.
async function resolveWardAtPoint(lat: number, lng: number): Promise<string> {
  const res = await fetch(`/api/ward-at-point?lat=${lat}&lng=${lng}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Couldn't determine the ward for that point.")
  return data.wardName as string
}

async function locateCurrentWard(): Promise<{ wardName: string; lat: number; lng: number }> {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by your browser.')
  }
  let pos: GeolocationPosition
  try {
    pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  } catch (err) {
    const geoErr = err as GeolocationPositionError
    if (geoErr.code === geoErr.PERMISSION_DENIED) throw new Error('Location permission denied.')
    if (geoErr.code === geoErr.POSITION_UNAVAILABLE) throw new Error('Your location is currently unavailable.')
    if (geoErr.code === geoErr.TIMEOUT) throw new Error('Location request timed out.')
    throw new Error('Unable to retrieve your location.')
  }
  const { latitude, longitude } = pos.coords
  const wardName = await resolveWardAtPoint(latitude, longitude)
  return { wardName, lat: latitude, lng: longitude }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()

  const [wards, setWards] = useState<WardListEntry[]>([])

  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [locations, setLocations] = useState<SavedLocation[]>([])

  // The add form is a panel you open — except with nothing saved yet, where it
  // is the whole point of the page and stays open.
  const [addOpen, setAddOpen] = useState(false)

  const [newLabel, setNewLabel] = useState('')
  const [newWardName, setNewWardName] = useState('')
  const [newLat, setNewLat] = useState<number | null>(null)
  const [newLng, setNewLng] = useState<number | null>(null)
  const [showNewPicker, setShowNewPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [locatingNew, setLocatingNew] = useState(false)
  const [locateNewError, setLocateNewError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editWardName, setEditWardName] = useState('')
  const [editLat, setEditLat] = useState<number | null>(null)
  const [editLng, setEditLng] = useState<number | null>(null)
  const [showEditPicker, setShowEditPicker] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [locatingEdit, setLocatingEdit] = useState(false)
  const [locateEditError, setLocateEditError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Removing a saved place cannot be undone, so it takes a second click.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [amenitiesById, setAmenitiesById] = useState<Record<string, AmenityCounts | null>>({})
  const [amenityItemsById, setAmenityItemsById] = useState<Record<string, AmenityItems | null>>({})
  const [amenitiesLoadingId, setAmenitiesLoadingId] = useState<Record<string, boolean>>({})
  const [amenitiesFailedId, setAmenitiesFailedId] = useState<Record<string, boolean>>({})

  // Live-OSM postcodes, layered on top of the static CSV pincodes wardMeta()
  // already has synchronously — see pages/api/ward-postcodes.ts.
  const [livePincodesById, setLivePincodesById] = useState<Record<string, string[] | null>>({})

  useEffect(() => {
    fetch('/api/wards-list')
      .then(r => r.json())
      .then(data => setWards(data.wards ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const resolvedName = data.profile.name || session?.user?.name || ''
          setName(resolvedName)
          setEditingName(!resolvedName)
          setLocations(data.profile.locations ?? [])
          setSavedAt(data.profile.updatedAt)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const loadAmenities = useCallback((id: string, wardName: string) => {
    setAmenitiesLoadingId(prev => ({ ...prev, [id]: true }))
    setAmenitiesFailedId(prev => ({ ...prev, [id]: false }))
    fetch(`/api/ward-amenities?ward_name=${encodeURIComponent(wardLookupName(wardName))}`)
      .then(r => r.json())
      .then(data => {
        setAmenitiesById(prev => ({ ...prev, [id]: data.counts ?? null }))
        setAmenityItemsById(prev => ({ ...prev, [id]: data.items ?? null }))
        setAmenitiesFailedId(prev => ({ ...prev, [id]: data.ok === false }))
      })
      .catch(() => {
        setAmenitiesById(prev => ({ ...prev, [id]: null }))
        setAmenityItemsById(prev => ({ ...prev, [id]: null }))
        setAmenitiesFailedId(prev => ({ ...prev, [id]: true }))
      })
      .finally(() => setAmenitiesLoadingId(prev => ({ ...prev, [id]: false })))
  }, [])

  useEffect(() => {
    for (const loc of locations) {
      if (!(loc.id in amenitiesById)) loadAmenities(loc.id, loc.wardName)
    }
  }, [locations, amenitiesById, loadAmenities])

  const loadPostcodes = useCallback((id: string, wardName: string) => {
    fetch(`/api/ward-postcodes?ward_name=${encodeURIComponent(wardLookupName(wardName))}`)
      .then(r => r.json())
      .then(data => setLivePincodesById(prev => ({ ...prev, [id]: data.pincodes ?? null })))
      .catch(() => setLivePincodesById(prev => ({ ...prev, [id]: null })))
  }, [])

  useEffect(() => {
    for (const loc of locations) {
      if (!(loc.id in livePincodesById)) loadPostcodes(loc.id, loc.wardName)
    }
  }, [locations, livePincodesById, loadPostcodes])

  const wardMeta = (wardName: string) => wards.find(w => w.wardName === wardName) ?? null

  // Static CSV pincodes (available immediately from wards-list) unioned with
  // whatever live OSM postcodes have come back for this location so far.
  const pincodesFor = (loc: SavedLocation, meta: WardListEntry | null): string[] =>
    [...new Set([...(meta?.pincodes ?? []), ...(livePincodesById[loc.id] ?? [])])].sort()

  const handleLocateNew = useCallback(async () => {
    setLocatingNew(true)
    setLocateNewError(null)
    try {
      const { wardName, lat, lng } = await locateCurrentWard()
      setNewWardName(wardName)
      setNewLat(lat)
      setNewLng(lng)
    } catch (err) {
      setLocateNewError(err instanceof Error ? err.message : "Couldn't determine your ward.")
    } finally {
      setLocatingNew(false)
    }
  }, [])

  const handleLocateEdit = async () => {
    setLocatingEdit(true)
    setLocateEditError(null)
    try {
      const { wardName, lat, lng } = await locateCurrentWard()
      setEditWardName(wardName)
      setEditLat(lat)
      setEditLng(lng)
    } catch (err) {
      setLocateEditError(err instanceof Error ? err.message : "Couldn't determine your ward.")
    } finally {
      setLocatingEdit(false)
    }
  }

  const handlePickNew = useCallback(async (lat: number, lng: number) => {
    setNewLat(lat)
    setNewLng(lng)
    setLocateNewError(null)
    try {
      setNewWardName(await resolveWardAtPoint(lat, lng))
    } catch (err) {
      setLocateNewError(err instanceof Error ? err.message : "Couldn't determine the ward for that point.")
    }
  }, [])

  const handlePickEdit = async (lat: number, lng: number) => {
    setEditLat(lat)
    setEditLng(lng)
    setLocateEditError(null)
    try {
      setEditWardName(await resolveWardAtPoint(lat, lng))
    } catch (err) {
      setLocateEditError(err instanceof Error ? err.message : "Couldn't determine the ward for that point.")
    }
  }

  // If the user has already granted location permission (from a previous
  // visit, or from using "Locate me" on the map), default the "Add a
  // location" ward to their current ward — no button click needed.
  useEffect(() => {
    if (status !== 'authenticated') return
    if (!('permissions' in navigator)) return
    let cancelled = false
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then(result => {
        if (result.state === 'granted' && !cancelled) handleLocateNew()
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [status, handleLocateNew])

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault()
    setSavingName(true)
    setNameError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save profile')
      setSavedAt(data.profile.updatedAt)
      setEditingName(false)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingName(false)
    }
  }

  const handleAddLocation = async (e: FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel,
          wardName: newWardName,
          ...(newLat != null && newLng != null ? { lat: newLat, lng: newLng } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add location')
      setLocations(data.profile.locations ?? [])
      setNewLabel('')
      setNewWardName('')
      setNewLat(null)
      setNewLng(null)
      setShowNewPicker(false)
      setAddOpen(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add location')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (loc: SavedLocation) => {
    setEditingId(loc.id)
    setEditLabel(loc.label)
    setEditWardName(loc.wardName)
    setEditLat(loc.lat ?? null)
    setEditLng(loc.lng ?? null)
    setShowEditPicker(false)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch('/api/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          label: editLabel,
          wardName: editWardName,
          lat: editLat,
          lng: editLng,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update location')
      setLocations(data.profile.locations ?? [])
      setAmenitiesById(prev => {
        const next = { ...prev }
        delete next[editingId]
        return next
      })
      setAmenityItemsById(prev => {
        const next = { ...prev }
        delete next[editingId]
        return next
      })
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update location')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/locations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete location')
      setLocations(data.profile.locations ?? [])
    } catch {
      // no-op; location stays in the list so the user can retry
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (status === 'loading') {
    return (
      <Layout preview={false}>
        <Container>
          <div className="max-w-3xl mx-auto py-24" aria-busy="true">
            <div className="h-9 w-56 bg-neutral-100 animate-pulse mb-4" />
            <div className="h-4 w-72 bg-neutral-100 animate-pulse" />
            <span className="sr-only">Loading your profile…</span>
          </div>
        </Container>
      </Layout>
    )
  }

  if (status !== 'authenticated') {
    return (
      <Layout preview={false}>
        <Container>
          <Head><title>Your places | Lucknow</title></Head>
          <div className="max-w-xl mx-auto py-20 md:py-28">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-4">
              Your places
            </h1>
            <p className="text-lg text-neutral-700 mb-8">
              Save your home, your office, or anywhere else in Lucknow. For each one you
              get the ward it falls in, its pincodes, and the civic amenities closest to it.
            </p>
            <ul className="grid grid-cols-2 gap-3 mb-10">
              {AMENITY_LABELS.map(([key, icon, label]) => (
                <li
                  key={key}
                  className="flex items-center gap-2 border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </li>
              ))}
            </ul>
            <button onClick={() => signIn('google')} className={PRIMARY_BTN}>
              Sign in with Google
            </button>
            <p className="text-sm text-neutral-500 mt-4">
              We keep your name, the email you sign in with, and the places you save.
              Nothing else.
            </p>
          </div>
        </Container>
      </Layout>
    )
  }

  const addFormOpen = addOpen || locations.length === 0

  const addLocationForm = (
    <form onSubmit={handleAddLocation} className="space-y-4">
      <div>
        <label htmlFor="newLabel" className="block text-sm font-semibold mb-1">
          Label
        </label>
        <input
          id="newLabel"
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="e.g. Home, Office"
          maxLength={50}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="newWardName" className="block text-sm font-semibold mb-1">
          Ward
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <WardSelect
              id="newWardName"
              value={newWardName}
              onChange={wardName => {
                setNewWardName(wardName)
                setNewLat(null)
                setNewLng(null)
              }}
              wards={wards}
            />
          </div>
          <button
            type="button"
            onClick={handleLocateNew}
            disabled={locatingNew}
            className={INLINE_BTN}
          >
            {locatingNew ? (
              'Locating…'
            ) : (
              <>
                <LocateIcon size={14} />
                Locate me
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowNewPicker(v => !v)}
            className={INLINE_BTN}
          >
            {showNewPicker ? 'Hide map' : 'Pick on map'}
          </button>
        </div>
        {newLat != null && newLng != null && (
          <p className="text-xs text-neutral-500 mt-2">
            📍 Pinned: {newLat.toFixed(5)}, {newLng.toFixed(5)}{' '}
            <button
              type="button"
              onClick={() => { setNewLat(null); setNewLng(null) }}
              className="hover:text-black underline"
            >
              Clear pin
            </button>
          </p>
        )}
        {showNewPicker && (
          <div className="mt-3">
            <LocationPickerMap lat={newLat} lng={newLng} onPick={handlePickNew} />
          </div>
        )}
        {locateNewError && <p className="text-amber-600 text-xs mt-2">{locateNewError}</p>}
        {!showNewPicker && newLat == null && (
          <p className="text-xs text-neutral-500 mt-2">
            A pin is optional — without one you get ward-wide counts instead of distances.
          </p>
        )}
      </div>

      {addError && <p className="text-red-600 text-sm">{addError}</p>}

      <button
        type="submit"
        disabled={adding || !newLabel.trim() || !newWardName}
        className={PRIMARY_BTN}
      >
        {adding ? 'Adding…' : 'Add place'}
      </button>
    </form>
  )

  return (
    <Layout preview={false}>
      <Container>
        <Head><title>Your places | Lucknow</title></Head>

        <div className="max-w-3xl mx-auto pt-10 md:pt-14 pb-24">
          {/* Who you are */}
          <section className="flex items-start gap-4 mb-12">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full shrink-0"
              />
            ) : (
              <span className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">
                {(name || session?.user?.email || '?').slice(0, 1).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {editingName ? (
                <form onSubmit={handleSaveName}>
                  <label htmlFor="name" className="block text-sm font-semibold mb-1">
                    Your name
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Yash Verma"
                      maxLength={200}
                      className={`${INPUT} sm:max-w-xs`}
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <button type="submit" disabled={savingName} className={SMALL_BTN}>
                        {savingName ? 'Saving…' : 'Save'}
                      </button>
                      {savedAt && (
                        <button
                          type="button"
                          onClick={() => { setEditingName(false); setNameError(null) }}
                          className={QUIET_BTN}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  {nameError && <p className="text-red-600 text-sm mt-2">{nameError}</p>}
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tighter leading-tight truncate">
                      {name || 'Your places'}
                    </h1>
                    {session?.user?.email && (
                      <p className="text-sm text-neutral-500 truncate">{session.user.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className={`${QUIET_BTN} shrink-0 pt-2`}
                  >
                    Edit name
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Saved places */}
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3 mb-6">
              <h2 className="text-2xl font-bold tracking-tighter">
                Saved places{' '}
                {locations.length > 0 && (
                  <span className="text-neutral-400 font-normal">{locations.length}</span>
                )}
              </h2>
              {locations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddOpen(v => !v)}
                  className="text-sm font-bold hover:underline shrink-0"
                >
                  {addOpen ? 'Cancel' : '+ Add a place'}
                </button>
              )}
            </div>

            {addFormOpen && (
              <div className="border border-neutral-300 p-5 md:p-6 mb-8">
                {locations.length === 0 && (
                  <>
                    <h3 className="text-lg font-bold tracking-tighter mb-1">
                      Add your first place
                    </h3>
                    <p className="text-sm text-neutral-600 mb-5">
                      Pick a ward from the list, or drop a pin and we&apos;ll work out the
                      ward for you.
                    </p>
                  </>
                )}
                {addLocationForm}
              </div>
            )}

            <div className="space-y-6">
              {locations.map(loc => {
                const meta = wardMeta(loc.wardName)
                const pincodes = pincodesFor(loc, meta)
                const amenities = amenitiesById[loc.id]
                const amenityItems = amenityItemsById[loc.id]
                const amenitiesLoading = amenitiesLoadingId[loc.id]
                const amenitiesFailed = amenitiesFailedId[loc.id]
                const isEditing = editingId === loc.id
                const pinLat = loc.lat
                const pinLng = loc.lng

                if (isEditing) {
                  return (
                    <form
                      key={loc.id}
                      onSubmit={handleSaveEdit}
                      className="border border-neutral-300 p-5 space-y-3"
                    >
                      <input
                        type="text"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        placeholder="Label, e.g. Home"
                        maxLength={50}
                        className={INPUT}
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <WardSelect
                            id={`editWardName-${loc.id}`}
                            value={editWardName}
                            onChange={wardName => {
                              setEditWardName(wardName)
                              setEditLat(null)
                              setEditLng(null)
                            }}
                            wards={wards}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleLocateEdit}
                          disabled={locatingEdit}
                          className={INLINE_BTN}
                        >
                          {locatingEdit ? (
                            'Locating…'
                          ) : (
                            <>
                              <LocateIcon size={14} />
                              Locate me
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditPicker(v => !v)}
                          className={INLINE_BTN}
                        >
                          {showEditPicker ? 'Hide map' : 'Pick on map'}
                        </button>
                      </div>
                      {editLat != null && editLng != null && (
                        <p className="text-xs text-neutral-500">
                          📍 Pinned: {editLat.toFixed(5)}, {editLng.toFixed(5)}{' '}
                          <button
                            type="button"
                            onClick={() => { setEditLat(null); setEditLng(null) }}
                            className="hover:text-black underline"
                          >
                            Clear pin
                          </button>
                        </p>
                      )}
                      {showEditPicker && (
                        <LocationPickerMap lat={editLat} lng={editLng} onPick={handlePickEdit} />
                      )}
                      {locateEditError && (
                        <p className="text-amber-600 text-xs">{locateEditError}</p>
                      )}
                      {editError && <p className="text-red-600 text-sm">{editError}</p>}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={editSaving || !editLabel.trim() || !editWardName}
                          className={SMALL_BTN}
                        >
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEdit} className={QUIET_BTN}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )
                }

                const nearest =
                  pinLat != null && pinLng != null
                    ? nearestAmenities(amenityItems ?? null, pinLat, pinLng)
                    : []

                return (
                  <article key={loc.id} className="border border-neutral-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold tracking-tighter leading-tight">
                          {loc.label}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {loc.wardName}
                          {meta?.wardNameKannada ? ` · ${meta.wardNameKannada}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        {confirmDeleteId === loc.id ? (
                          <>
                            <span className="text-neutral-500">Remove?</span>
                            <button
                              onClick={() => handleDelete(loc.id)}
                              disabled={deletingId === loc.id}
                              className="font-bold text-red-600 hover:underline disabled:opacity-40"
                            >
                              {deletingId === loc.id ? 'Removing…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-neutral-500 hover:text-black hover:underline"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(loc)}
                              className="text-neutral-500 hover:text-black hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(loc.id)}
                              className="text-neutral-500 hover:text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {meta?.wardNumber && <Chip label="Ward" value={String(meta.wardNumber)} />}
                      {meta?.corporation && <Chip label="Corporation" value={meta.corporation} />}
                      {meta?.constituency && <Chip label="Constituency" value={meta.constituency} />}
                      <Chip
                        label="Pincode"
                        value={pincodes.length ? pincodes.join(', ') : 'Not available'}
                      />
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                        {/* Falls back to ward-wide counts when a pinned
                            location has no per-amenity items to measure from. */}
                        {nearest.length ? 'Nearest to your pin' : 'Across this ward'}
                      </p>

                      {amenitiesLoading ? (
                        <div className="grid grid-cols-2 gap-3" aria-busy="true">
                          {AMENITY_LABELS.map(([key]) => (
                            <div key={key} className="h-20 bg-neutral-100 animate-pulse" />
                          ))}
                          <span className="sr-only">Loading amenities…</span>
                        </div>
                      ) : amenitiesFailed ? (
                        <p className="text-sm text-amber-600">
                          Amenity data is temporarily unavailable — try reloading in a moment.
                        </p>
                      ) : nearest.length ? (
                        <div className="grid grid-cols-2 gap-3">
                          {nearest.map(item => (
                            <AmenityTile
                              key={item.key}
                              icon={item.icon}
                              label={item.label}
                              primary={formatDistance(item.distanceM)}
                              secondary={item.name}
                            />
                          ))}
                        </div>
                      ) : amenities ? (
                        <div className="grid grid-cols-2 gap-3">
                          {AMENITY_LABELS.map(([key, icon, label]) => (
                            <AmenityTile
                              key={key}
                              icon={icon}
                              label={label}
                              primary={String(amenities[key])}
                              secondary="in this ward"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">
                          No amenity data for this ward yet.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-neutral-100">
                      <Link
                        href={`/map?ward=${encodeURIComponent(loc.wardName)}`}
                        className="text-sm font-bold hover:underline"
                      >
                        View on the map →
                      </Link>
                      <span className="text-xs text-neutral-500">
                        {pinLat != null && pinLng != null ? (
                          <>📍 {pinLat.toFixed(5)}, {pinLng.toFixed(5)}</>
                        ) : (
                          <>No pin — edit to add one for exact distances</>
                        )}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          {savedAt && (
            <p className="text-xs text-neutral-400 mt-12">
              Profile last saved {new Date(savedAt).toLocaleString()}
            </p>
          )}
        </div>
      </Container>
    </Layout>
  )
}
