// How old Lucknow's areas are — the era each locality dates from, and the
// palette used to draw it.
//
// The Bengaluru build this project started from sourced this from a widely
// circulated infographic ("How old are Bengaluru areas?", SBR Review 2026)
// with 42 dated Bengaluru localities. That infographic doesn't cover Lucknow,
// and no equivalent single source exists for it. DATED_AREAS below is
// instead a much shorter, independently fact-checked list: one to a few
// well-documented localities per era, each with a citable source (Wikipedia,
// district-government history pages, institutional histories) summarised in
// its `note`. It is not a comprehensive survey of Lucknow's neighbourhoods —
// just enough real, sourced points for the ward tint and chips to mean
// something. Coordinates are hand-placed locality centres from published
// lat/lng, not surveyed. See BUILD-NOTES.md for what a fuller version of
// this would need.

import type { Feature, FeatureCollection, GeoJsonProperties } from 'geojson'
import { featureAnchor, haversineMeters } from './geo'

export type EraId =
  | 'pre1537'
  | 'e1537_1700'
  | 'e1701_1900'
  | 'e1901_1950'
  | 'e1951_1980'
  | 'e1981_2000'
  | 'e2001_now'

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
    id: 'pre1537',
    label: 'Pre-1537',
    title: 'Ancient settlements',
    ageLabel: '500+ years',
    color: '#7f1d1d',
    textColor: '#fff',
  },
  {
    id: 'e1537_1700',
    label: '1537 – 1700',
    title: 'Founding Lucknow',
    ageLabel: '330 – 490 years',
    color: '#dc2626',
    textColor: '#fff',
  },
  {
    id: 'e1701_1900',
    label: '1701 – 1900',
    title: 'Colonial & princely era',
    ageLabel: '125 – 325 years',
    color: '#ea580c',
    textColor: '#fff',
  },
  {
    id: 'e1901_1950',
    label: '1901 – 1950',
    title: 'Early planned growth',
    ageLabel: '76 – 125 years',
    color: '#facc15',
    textColor: '#422006',
  },
  {
    id: 'e1951_1980',
    label: '1951 – 1980',
    title: 'Post-independence expansion',
    ageLabel: '46 – 75 years',
    color: '#16a34a',
    textColor: '#fff',
  },
  {
    id: 'e1981_2000',
    label: '1981 – 2000',
    title: 'IT & modern Lucknow',
    ageLabel: '26 – 45 years',
    color: '#0d9488',
    textColor: '#fff',
  },
  {
    id: 'e2001_now',
    label: '2001 – 2026',
    title: 'New growth corridors',
    ageLabel: '0 – 25 years',
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
  /** As printed on the chip: "1898", "1970s", "Pre-1537". */
  yearLabel: string
  era: EraId
  /** Hand-placed locality centre. */
  lat: number
  lng: number
  note?: string
}

/**
 * A short, sourced list for Lucknow — see the file header. Ordered oldest
 * era first, per the AgeChips overlap-priority comment in
 * components/area-age-layer.tsx.
 */
export const DATED_AREAS: DatedArea[] = [
  {
    name: 'Lakshman Tila',
    yearLabel: '13th c.',
    era: 'pre1537',
    lat: 26.8676,
    lng: 80.9146,
    note: 'Riverside mound tradition links to Lakshmana; the earliest attested settlement here dates to Delhi Sultanate/Sharqi rule from around the 13th–14th century, before the Mughals arrived.',
  },
  {
    name: 'Chowk',
    yearLabel: '1580',
    era: 'e1537_1700',
    lat: 26.8639,
    lng: 80.9028,
    note: 'Rose under Akbar as headquarters of the Awadh sarkar (Ain-i-Akbari, 1580); the Akbari Darwaza gateway and the Machhi Bhawan fort built by Sheikh Abdur Rahim date from this Mughal period.',
  },
  {
    name: 'The Residency',
    yearLabel: '1780–1800',
    era: 'e1701_1900',
    lat: 26.8618,
    lng: 80.9257,
    note: 'Built for the British Resident under Asaf-ud-Daula and completed under Saadat Ali Khan II; besieged for 87 days during the 1857 uprising.',
  },
  {
    name: 'Hazratganj',
    yearLabel: '1810',
    era: 'e1701_1900',
    lat: 26.8556,
    lng: 80.9430,
    note: 'Founded as Munnawar Baksh in 1810, remade into an elite Awadh market under Nasir-ud-Din Haider in 1827, and later renamed for Wajid Ali Shah.',
  },
  {
    name: 'Aminabad',
    yearLabel: '1840s',
    era: 'e1701_1900',
    lat: 26.8558,
    lng: 80.9282,
    note: 'Market quarter founded under Nawab Amjad Ali Shah, later a bazaar district often compared to Chandni Chowk in Old Delhi.',
  },
  {
    name: 'Qaiserbagh',
    yearLabel: '1848–1850',
    era: 'e1701_1900',
    lat: 26.8568,
    lng: 80.9275,
    note: 'Palace-garden complex built by Nawab Wajid Ali Shah, the last ruler of Awadh, at a cost of about 80 lakh rupees.',
  },
  {
    name: 'Charbagh',
    yearLabel: '1914–1923',
    era: 'e1901_1950',
    lat: 26.8320,
    lng: 80.9190,
    note: 'Charbagh railway station, blending Mughal, Rajasthani and British styles, had its foundation laid in 1914 and was completed in 1923.',
  },
  {
    name: 'Rajajipuram',
    yearLabel: 'c. 1970',
    era: 'e1951_1980',
    lat: 26.8470,
    lng: 80.8763,
    note: 'Planned housing scheme raised by the UP Awas Vikas Parishad (established 1966) in its first wave of Lucknow colonies.',
  },
  {
    name: 'Aliganj',
    yearLabel: 'c. 1970',
    era: 'e1951_1980',
    lat: 26.9110,
    lng: 80.9531,
    note: 'Developed by the UP Avas Evam Vikas Parishad from the late 1960s; now the second-largest planned residential locality in the city.',
  },
  {
    name: 'Indira Nagar',
    yearLabel: '1970s',
    era: 'e1951_1980',
    lat: 26.8833,
    lng: 80.9833,
    note: 'Planned by the UP Housing and Development Board, growing from an initial 4 blocks to 25 as surrounding villages merged in.',
  },
  {
    name: 'Gomti Nagar',
    yearLabel: '1980s',
    era: 'e1981_2000',
    lat: 26.8449,
    lng: 81.0095,
    note: 'Organised settlement raised by the Lucknow Development Authority across three phases from the 1980s; now the commercial and IT hub of the city.',
  },
  {
    name: 'Sushant Golf City',
    yearLabel: '2000s',
    era: 'e2001_now',
    lat: 26.7841,
    lng: 80.9905,
    note: "Ansal API township along Amar Shaheed Path, part of Lucknow's newest growth corridor toward the Lucknow–Sultanpur highway.",
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
