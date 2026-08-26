// Lucknow's rail network — modelled as *dated segments* so the map can be
// replayed at any point in time: what was open in 2017, what is open today,
// what the announced date for the Blue Line would add.
//
// Coordinate provenance
// ---------------------
// Unlike the Bengaluru build this project started from (which had real OSM
// route-relation coordinates for its operational lines), NONE of the station
// coordinates below are surveyed. They are hand-placed along each corridor's
// known real-world alignment, using the station names and general geography
// of Lucknow. Treat every position here as "roughly here", not as a
// engineering drawing or an OSM-verified point — the whole network is marked
// `indicative: true` for this reason, including the operational Red Line.
//
// Date provenance
// ---------------
// `dateKind: 'actual'` dates are recorded openings (Red Line). `'estimate'`
// is a press/DPR figure with no CMRS clearance behind it — for the Blue Line,
// sources disagree (2027 per some metro-tracking sites, 2029 per Wikipedia's
// summary of the DPR/Cabinet approval), and that disagreement is written into
// the segment's `note` rather than silently resolved.

export type NetworkStation = {
  name: string
  lat: number
  lng: number
  interchange?: string
}

export type DateKind = 'actual' | 'target' | 'estimate'

export type LineSegment = {
  id: string
  label: string
  from: number
  to: number
  date: string
  dateKind: DateKind
  lengthKm?: number
  note?: string
}

export type NetworkLine = {
  id: string
  name: string
  mode: 'metro' | 'suburban'
  color: string
  phase: string
  stations: NetworkStation[]
  segments: LineSegment[]
  indicative?: boolean
}

// ---------------------------------------------------------------------------
// Red Line — operational. Chaudhary Charan Singh (CCS) Airport to Munshi
// Pulia, 23 km, 21 stations. Station order and names verified against
// Wikipedia; coordinates are hand-placed along the known corridor (see note
// above) — not surveyed.
// ---------------------------------------------------------------------------

const RED_STATIONS: NetworkStation[] = [
  { name: 'CCS International Airport', lat: 26.7606, lng: 80.8893 },
  { name: 'Amausi', lat: 26.7706, lng: 80.8873 },
  { name: 'Transport Nagar', lat: 26.7862, lng: 80.8949 },
  { name: 'Krishna Nagar', lat: 26.7959, lng: 80.8991 },
  { name: 'Singar Nagar', lat: 26.8039, lng: 80.9036 },
  { name: 'Alambagh', lat: 26.8121, lng: 80.9081 },
  { name: 'Alambagh ISBT', lat: 26.8145, lng: 80.9106 },
  { name: 'Mawaiya', lat: 26.8206, lng: 80.9138 },
  { name: 'Durgapuri', lat: 26.8258, lng: 80.917 },
  { name: 'Charbagh', lat: 26.8302, lng: 80.9204, interchange: 'Blue Line (under construction)' },
  { name: 'Hussainganj', lat: 26.8395, lng: 80.927 },
  { name: 'Sachivalaya', lat: 26.8461, lng: 80.935 },
  { name: 'Hazratganj', lat: 26.8489, lng: 80.9412 },
  { name: 'KD Singh Babu Stadium', lat: 26.852, lng: 80.945 },
  { name: 'Vishwavidyalaya', lat: 26.858, lng: 80.95 },
  { name: 'IT College', lat: 26.863, lng: 80.954 },
  { name: 'Badshahnagar', lat: 26.869, lng: 80.96 },
  { name: 'Lekhraj Market', lat: 26.874, lng: 80.965 },
  { name: 'Bhootnath Market', lat: 26.879, lng: 80.97 },
  { name: 'Indira Nagar', lat: 26.883, lng: 80.975 },
  { name: 'Munshi Pulia', lat: 26.887, lng: 80.98 },
]

// ---------------------------------------------------------------------------
// Blue Line — under construction. East–west corridor, Charbagh to Vasant
// Kunj, 11.1 km, 12 stations. Approved by the state in January 2024, cleared
// by the Union Cabinet in August 2025. Station order per yometro.com's route
// listing (see BUILD-NOTES.md); no CMRS-cleared opening date exists.
// ---------------------------------------------------------------------------

const BLUE_STATIONS: NetworkStation[] = [
  { name: 'Charbagh', lat: 26.8302, lng: 80.9204, interchange: 'Red Line' },
  { name: 'Gautam Buddha Marg', lat: 26.8375, lng: 80.915 },
  { name: 'Aminabad', lat: 26.848, lng: 80.916 },
  { name: 'Pandeyganj', lat: 26.853, lng: 80.913 },
  { name: 'City Railway Station', lat: 26.856, lng: 80.909 },
  { name: 'Medical College Chauraha', lat: 26.863, lng: 80.907 },
  { name: 'Nawazganj', lat: 26.867, lng: 80.902 },
  { name: 'Thakurganj', lat: 26.872, lng: 80.896 },
  { name: 'Balaganj', lat: 26.877, lng: 80.891 },
  { name: 'Sarfarazganj', lat: 26.881, lng: 80.886 },
  { name: 'Musabagh', lat: 26.885, lng: 80.879 },
  { name: 'Vasant Kunj', lat: 26.89, lng: 80.872 },
]

// ---------------------------------------------------------------------------
// The network
// ---------------------------------------------------------------------------

