import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Container from '../components/container'
import Layout from '../components/layout'
import SearchableSelect, { type SelectOption } from '../components/searchable-select'
import { getOfficialsDirectory } from '../lib/officials'
import {
  ROLES,
  ROLE_GROUPS,
  ROLE_GROUP_LABELS,
  SOURCES,
  filterOfficials,
  roleById,
  telHref,
  type OfficialContact,
  type OfficialsDirectory,
  type RoleGroup,
} from '../lib/officialsTypes'

export async function getStaticProps() {
  return {
    props: { directory: await getOfficialsDirectory() },
    revalidate: 86400,
  }
}

function ContactCard({ contact }: { contact: OfficialContact }) {
  const role = roleById(contact.role)

  return (
    <li className="flex flex-col rounded-md border border-ink-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
        {role?.label ?? contact.role}
      </p>
      <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-ink-900">
        {contact.name}
      </h3>
      {contact.party && <p className="mt-0.5 text-sm text-ink-600">{contact.party}</p>}

      {contact.phones.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {contact.phones.map(phone => (
            <li key={phone}>
              <a
                href={telHref(phone)}
                className="inline-block rounded border border-ink-300 px-2.5 py-1 font-mono text-sm text-ink-800 transition-colors hover:border-brand-600 hover:text-brand-800"
              >
                {phone}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-500">No verified office number published for this seat.</p>
      )}

      {contact.email && (
        <p className="mt-2 truncate text-sm">
          <a
            href={`mailto:${contact.email}`}
            className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
          >
            {contact.email}
          </a>
        </p>
      )}

      <div className="mt-4 border-t border-ink-100 pt-3">
        <p className="text-sm leading-relaxed text-ink-600">{contact.coverageLabel}</p>
      </div>

      <p className="mt-3 text-xs text-ink-400">{SOURCES[contact.source].label}</p>
    </li>
  )
}

export default function OfficialsPage({ directory }: { directory: OfficialsDirectory }) {
  const { contacts, wards, coverage } = directory
  const router = useRouter()

  const [q, setQ] = useState('')
  const [ward, setWard] = useState('')
  const [group, setGroup] = useState<RoleGroup | ''>('')
  const [role, setRole] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const { ward: wardParam, role: roleParam, q: qParam } = router.query
    if (typeof wardParam === 'string' && wardParam) setWard(wardParam)
    if (typeof roleParam === 'string' && roleParam) {
      setRole(roleParam)
      const roleGroup = roleById(roleParam)?.group
      if (roleGroup) setGroup(roleGroup)
    }
    if (typeof qParam === 'string' && qParam) setQ(qParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])

  const wardOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Every constituency', search: 'every all ward' },
      ...wards.map(name => ({
        value: name,
        label: name,
        search: name.toLowerCase(),
      })),
    ],
    [wards]
  )

  const rolesInGroup = useMemo(
    () => (group ? ROLES.filter(r => r.group === group) : ROLES),
    [group]
  )

  const results = useMemo(
    () => filterOfficials(contacts, { q, ward, role, group }),
    [contacts, q, ward, role, group]
  )

  const sections = useMemo(() => {
    const byGroup = new Map<RoleGroup, OfficialContact[]>()
    for (const contact of results) {
      const g = roleById(contact.role)?.group
      if (!g) continue
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g)!.push(contact)
    }
    return ROLE_GROUPS.filter(g => byGroup.has(g)).map(g => ({
      group: g,
      contacts: byGroup.get(g)!,
    }))
  }, [results])

  const filtered = Boolean(q || ward || role || group)

  const clearAll = () => {
    setQ('')
    setWard('')
    setRole('')
    setGroup('')
  }

  return (
    <Layout preview={false}>
      <Container>
        <Head>
          <title>Officials directory | Lucknow</title>
          <meta
            name="description"
            content="Lucknow's MP, MLAs, Mayor and LMC ward corporators — a hand-verified directory of who represents each constituency and ward."
          />
        </Head>

        <div className="pb-24 pt-10 md:pt-14">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Officials &amp; representatives
            </p>
            <h1 className="mb-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
              Who represents Lucknow
            </h1>
            <p className="text-lg leading-relaxed text-ink-600">
              Lucknow&apos;s Lok Sabha MP, the MLAs for its 9 assembly constituencies, the Mayor of
              Lucknow Municipal Corporation, and the 110 ward corporators elected in 2023.
            </p>
          </div>

          <div className="mt-8 max-w-3xl rounded-md border border-accent-300 bg-accent-100/50 p-5">
            <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
              Before you rely on this
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-700">
              {coverage.sources.map(source => (
                <li key={source.id}>
                  <strong>{source.label}</strong> — {source.contacts}{' '}
                  {source.contacts === 1 ? 'entry' : 'entries'}. {source.reach}. Verified{' '}
                  {source.updated ?? 'at an unknown date'}.
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 border-b border-t border-ink-200 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Search
                </span>
                <input
                  type="search"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Name, party or constituency"
                  className="w-full border border-ink-300 px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Department
                </span>
                <select
                  value={group}
                  onChange={e => {
                    const next = e.target.value as RoleGroup | ''
                    setGroup(next)
                    if (next && roleById(role)?.group !== next) setRole('')
                  }}
                  className="w-full border border-ink-300 bg-white px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none"
                >
                  <option value="">All</option>
                  {ROLE_GROUPS.map(g => (
                    <option key={g} value={g}>
                      {ROLE_GROUP_LABELS[g]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Role
                </span>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-ink-300 bg-white px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none"
                >
                  <option value="">All roles</option>
                  {rolesInGroup.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Constituency
                </span>
                <SearchableSelect
                  id="ward-filter"
                  value={ward}
                  onChange={setWard}
                  options={wardOptions}
                  ariaLabel="Filter by constituency"
                  placeholder="Every constituency"
                  searchPlaceholder="Search constituencies…"
                />
              </div>
            </div>
          </div>

          <p className="mb-8 mt-4 text-sm text-ink-500">
            {results.length.toLocaleString('en-IN')}{' '}
            {results.length === 1 ? 'result' : 'results'}
            {ward && <> in {ward}</>}.
            {filtered && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </p>

          {results.length === 0 ? (
            <div className="rounded-md border border-ink-300 p-6">
              <h2 className="mb-1 font-display text-lg font-bold tracking-tight text-ink-900">
                Nothing matches
              </h2>
              <p className="mb-4 text-sm text-ink-600">
                No one matches these filters. This directory only covers MLAs and the Mayor.
              </p>
              <button type="button" onClick={clearAll} className="text-sm font-bold hover:underline">
                Clear filters →
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {sections.map(section => (
                <section key={section.group}>
                  <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-ink-900">
                    {ROLE_GROUP_LABELS[section.group]}
                    <span className="ml-2 text-base font-normal text-ink-400">
                      {section.contacts.length}
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {section.contacts.map(contact => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="mt-16 max-w-3xl border-t border-ink-200 pt-6 text-sm leading-relaxed text-ink-500">
            <h2 className="mb-2 font-display text-base font-bold tracking-tight text-ink-900">
              Where this comes from
            </h2>
            <p className="mb-3">
              Two sources, hand-compiled rather than fetched: MLA, MP and Mayor names and parties
              were checked against Wikipedia constituency pages and public 2022 Uttar Pradesh
              Legislative Assembly / 2024 Lok Sabha election results. The 110 corporators were
              transcribed from Wikipedia&apos;s results table for the 2023 Lucknow Municipal
              Corporation election — a different ward delimitation than the map&apos;s ward
              boundary layer, so ward names here won&apos;t generally match what you see on{' '}
              <a href="/map" className="text-brand-700 underline">the map</a>. Nothing here is
              scraped or auto-refreshed — see{' '}
              <code className="font-mono text-ink-700">lib/officialsSources.ts</code> in the
              source for the full lists and their verification dates. The merged data is available
              as JSON from <code className="font-mono text-ink-700">/api/officials</code>.
            </p>
            <p>
              Deliberately not published: office phone numbers, emails and postal addresses. We
              don&apos;t have a verified source for any of them, and guessing at contact details
              on a civic-information page does more harm than leaving the field blank.
            </p>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
