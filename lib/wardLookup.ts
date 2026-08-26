// Server-side ward lookups against the 369-ward boundary set. Both the
// point-in-ward API (/api/ward-at-point) and the community feature use this,
// so a pinned post's ward and corporation are decided by the same geometry the
// map draws — never by whatever the client claims.

import { point as turfPoint } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { getWards369 } from './wards'

export interface WardHit {
  wardName: string
  corporation: string
}

/** "123 - Domlur" and "Domlur" are the same ward as far as matching goes. */
function plainName(wardName: string): string {
  return wardName.replace(/^\d+\s*-\s*/, '').trim().toLowerCase()
}

function readProps(feature: unknown): { wardName: string | null; corporation: string } {
  const props = (feature as { properties?: Record<string, unknown> }).properties ?? {}
  return {
    wardName: typeof props.ward_name === 'string' ? props.ward_name : null,
    corporation: typeof props.Corporation === 'string' ? props.Corporation : '',
  }
}

/** The ward containing this point, or null if it falls outside every boundary. */
export async function wardAtPoint(lat: number, lng: number): Promise<WardHit | null> {
  const { geojson } = await getWards369()
  const pt = turfPoint([lng, lat])

  for (const feature of geojson.features) {
    if (!feature.geometry) continue
    const geomType = (feature.geometry as { type?: string }).type
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue
    try {
      if (!booleanPointInPolygon(pt, feature as never)) continue
    } catch {
      continue // malformed geometry — skip
    }
    const { wardName, corporation } = readProps(feature)
    if (!wardName) continue
    return { wardName, corporation }
  }

  return null
}

/** The corporation a named ward belongs to, or '' if the name is unknown. */
export async function corporationForWard(wardName: string): Promise<string> {
  const { geojson } = await getWards369()
  const wanted = plainName(wardName)
  for (const feature of geojson.features) {
    const props = readProps(feature)
    if (props.wardName && plainName(props.wardName) === wanted) return props.corporation
  }
  return ''
}
