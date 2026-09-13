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
    yearLabel: '13th c.',
    era: 'pre1722',
    lat: 26.8676,
    lng: 80.9146,
    note: 'Riverside mound tradition linked to Lakshmana; historical settlement recorded under Delhi Sultanate/Sharqi rule prior to Mughal consolidation.',
  },
  {
    name: 'Chowk',
    yearLabel: '1580',
    era: 'pre1722',
    lat: 26.8639,
    lng: 80.9028,
    note: 'Flourished under Akbar as headquarters of the Awadh Sarkar (Ain-i-Akbari, 1580); Akbari Darwaza dates from this Mughal period.',
  },
  {
    name: 'Husainabad',
    yearLabel: '1784',
    era: 'e1722_1856',
    lat: 26.8692,
    lng: 80.9130,
    note: 'Constructed under Nawab Asaf-ud-Daula including the monumental Bara Imambara and Rumi Darwaza after the Awadh capital shifted to Lucknow in 1775.',
  },
  {
    name: 'The Residency',
    yearLabel: '1780–1800',
    era: 'e1722_1856',
    lat: 26.8618,
    lng: 80.9257,
    note: 'Built for the British Resident under Asaf-ud-Daula; focal site of the 87-day siege during the 1857 First War of Independence.',
  },
  {
    name: 'Hazratganj',
    yearLabel: '1810',
    era: 'e1722_1856',
    lat: 26.8556,
    lng: 80.9430,
    note: 'Founded as Munnawar Baksh in 1810, remade into an elite Awadh boulevard under Nasir-ud-Din Haider in 1827 and renamed for Amjad Ali Shah (Hazrat).',
  },
  {
    name: 'Aminabad',
    yearLabel: '1840s',
    era: 'e1722_1856',
    lat: 26.8558,
    lng: 80.9282,
    note: 'Traditional commercial quarter founded under Nawab Amjad Ali Shah; celebrated historic heart of Awadhi trade and literary culture.',
  },
  {
    name: 'Qaiserbagh',
    yearLabel: '1848–1850',
    era: 'e1722_1856',
    lat: 26.8568,
    lng: 80.9275,
    note: 'Vast quadrangle palace complex commissioned by Nawab Wajid Ali Shah, the last ruling Nawab of Awadh.',
  },
  {
    name: 'Charbagh',
    yearLabel: '1914–1923',
    era: 'e1857_1947',
    lat: 26.8320,
    lng: 80.9190,
    note: 'Architectural blend of Rajput and Mughal styles by J.H. Horniman; opened 1923 and host to Gandhi and Nehru\'s historic first meeting in 1916.',
  },
  {
    name: 'Vidhan Sabha Marg',
    yearLabel: '1928',
    era: 'e1857_1947',
    lat: 26.8441,
    lng: 80.9419,
    note: 'Council House constructed in carved Chunar sandstone; inaugurated in 1928 as the legislature seat of the United Provinces.',
  },
  {
    name: 'Mahanagar',
    yearLabel: '1955',
    era: 'e1948_1980',
    lat: 26.8795,
    lng: 80.9525,
    note: 'Among Lucknow\'s first planned residential extensions post-independence across the Gomti river.',
  },
  {
    name: 'Rajajipuram',
    yearLabel: 'c. 1970',
    era: 'e1948_1980',
    lat: 26.8470,
    lng: 80.8763,
    note: 'Substantial western planned housing colony established by the UP Avas Vikas Parishad in its early development drive.',
  },
  {
    name: 'Aliganj',
    yearLabel: 'c. 1970',
    era: 'e1948_1980',
    lat: 26.9110,
    lng: 80.9531,
    note: 'Planned residential settlement by UP Avas Evam Vikas Parishad, home to the historic Purana Aliganj Hanuman Mandir.',
  },
  {
    name: 'Indira Nagar',
    yearLabel: '1970s',
    era: 'e1948_1980',
    lat: 26.8833,
    lng: 80.9833,
    note: 'Planned by the UP Housing and Development Board, growing into one of Asia\'s largest unified residential colonies with 25 distinct blocks.',
  },
  {
    name: 'Gomti Nagar',
    yearLabel: '1980s',
    era: 'e1981_2010',
    lat: 26.8449,
    lng: 81.0095,
    note: 'Premier modern planned township developed by Lucknow Development Authority (LDA); commercial, institutional and cultural hub.',
  },
  {
    name: 'Ashiyana (LDA)',
    yearLabel: '1985',
    era: 'e1981_2010',
    lat: 26.7972,
    lng: 80.9168,
    note: 'Major South Lucknow residential scheme developed by LDA along Kanpur Road.',
  },
  {
    name: 'Sushant Golf City',
    yearLabel: '2010s',
    era: 'e2011_now',
    lat: 26.7841,
    lng: 80.9905,
    note: 'Modern high-density township along Amar Shaheed Path connecting toward Sultanpur Road.',
  },
  {
    name: 'CG City & Ekana Corridor',
    yearLabel: '2016+',
    era: 'e2011_now',
    lat: 26.8055,
    lng: 81.0182,
    note: 'Chak Ganjaria IT & sports hub, home to Ekana International Cricket Stadium, Medanta, and Cancer Institute.',
  },
]

/** Localities of each era, for the legend and the era breakdown. */
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
