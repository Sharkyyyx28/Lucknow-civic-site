import { FormEvent, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth/next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '../../components/layout'
import Container from '../../components/container'
import { CategoryChip, PostBody, formatPostDate } from '../../components/community-post-card'
import { authOptions } from '../api/auth/[...nextauth]'
import { getPost } from '../../lib/community'
import {
  BODY_MAX,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  PLACE_LABEL_MAX,
  POST_CATEGORIES,
  TITLE_MAX,
  wardDisplayName,
  type CommunityPost,
  type PostCategory,
} from '../../lib/communityTypes'
import { INPUT, PRIMARY_BTN, QUIET_BTN, SMALL_BTN } from '../../lib/ui'
import { fetchJson } from '../../lib/fetchJson'

const LocationPickerMap = dynamic(() => import('../../components/location-picker-map'), { ssr: false })

interface Props {
  post: CommunityPost
}

export default function CommunityPostPage({ post: initialPost }: Props) {
  const router = useRouter()
  const [post, setPost] = useState(initialPost)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body)
  const [category, setCategory] = useState<PostCategory>(post.category)
  const [placeLabel, setPlaceLabel] = useState(post.placeLabel)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const startEdit = () => {
    setTitle(post.title)
    setBody(post.body)
    setCategory(post.category)
    setPlaceLabel(post.placeLabel)
    setError(null)
    setEditing(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const data = await fetchJson<{ post: CommunityPost }>(`/api/community/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category, placeLabel }),
      })
      setPost(data.post)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetchJson(`/api/community/${post.id}`, { method: 'DELETE' })
      router.push('/community')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this post')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const edited = post.updatedAt !== post.createdAt

  return (
    <Layout preview={false}>
      <Container>
        <Head>
          <title>{`${post.title} | Community | Lucknow`}</title>
          <meta name="description" content={post.body.slice(0, 160)} />
        </Head>

        <article className="max-w-2xl mx-auto pt-10 md:pt-14 pb-24">
          <Link href="/community" className="text-sm text-neutral-500 hover:text-black hover:underline">
            ← Community
          </Link>

          {editing ? (
            <form onSubmit={handleSave} className="mt-6 space-y-6">
              <h1 className="text-2xl font-bold tracking-tighter">Edit your post</h1>

              <div className="flex flex-wrap gap-2">
                {POST_CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`inline-flex items-center gap-1.5 border px-3 py-2 text-sm duration-200 transition-colors ${
                      category === c
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-neutral-300 text-neutral-700 hover:border-black'
                    }`}
                  >
                    <span aria-hidden="true">{CATEGORY_STYLES[c].icon}</span>
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
                className={INPUT}
                aria-label="Title"
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={12}
                maxLength={BODY_MAX}
                className={`${INPUT} resize-y`}
                aria-label="Post"
              />
              <input
                type="text"
                value={placeLabel}
                onChange={e => setPlaceLabel(e.target.value)}
                maxLength={PLACE_LABEL_MAX}
                placeholder="Landmark (optional)"
                className={INPUT}
                aria-label="Landmark"
              />

              <p className="text-xs text-neutral-500">
                The pinned location cannot be changed — delete the post and write a new one if
                it is about a different place.
              </p>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving || !title.trim() || !body.trim()}
                  className={PRIMARY_BTN}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className={QUIET_BTN}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
                <CategoryChip category={post.category} />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-4">
                {post.title}
              </h1>

              <p className="text-neutral-600 mb-2">
                {post.authorName} · {formatPostDate(post.createdAt)}
                {edited && <span className="text-neutral-400"> · edited</span>}
              </p>

              <p className="text-sm text-neutral-600 border-b border-neutral-200 pb-6 mb-8">
                📍 <Link
                  href={`/community?ward=${encodeURIComponent(post.wardName)}`}
                  className="hover:underline"
                >
                  {wardDisplayName(post.wardName)}
                </Link>
                {post.corporation ? ` · ${post.corporation}` : ''}
                {post.placeLabel ? ` · ${post.placeLabel}` : ''}
              </p>

              <PostBody text={post.body} className="text-lg leading-relaxed text-neutral-800" />

              <div className="mt-10">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                  The place this is about
                </h2>
                <LocationPickerMap lat={post.lat} lng={post.lng} readOnly height={220} />
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm">
                  <Link
                    href={`/map?ward=${encodeURIComponent(post.wardName)}`}
                    className="font-bold hover:underline"
                  >
                    View this ward on the map →
                  </Link>
                  <span className="text-xs text-neutral-500">
                    {post.lat.toFixed(5)}, {post.lng.toFixed(5)}
                  </span>
                </div>
              </div>

              {post.isAuthor && (
                <div className="flex flex-wrap items-center gap-4 mt-10 pt-6 border-t border-neutral-200">
                  <button type="button" onClick={startEdit} className={SMALL_BTN}>
                    Edit post
                  </button>
                  {confirmDelete ? (
                    <>
                      <span className="text-sm text-neutral-500">Delete this post?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-sm font-bold text-red-600 hover:underline disabled:opacity-40"
                      >
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className={QUIET_BTN}
                      >
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-sm text-neutral-500 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                  {error && <p className="text-red-600 text-sm w-full">{error}</p>}
                </div>
              )}
            </>
          )}
        </article>
      </Container>
    </Layout>
  )
}

// Rendered on the server so a shared link shows the post itself, and so the
// author's edit/delete controls are decided by the session rather than by
// anything the browser claims.
export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const { id } = context.params as { id: string }
  const session = await getServerSession(context.req, context.res, authOptions)
  const post = await getPost(id, session?.user?.email ?? undefined)

  if (!post) return { notFound: true }
  return { props: { post } }
}
