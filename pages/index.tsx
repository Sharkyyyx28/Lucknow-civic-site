import Head from 'next/head'
import Link from 'next/link'
import Container from '../components/container'
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

export default function Index({ allPosts }: Props) {
  return (
    <Layout>
      <Head>
        <title>Lucknow civic data</title>
        <meta
          name="description"
          content="Ward boundaries, pincode-to-ward lookup, road data and neighbourhood amenities across Greater Lucknow."
        />
      </Head>
      {/* The hero runs edge to edge, so it sits outside the Container. */}
      <Intro />

      <Container>
        <IntentFinder />
        <ToolDirectory />

        {allPosts.length > 0 && (
          <Reveal className="mb-24 md:mb-32">
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
                      className="group flex items-center justify-between gap-4 py-5 text-lg text-ink-700 transition-colors hover:text-brand-800 md:text-xl"
                    >
                      {post.title}
                      <svg
                        className="h-4 w-4 shrink-0 text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-brand-600"
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
      </Container>
    </Layout>
  )
}

export const getStaticProps = async () => {
  // 'date' is not rendered, but getAllPosts sorts on it.
  const allPosts = getAllPosts(['title', 'slug', 'date'])

  return {
    props: { allPosts },
  }
}
