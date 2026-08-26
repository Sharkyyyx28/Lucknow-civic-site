// Shapes and role metadata for the officials directory. Kept free of any `fs`
// import so both the page (client bundle) and lib/officials.ts (server) can
// use it.
//
// Bengaluru's directory merged three sources: the BBMP road register
// (corporators and department contacts, per ward), OpenCity's MLA CSV, and
// OpenCity's forest-wing CSV. Lucknow has no equivalent open-data portal and
// no ward-level road register, so this directory is scoped down to a single
// source: a hand-verified list of the district's MLAs (state assembly
// members), plus the Mayor. See lib/officialsSources.ts for how that list was
// put together and what was deliberately left out (phone numbers, emails —
// we don't have a verified source for either and won't publish guesses for a
// civic-contact page).

export const ROLE_GROUPS = ['elected'] as const
export type RoleGroup = (typeof ROLE_GROUPS)[number]

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  elected: 'Elected representatives',
}

export const SOURCE_IDS = ['mla-directory', 'lmc-corporators-2023'] as const
export type SourceId = (typeof SOURCE_IDS)[number]

export interface SourceMeta {
  label: string
  url: string
  /** Geographic reach, stated plainly. */
  reach: string
}

export const SOURCES: Record<SourceId, SourceMeta> = {
  'mla-directory': {
    label: 'MLA, MP & Mayor directory (hand-compiled)',
    url: 'https://en.wikipedia.org/wiki/Lucknow_district',
    reach: 'All 9 assembly constituencies covering Lucknow district, the Lok Sabha seat, and the Mayor',
  },
  'lmc-corporators-2023': {
    label: '2023 Lucknow Municipal Corporation election results',
    url: 'https://en.wikipedia.org/wiki/2023_Lucknow_Municipal_Corporation_election',
    reach: 'All 110 LMC wards as delimited for the 2023 election — not the same delimitation as the map’s ward boundary layer',
  },
}

export interface Role {
  id: string
  label: string
  group: RoleGroup
  source: SourceId
}

export const ROLES: Role[] = [
  { id: 'mla', label: 'MLA (Member of Legislative Assembly)', group: 'elected', source: 'mla-directory' },
  { id: 'mp', label: 'MP (Member of Parliament)', group: 'elected', source: 'mla-directory' },
  { id: 'mayor', label: 'Mayor', group: 'elected', source: 'mla-directory' },
  { id: 'corporator', label: 'Corporator (LMC ward member)', group: 'elected', source: 'lmc-corporators-2023' },
]

export interface OfficialContact {
  /** `<role id>:<slugified name>` */
  id: string
  role: string
  source: SourceId
  name: string
  party?: string
  phones: string[]
  email?: string
  /** Constituency name(s), or "Lucknow" for the Mayor. */
  wards: string[]
  coverageLabel: string
  /** Always 0 — kept only so this shares a shape with the road-register era of the directory, in case a future source restores per-road counts. */
  roads: number
}

export interface SourceCoverage {
  id: SourceId
  label: string
  url: string
  reach: string
  updated: string | null
  contacts: number
  live: boolean
}

export interface Coverage {
  sources: SourceCoverage[]
  wardCount: number
  totalWards: number
  roadCount: number
  roadRegisterZones: string[]
  roadRegisterWardCount: number
}

export interface OfficialsDirectory {
  contacts: OfficialContact[]
  wards: string[]
  coverage: Coverage
}

export function roleById(id: string): Role | undefined {
  return ROLES.find(r => r.id === id)
}

export function isRoleGroup(value: unknown): value is RoleGroup {
  return typeof value === 'string' && (ROLE_GROUPS as readonly string[]).includes(value)
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export interface OfficialsQuery {
  q?: string
  ward?: string
  role?: string
  group?: string
  source?: string
}

export function filterOfficials(
  contacts: OfficialContact[],
  { q, ward, role, group, source }: OfficialsQuery
): OfficialContact[] {
  const tokens = (q ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  return contacts.filter(contact => {
    if (role && contact.role !== role) return false
    if (source && contact.source !== source) return false
    if (group && roleById(contact.role)?.group !== group) return false
    if (ward && !contact.wards.includes(ward)) return false
    if (!tokens.length) return true

    const haystack = [
      contact.name,
      contact.party ?? '',
      roleById(contact.role)?.label ?? '',
      contact.phones.join(' '),
      contact.email ?? '',
      contact.coverageLabel,
      contact.wards.join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return tokens.every(token => haystack.includes(token))
  })
}
