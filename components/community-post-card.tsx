import Link from 'next/link'
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  wardDisplayName,
  type CommunityPost,
  type PostCategory,
  type PostStatus,
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

export const StatusChip = ({ status }: { status: PostStatus }) => {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.reported
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium rounded ${style.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {STATUS_LABELS[status] ?? 'Reported'}
    </span>
  )
}

/**
 * Post text as the author typed it. Deliberately rendered as plain text with
 * blank lines kept as paragraph breaks.
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
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={post.category} />
        <StatusChip status={post.status || 'reported'} />
        {post.isAuthor && (
          <span className="border border-ink-300 bg-ink-50 px-2 py-0.5 text-xs text-ink-600 rounded">
            Your post
          </span>
        )}
      </div>
      {post.upvotes > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
          👍 {post.upvotes} {post.upvotes === 1 ? 'endorsement' : 'endorsements'}
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
        Read & escalate →
      </Link>
    </div>
  </article>
)

export default CommunityPostCard
