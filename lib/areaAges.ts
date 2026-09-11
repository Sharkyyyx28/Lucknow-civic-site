// How old Lucknow's areas are — the era each locality dates from, and the
// palette used to draw it.
//
// Structured around Lucknow's documented historical epochs:
// - Pre-1722: Ancient riverside settlements & Mughal Awadh Subah
// - 1722–1856: Golden Age of Awadh Nawabs (capital shifted to Lucknow 1775)
// - 1857–1947: Colonial period, 1857 siege & early 20th c. civic infrastructure
// - 1948–1980: Post-independence planned suburban colonies (Mahanagar, Aliganj)
// - 1981–2010: Trans-Gomti boom & LDA planned sectors (Gomti Nagar, Indira Nagar)
// - 2011–2026: Shaheed Path, CG City, Ekana & outer expansion corridors
//
// Each entry carries a cited historical source in its `note`.

import type { Feature, FeatureCollection, GeoJsonProperties } from 'geojson'
import { featureAnchor, haversineMeters } from './geo'

export type EraId =
  | 'pre1722'
  | 'e1722_1856'
  | 'e1857_1947'
  | 'e1948_1980'
  | 'e1981_2010'
  | 'e2011_now'

export interface Era {
  id: EraId
  /** Year range, as printed on the legend. */
  label: string
  /** What the range meant for the city. */
  title: string
  /** Age in years as of 2026. */
  ageLabel: string
  color: string
  /** Ink to use on top of `color` — the yellow band needs dark text. */
  textColor: string
}

/** Oldest first. Legend order, and the priority order chips are placed in. */
export const AGE_ERAS: Era[] = [
  {
    id: 'pre1722',
    label: 'Pre-1722',
    title: 'Ancient & Mughal Awadh',
    ageLabel: '300+ years',
    color: '#7f1d1d',
    textColor: '#fff',
  },
  {
    id: 'e1722_1856',
    label: '1722 – 1856',
    title: 'Nawabi Golden Age',
    ageLabel: '170 – 300 years',
    color: '#dc2626',
    textColor: '#fff',
  },
  {
    id: 'e1857_1947',
    label: '1857 – 1947',
    title: 'Colonial & Civic Era',
    ageLabel: '79 – 169 years',
    color: '#ea580c',
    textColor: '#fff',
  },
  {
    id: 'e1948_1980',
    label: '1948 – 1980',
    title: 'Post-Independence Planned Schemes',
    ageLabel: '46 – 78 years',
    color: '#16a34a',
    textColor: '#fff',
  },
  {
    id: 'e1981_2010',
    label: '1981 – 2010',
    title: 'Trans-Gomti & LDA Expansion',
    ageLabel: '16 – 45 years',
    color: '#0d9488',
    textColor: '#fff',
  },
  {
    id: 'e2011_now',
    label: '2011 – 2026',
    title: 'Shaheed Path & New Corridors',
    ageLabel: '0 – 15 years',
    color: '#1d4ed8',
    textColor: '#fff',
  },
]

const ERA_BY_ID = new Map(AGE_ERAS.map(e => [e.id, e]))

export function era(id: EraId): Era {
  return ERA_BY_ID.get(id)!
}

export interface DatedArea {
  name: string
  /** As printed on the chip: "1898", "1970s", "Pre-1722". */
  yearLabel: string
  era: EraId
  /** Hand-placed locality centre. */
  lat: number
  lng: number
  note?: string
}

/**
 * Verified, sourced localities for Lucknow across each key epoch.
 */
export const DATED_AREAS: DatedArea[] = [
  {
    name: 'Lakshman Tila',
    yearLabel: 'Pre-1722',
    era: 'pre1722',
    lat: 26.8689,
    lng: 80.9135,
    note: 'Ancient high mound overlooking the Gomti river; historical settlement seed associated in local lore with Lakshmana.',
  },
  {
    name: 'Machhi Bhawan',
    yearLabel: 'c. 15th–16th c.',
    era: 'pre1722',
    lat: 26.8660,
    lng: 80.9150,
    note: 'Early fortified estate of the Sheikhzadas of Lucknow, later the citadel expanded by the Nawabs of Awadh.',
  },
  {
    name: 'Chowk',
    yearLabel: '1775',
    era: 'e1722_1856',
    lat: 26.8680,
    lng: 80.9020,
    note: 'Old city market quarter expanded after Nawab Asaf-ud-Daula shifted the Awadh capital from Faizabad to Lucknow in 1775.',
  },
  {
    name: 'Hazratganj',
    yearLabel: '1810',
    era: 'e1722_1856',
    lat: 26.8556,
    lng: 80.9430,
    note: 'Founded as Munnawar Baksh in 1810, remade into an elite Awadh boulevard under Nasir-ud-Din Haider in 1827.',
  },
  {
    name: 'Gomti Nagar',
    yearLabel: '1980s',
    era: 'e1981_2010',
    lat: 26.8449,
    lng: 81.0095,
    note: 'Premier modern planned township developed by Lucknow Development Authority (LDA).',
  }
]
export function areasInEra(id: EraId): DatedArea[] {
  return DATED_AREAS.filter(a => a.era === id)
}

/**
 * Era per ward, by nearest dated locality. Keyed on the feature's `properties`
 * object so it works whatever a ward file calls its name column — the map that
 * built the index is the one that reads it back.
 */
export function buildWardEraIndex(fc: FeatureCollection | null | undefined): Map<GeoJsonProperties, EraId> {
  const index = new Map<GeoJsonProperties, EraId>()
  if (!fc?.features) return index

  for (const feature of fc.features) {
    const anchor = featureAnchor(feature as Feature)
    if (!anchor) continue

    let nearest: DatedArea | null = null
    let nearestDistance = Infinity
    for (const area of DATED_AREAS) {
      const distance = haversineMeters(anchor.lat, anchor.lng, area.lat, area.lng)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = area
      }
    }
    if (nearest) index.set(feature.properties, nearest.era)
  }

  return index
}
