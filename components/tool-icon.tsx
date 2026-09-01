type Props = {
  /** A `Tool.id` from lib/tools.ts. */
  id: string
  className?: string
}

// One glyph per tool, keyed by the same id the directory and the intent picker
// use. Drawn as 24px strokes so they inherit weight and colour from the card
// they sit in — an unknown id renders nothing rather than a broken box.
const PATHS: Record<string, JSX.Element> = {
  map: (
    <>
      <path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  officials: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.5" />
      <path d="M17.5 4.5 20 6v3.5l-2.5 1.5L15 9.5V6l2.5-1.5Z" />
    </>
  ),
  'rail-network': (
    <>
      <rect x="6" y="3" width="12" height="13" rx="3" />
      <path d="M6 10h12M8.5 20l-2 2M15.5 20l2 2M9 16h6" />
      <circle cx="9.5" cy="13" r=".6" fill="currentColor" />
      <circle cx="14.5" cy="13" r=".6" fill="currentColor" />
    </>
  ),
  neighbourhood: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  community: (
    <>
      <path d="M20 14a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8Z" />
      <path d="M8.5 9h7M8.5 12.5h4" />
    </>
  ),
  'social-handles': (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M15.5 12v1.75a2.75 2.75 0 0 0 5.5 0V12a9 9 0 1 0-3.6 7.2" />
    </>
  ),
  about: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5v-11Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5v-11Z" />
    </>
  ),
}

const ToolIcon = ({ id, className }: Props) => {
  const glyph = PATHS[id]
  if (!glyph) return null

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}

export default ToolIcon
