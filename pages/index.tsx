import Head from 'next/head'
import Link from 'next/link'
import Container from '../components/container'
import DateFormatter from '../components/date-formatter'
import Intro from '../components/intro'
import IntentFinder from '../components/intent-finder'
import Layout from '../components/layout'
import Reveal from '../components/reveal'
import ToolDirectory from '../components/tool-directory'
import { getAllPosts } from '../lib/api'
import Post from '../interfaces/post'

type Props = {
  allPosts: Post[]
}

// Where the numbers on this site actually come from. Named plainly, because
// "made from public sources" means nothing without saying which.
const SOURCES = [
  ['OpenStreetMap', 'Boundaries, roads and the amenities near a saved place.'],
  ['Election Commission & LMC', 'Sitting MLAs for the 9 constituencies, and the Mayor.'],
  ['UPMRC', 'Metro lines, stations and the dates behind the timeline.'],
  ['Residents', 'Community posts, pinned to the spot they are about.'],
]

export default function Index({ allPosts }: Props) {
  return (
    <Layout>
      <Head>
        <title>Lucknow civic data</title>
        <meta
          name="description"
          content="Who represents Lucknow, the metro network, neighbourhood amenities and what residents are reporting — from public sources, made searchable."
        />
      </Head>
      {/* The hero runs edge to edge, so it sits outside the Container. */}
      <Intro />

      <Container>
        <IntentFinder />
        <ToolDirectory />

        {allPosts.length > 0 && (
          <Reveal className="mb-20 md:mb-28">
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Background
              </p>
              <h2 className="mb-8 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
                Notes
              </h2>
              <ul className="border-t border-ink-200">
                {allPosts.map(post => (
                  <li key={post.slug} className="border-b border-ink-200">
                    <Link
                      href="/posts/[slug]"
                      as={`/posts/${post.slug}`}
                      className="group flex flex-col gap-2 py-6 md:flex-row md:items-baseline md:gap-8"
                    >
                      <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-ink-500 md:w-40">
                        <DateFormatter dateString={post.date} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl font-bold tracking-tight text-ink-900 transition-colors group-hover:text-brand-800 md:text-2xl">
                          {post.title}
                        </span>
                        {post.excerpt && (
                          <span className="mt-1.5 block leading-relaxed text-ink-600">
                            {post.excerpt}
                          </span>
                        )}
                      </span>
                      <svg
                        className="hidden h-4 w-4 shrink-0 self-center text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-accent-600 md:block"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        <Reveal className="mb-24 md:mb-32">
          <section className="rounded-md border border-ink-200 bg-white p-7 md:p-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Provenance
            </p>
            <h2 className="mb-4 font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 md:text-3xl">
              Where this comes from
            </h2>
            <p className="mb-8 max-w-2xl leading-relaxed text-ink-600">
              Nothing here is estimated or filled in. Where Lucknow has no
              published dataset, the page says so instead of guessing.
            </p>

            <dl className="grid grid-cols-1 gap-px border-y border-ink-200 bg-ink-200 sm:grid-cols-2">
              {SOURCES.map(([name, what]) => (
                <div key={name} className="bg-white px-5 py-5">
                  <dt className="mb-1 font-display font-bold tracking-tight text-ink-900">
                    {name}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-600">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Reveal>
      </Container>
    </Layout>
  )
}

export const getStaticProps = async () => {
  // getAllPosts sorts on 'date'; the notes list renders it too.
  const allPosts = getAllPosts(['title', 'slug', 'date', 'excerpt'])

  return {
    props: { allPosts },
  }
}
