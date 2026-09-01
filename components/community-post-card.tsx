import Link from 'next/link'
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  wardDisplayName,
  type CommunityPost,
  type PostCategory,
} from '../lib/communityTypes'

/** "12 Jun 2026" — short and unambiguous, which matters for civic complaints. */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const CategoryChip = ({ category }: { category: PostCategory }) => {
  const style = CATEGORY_STYLES[category]
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs ${style.chip}`}>
      <span aria-hidden="true">{style.icon}</span>
      {CATEGORY_LABELS[category]}
    </span>
  )
}

/**
 * Post text as the author typed it. Deliberately rendered as plain text with
 * blank lines kept as paragraph breaks — this is user-submitted content, so it
 * never goes near dangerouslySetInnerHTML the way the static markdown posts do.
 */
export const PostBody = ({ text, className = '' }: { text: string; className?: string }) => (
  <div className={className}>
    {text
      .split(/\n{2,}/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap mb-4 last:mb-0">
          {paragraph}
        </p>
      ))}
  </div>
)

function excerpt(body: string, max = 220): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

const CommunityPostCard = ({ post }: { post: CommunityPost }) => (
  <article className="border border-ink-200 p-5 hover:border-ink-400 duration-200 transition-colors">
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <CategoryChip category={post.category} />
      {post.isAuthor && (
        <span className="border border-ink-300 bg-ink-50 px-2 py-1 text-xs text-ink-600">
          Your post
        </span>
      )}
    </div>

    <h2 className="text-xl font-bold tracking-tighter leading-tight mb-1">
      <Link href={`/community/${post.id}`} className="hover:underline">
        {post.title}
      </Link>
    </h2>

    <p className="text-sm text-ink-600 mb-3">
      📍 {wardDisplayName(post.wardName)}
      {post.corporation ? ` · ${post.corporation}` : ''}
      {post.placeLabel ? ` · ${post.placeLabel}` : ''}
    </p>

    <p className="text-ink-700 mb-4">{excerpt(post.body)}</p>

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
      <span>
        {post.authorName} · {formatPostDate(post.createdAt)}
      </span>
      <Link href={`/community/${post.id}`} className="font-bold text-black hover:underline">
        Read post →
      </Link>
    </div>
  </article>
)

export default CommunityPostCard