export const NETWORK: NetworkLine[] = [
  {
    id: 'red',
    name: 'Red Line',
    mode: 'metro',
    color: '#dc2626',
    phase: 'Phase 1',
    indicative: true,
    stations: RED_STATIONS,
    segments: [
      {
        id: 'red-priority',
        label: 'Transport Nagar – Charbagh (priority section)',
        from: 2,
        to: 9,
        date: '2017-09-06',
        dateKind: 'actual',
        lengthKm: 8.5,
        note: 'The first section to open — Lucknow Metro\'s inaugural passenger service.',
      },
      {
        id: 'red-south',
        label: 'CCS Airport – Transport Nagar',
        from: 0,
        to: 1,
        date: '2019-03-08',
        dateKind: 'actual',
        lengthKm: 3.4,
      },
      {
        id: 'red-north',
        label: 'Charbagh – Munshi Pulia',
        from: 10,
        to: 20,
        date: '2019-03-08',
        dateKind: 'actual',
        lengthKm: 11.1,
        note: 'Completed the full 23 km Red Line end to end.',
      },
    ],
  },
  {
    id: 'blue',
    name: 'Blue Line',
    mode: 'metro',
    color: '#2563eb',
    phase: 'Phase 1B',
    indicative: true,
    stations: BLUE_STATIONS,
    segments: [
      {
        id: 'blue-all',
        label: 'Charbagh – Vasant Kunj',
        from: 0,
        to: 11,
        date: '2029-12-31',
        dateKind: 'estimate',
        lengthKm: 11.1,
        note: 'East-west corridor through old Lucknow. Approved by the state government in January 2024 and cleared by the Union Cabinet in August 2025 at a cost of roughly ₹5,881 crore. Sources disagree on a completion date: some metro-tracking sites cite 2027, while other reporting around the Cabinet approval points to 2029. Neither is CMRS-cleared, so this is a placeholder, not a commitment.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

export type Milestone = LineSegment & {
  lineId: string
  lineName: string
  lineColor: string
  mode: NetworkLine['mode']
  stationCount: number
}

/** Every opening event across the network, oldest first. */
export const MILESTONES: Milestone[] = NETWORK.flatMap((line) =>
  line.segments.map((seg) => ({
    ...seg,
    lineId: line.id,
    lineName: line.name,
    lineColor: line.color,
    mode: line.mode,
    stationCount: seg.to - seg.from + 1,
  })),
).sort((a, b) => a.date.localeCompare(b.date))

export const FIRST_DATE = MILESTONES[0].date
export const LAST_DATE = MILESTONES[MILESTONES.length - 1].date

/** Months since January 1970 — the unit the timeline slider steps in. */
export function monthIndex(iso: string): number {
  const [y, m] = iso.split('-').map(Number)
  return y * 12 + (m - 1)
}

/** Inverse of monthIndex, resolved to the last day of that month. */
export function monthEnd(index: number): string {
  const y = Math.floor(index / 12)
  const m = index % 12
  const day = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const FIRST_MONTH = monthIndex(FIRST_DATE)
export const LAST_MONTH = monthIndex(LAST_DATE)

/**
 * Contiguous runs of stations that are open (or projected open) on `asOf`.
 *
 * Returned as index runs rather than a flat station set because the geometry
 * matters: when the middle of a line has not opened yet, the line really is
 * two disconnected stubs, and drawing one polyline through the gap would
 * invent a railway that did not exist.
 */
export function openRunsAt(line: NetworkLine, asOf: string): Array<[number, number]> {
  const open = new Array<boolean>(line.stations.length).fill(false)
  for (const seg of line.segments) {
    if (seg.date > asOf) continue
    for (let i = seg.from; i <= seg.to; i++) open[i] = true
  }

  const runs: Array<[number, number]> = []
  let start: number | null = null
  for (let i = 0; i < open.length; i++) {
    if (open[i] && start === null) start = i
    if (!open[i] && start !== null) {
      runs.push([start, i - 1])
      start = null
    }
  }
  if (start !== null) runs.push([start, open.length - 1])
  return runs
}

export type NetworkTotals = {
  /** Route km actually carrying passengers on this date. */
  openKm: number
  openStations: number
  /** Route km whose opening date has passed but was only ever a projection. */
  projectedKm: number
  projectedStations: number
  lines: number
}

/**
 * Network size on a given date, split by how solid the underlying date is.
 * Anything whose segment is `dateKind: 'actual'` counts as open; a target or
 * estimate that the slider has moved past counts as projected, because it has
 * not happened and may not happen on that date.
 */
export function totalsAt(asOf: string, modes: ReadonlySet<NetworkLine['mode']>): NetworkTotals {
  let openKm = 0
  let openStations = 0
  let projectedKm = 0
  let projectedStations = 0
  const lines = new Set<string>()

  for (const line of NETWORK) {
    if (!modes.has(line.mode)) continue
    for (const seg of line.segments) {
      if (seg.date > asOf) continue
      const stations = seg.to - seg.from + 1
      if (seg.dateKind === 'actual') {
        openKm += seg.lengthKm ?? 0
        openStations += stations
      } else {
        projectedKm += seg.lengthKm ?? 0
        projectedStations += stations
      }
      lines.add(line.id)
    }
  }

  return {
    openKm: Math.round(openKm * 10) / 10,
    openStations,
    projectedKm: Math.round(projectedKm * 10) / 10,
    projectedStations,
    lines: lines.size,
  }
}

export function formatMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`
}

export function lineById(id: string): NetworkLine {
  const line = NETWORK.find((l) => l.id === id)
  if (!line) throw new Error(`Unknown line id: ${id}`)
  return line
}
