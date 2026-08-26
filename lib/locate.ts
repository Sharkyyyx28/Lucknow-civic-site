// Browser-side helpers for turning "where am I / where did I tap" into a ward.
// The point-in-polygon test itself happens on the server (/api/ward-at-point)
// so pages don't have to download the ~4MB of boundary geometry the map uses.

export async function resolveWardAtPoint(lat: number, lng: number): Promise<string> {
  const res = await fetch(`/api/ward-at-point?lat=${lat}&lng=${lng}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Couldn't determine the ward for that point.")
  return data.wardName as string
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

/** The visitor's current position plus the ward it falls in. */
export async function locateCurrentWard(): Promise<{ wardName: string; lat: number; lng: number }> {
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
