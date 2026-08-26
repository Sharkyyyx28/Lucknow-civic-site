import type { Feature, Position } from 'geojson'

// Great-circle distance in meters between two lat/lng points.
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ── Polygon anchor points ────────────────────────────────────────────────────

// A point to hang something off inside a polygon — used to stand a ward in for
// its shape when measuring distances. A plain bounding-box centre falls outside
// anything L-shaped or crescent-shaped (several wards wrap a lake), so this
// takes the centroid's latitude and then slides the point to the middle of the
// widest strip of polygon at that latitude, which is always inside the ring.

/** Outer rings only — holes never hold the anchor. */
function outerRings(feature: Feature): Position[][] {
  const geometry = feature.geometry
  if (!geometry) return []
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.length ? [geometry.coordinates[0]] : []
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(polygon => polygon[0]).filter(Boolean)
  }
  return []
}

/** Signed shoelace area, in square degrees. */
function ringArea(ring: Position[]): number {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return sum / 2
}

function ringCentroidLat(ring: Position[], area: number): number {
  let cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    cy += (ring[j][1] + ring[i][1]) * cross
  }
  return cy / (6 * area)
}

/**
 * Midpoint of the widest run of polygon interior along the horizontal line at
 * `lat` — the roomiest spot on that line. Null if the line misses the ring.
 */
function widestSpanLng(ring: Position[], lat: number): number | null {
  const crossings: number[] = []
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j]
    const [x2, y2] = ring[i]
    if (y1 > lat !== y2 > lat) {
      crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1))
    }
  }
  crossings.sort((a, b) => a - b)

  let widest = 0
  let midpoint: number | null = null
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const width = crossings[i + 1] - crossings[i]
    if (width > widest) {
      widest = width
      midpoint = (crossings[i] + crossings[i + 1]) / 2
    }
  }
  return midpoint
}

export interface FeatureAnchor {
  lat: number
  lng: number
  /** Ring area in square degrees. */
  area: number
}

/** A point inside the feature's largest ring. */
export function featureAnchor(feature: Feature): FeatureAnchor | null {
  // A ward split across a lake or a railway line comes through as a
  // MultiPolygon; the anchor belongs on the biggest piece.
  let ring: Position[] | null = null
  let area = 0
  for (const candidate of outerRings(feature)) {
    const candidateArea = Math.abs(ringArea(candidate))
    if (candidateArea > area) {
      area = candidateArea
      ring = candidate
    }
  }
  if (!ring || !area) return null

  const lat = ringCentroidLat(ring, ringArea(ring))
  if (!Number.isFinite(lat)) return null
  const lng = widestSpanLng(ring, lat)
  if (lng === null) return null

  return { lat, lng, area }
}
