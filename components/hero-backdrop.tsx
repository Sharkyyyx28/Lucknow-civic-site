// One lumpy closed curve, redrawn at shrinking scales to read as elevation
// contours. Cheaper and more consistent than hand-authoring each ring.
const CONTOUR =
  'M200 60 C270 60 330 100 344 168 C358 236 320 300 254 328 C188 356 118 340 78 288 C38 236 44 152 96 108 C130 79 160 60 200 60 Z'

const RINGS = [
  { scale: 1, rotate: 0, color: '#d3ccbc', width: 1 },
  { scale: 0.84, rotate: 4, color: '#d3ccbc', width: 1 },
  { scale: 0.68, rotate: 9, color: '#a9a293', width: 1 },
  { scale: 0.52, rotate: 14, color: '#a2b0e4', width: 1.25 },
  { scale: 0.36, rotate: 20, color: '#7688d3', width: 1.5 },
  { scale: 0.2, rotate: 26, color: '#3f4da3', width: 1.75 },
]

/**
 * Elevation contours behind the hero, with a survey scale bar tucked into the
 * bottom left. Decorative — the headline carries the meaning.
 */
const HeroBackdrop = () => {
  return (
    <>
      <svg
        className="pointer-events-none absolute -right-16 top-1/2 h-[620px] w-[620px] -translate-y-1/2 opacity-70 md:right-0"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {RINGS.map(ring => (
          <path
            key={ring.scale}
            d={CONTOUR}
            stroke={ring.color}
            strokeWidth={ring.width}
            fill="none"
            transform={`rotate(${ring.rotate} 200 200) translate(200 200) scale(${ring.scale}) translate(-200 -200)`}
          />
        ))}
        {/* Spot heights. */}
        <circle cx="200" cy="200" r="3.5" fill="#e88b10" />
        <circle cx="286" cy="132" r="2.5" fill="#333e84" opacity="0.6" />
        <circle cx="118" cy="268" r="2.5" fill="#e88b10" opacity="0.5" />
      </svg>

      {/* A map's scale bar — alternating filled and hollow segments. */}
      <svg
        className="pointer-events-none absolute bottom-10 left-6 hidden h-8 w-48 opacity-60 lg:block"
        viewBox="0 0 192 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="#6f6858" strokeWidth="1">
          <rect x="0.5" y="12.5" width="47" height="9" fill="#6f6858" />
          <rect x="47.5" y="12.5" width="47" height="9" fill="none" />
          <rect x="94.5" y="12.5" width="47" height="9" fill="#6f6858" />
          <rect x="141.5" y="12.5" width="47" height="9" fill="none" />
        </g>
        <g fill="#6f6858" fontSize="8" fontFamily="var(--font-inter)">
          <text x="0" y="8">
            0
          </text>
          <text x="88" y="8">
            5
          </text>
          <text x="176" y="8">
            10 km
          </text>
        </g>
      </svg>
    </>
  )
}

export default HeroBackdrop
