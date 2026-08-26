import { useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Container from '../components/container'
import Layout from '../components/layout'
import { listSocialHandles } from '../lib/socialHandles'
import {
  HANDLE_CATEGORIES,
  HANDLE_CATEGORY_LABELS,
  filterSocialHandles,
  instagramUrl,
  xUrl,
  type HandleCategory,
  type SocialHandle,
} from '../lib/socialHandlesTypes'

export async function getStaticProps() {
  // Small directory (a few dozen rows at most) — cheaper to ship it with the
  // page and filter in the browser than to round-trip an API on every
  // keystroke, same reasoning as pages/officials.tsx. A short revalidate
  // (rather than that page's 86400s) because edits made through
  // /admin/social-handles should show up on the public page quickly.
  return {
    props: { handles: await listSocialHandles() },
    revalidate: 60,
  }
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  )
}

function HandleCard({ handle }: { handle: SocialHandle }) {
  return (
    <li className="flex flex-col rounded-md border border-ink-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
        {HANDLE_CATEGORY_LABELS[handle.category]}
      </p>
      <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-ink-900">
        {handle.name}
      </h3>
      {handle.role && <p className="mt-0.5 text-sm text-ink-600">{handle.role}</p>}
      <p className="mt-3 text-sm leading-relaxed text-ink-600">{handle.focus}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
        {handle.x && (
          <a
            href={xUrl(handle.x)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-ink-300 px-2.5 py-1 text-sm text-ink-800 transition-colors hover:border-brand-600 hover:text-brand-800"
          >
            <XIcon />@{handle.x}
          </a>
        )}
        {handle.instagram && (
          <a
            href={instagramUrl(handle.instagram)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded border border-ink-300 px-2.5 py-1 text-sm text-ink-800 transition-colors hover:border-brand-600 hover:text-brand-800"
          >
            <InstagramIcon />@{handle.instagram}
          </a>
        )}
        {handle.website && (
          <a
            href={handle.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded border border-ink-300 px-2.5 py-1 text-sm text-ink-800 transition-colors hover:border-brand-600 hover:text-brand-800"
          >
            Website
          </a>
        )}
      </div>
    </li>
  )
}

export default function SocialHandlesPage({ handles }: { handles: SocialHandle[] }) {
  const { status } = useSession()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<HandleCategory | ''>('')

  const results = useMemo(
    () => filterSocialHandles(handles, { q, category }),
    [handles, q, category]
  )

  const sections = useMemo(() => {
    const byCategory = new Map<HandleCategory, SocialHandle[]>()
    for (const handle of results) {
      if (!byCategory.has(handle.category)) byCategory.set(handle.category, [])
      byCategory.get(handle.category)!.push(handle)
    }
    return HANDLE_CATEGORIES.filter(c => byCategory.has(c)).map(c => ({
      category: c,
      handles: byCategory.get(c)!,
    }))
  }, [results])

  const filtered = Boolean(q || category)
  const clearAll = () => {
    setQ('')
    setCategory('')
  }

  return (
    <Layout preview={false}>
      <Container>
        <Head>
          <title>Social handles directory | Lucknow</title>
          <meta
            name="description"
            content="Who to follow for Lucknow civic issues — the government accounts, NGOs, civic voices and media actively working on the city's roads, water, transit and governance."
          />
        </Head>

        <div className="pb-24 pt-10 md:pt-14">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Who to follow
            </p>
            <h1 className="mb-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
              Social handles directory
            </h1>
            <p className="text-lg leading-relaxed text-ink-600">
              Government accounts, NGOs, civic voices and media actively working on
              Lucknow&apos;s roads, water, transit, lakes and ward governance — a starting
              point for finding out what is happening in your part of the city.
            </p>
            {status === 'authenticated' && (
              <Link
                href="/admin/social-handles"
                className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Manage this directory →
              </Link>
            )}
          </div>

          <div className="mt-8 max-w-3xl rounded-md border border-accent-300 bg-accent-100/50 p-5">
            <h2 className="font-display text-base font-bold tracking-tight text-ink-900">
              About this list
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-700">
              <li>
                Curated by hand, not scraped — every handle here was checked against the
                organisation or person&apos;s own site before being added. It is not
                exhaustive, and it will drift out of date as accounts and roles change.
              </li>
              <li>
                Inclusion is not an endorsement of any individual&apos;s or organisation&apos;s
                views — this is a directory of who is active on these issues, not an
                agreement with any of them.
              </li>
            </ul>
          </div>

          <div className="mt-10 border-b border-t border-ink-200 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.6fr_1fr]">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Search
                </span>
                <input
                  type="search"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Name, handle or focus area"
                  className="w-full border border-ink-300 px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Category
                </span>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as HandleCategory | '')}
                  className="w-full border border-ink-300 bg-white px-3 py-2 transition-colors duration-200 focus:border-brand-700 focus:outline-none"
                >
                  <option value="">All categories</option>
                  {HANDLE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {HANDLE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <p className="mb-8 mt-4 text-sm text-ink-500">
            {results.length.toLocaleString('en-IN')}{' '}
            {results.length === 1 ? 'entry' : 'entries'}.
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
                No entry matches these filters.
              </p>
              <button type="button" onClick={clearAll} className="text-sm font-bold hover:underline">
                Clear filters →
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {sections.map(section => (
                <section key={section.category}>
                  <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-ink-900">
                    {HANDLE_CATEGORY_LABELS[section.category]}
                    <span className="ml-2 text-base font-normal text-ink-400">
                      {section.handles.length}
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {section.handles.map(handle => (
                      <HandleCard key={handle.id} handle={handle} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className="mt-16 max-w-3xl border-t border-ink-200 pt-6 text-sm leading-relaxed text-ink-500">
            <h2 className="mb-2 font-display text-base font-bold tracking-tight text-ink-900">
              Something wrong or missing?
            </h2>
            <p>
              Handles change hands, accounts go quiet, and this list leans on what was
              findable and verifiable at the time it was put together. If something here is
              stale or you know a group doing this work that is missing, it belongs on{' '}
              <a
                href="/community"
                className="font-semibold text-brand-700 hover:underline"
              >
                the community feed
              </a>{' '}
              so it can be corrected.
            </p>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
