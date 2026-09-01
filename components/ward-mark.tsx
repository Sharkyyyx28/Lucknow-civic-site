import type { CSSProperties } from 'react'

type Props = {
  size?: number
  className?: string
  /** Draws the boundary on, as a plotter would. Reserved for the hero. */
  traced?: boolean
}

// Roughly the path length of the outline below. Only needs to be in the right
// neighbourhood — an over-estimate just means the stroke starts fully hidden.
const OUTLINE_LENGTH = 320

/**
 * The site mark: a ward cell with its neighbours pinned to the corners, drawn
 * flat in the two inks this site is set in — indigo and marigold. No gradients and no glow — it
 * should read as a survey symbol stamped on paper.
 *
 * Readable down to ~24px, so the navbar and the hero can share it.
 */
const WardMark = ({ size = 30, className, traced = false }: Props) => {
  const traceStyle: CSSProperties | undefined = traced
    ? ({
        strokeDasharray: OUTLINE_LENGTH,
        '--trace-length': OUTLINE_LENGTH,
      } as CSSProperties)
    : undefined

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ward boundary — an irregular cell, not a tidy hexagon. */}
      <path
        d="M50 8 L84 26 L92 62 L66 90 L30 88 L10 56 L20 22 Z"
        stroke="#333e84"
        strokeWidth="4"
        strokeLinejoin="round"
        fill="#f2f4fc"
        className={traced ? 'animate-trace' : undefined}
        style={traceStyle}
      />

      {/* The shared edge with the neighbouring ward. */}
      <path
        d="M20 22 L48 46 L66 90"
        stroke="#7688d3"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Centre pin, and the amenities nearest to it. */}
      <circle cx="50" cy="50" r="8.5" fill="#e88b10" />
      <circle cx="50" cy="50" r="3" fill="#feefd2" />
      <circle cx="84" cy="26" r="4" fill="#333e84" />
      <circle cx="30" cy="88" r="4" fill="#e88b10" />
      <circle cx="10" cy="56" r="3.5" fill="#333e84" opacity="0.7" />
    </svg>
  )
}

export default WardMark
