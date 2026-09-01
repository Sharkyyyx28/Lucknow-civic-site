// One lumpy closed curve, redrawn at shrinking scales to read as elevation
// contours. Cheaper and more consistent than hand-authoring each ring.
const CONTOUR =
  "M200 60 C270 60 330 100 344 168 C358 236 320 300 254 328 C188 356 118 340 78 288 C38 236 44 152 96 108 C130 79 160 60 200 60 Z";

const RINGS = [
  { scale: 1, rotate: 0, color: "#d3ccbc", width: 1 },
  { scale: 0.84, rotate: 4, color: "#d3ccbc", width: 1 },
  { scale: 0.68, rotate: 9, color: "#a9a293", width: 1 },
  { scale: 0.52, rotate: 14, color: "#a2b0e4", width: 1.25 },
  { scale: 0.36, rotate: 20, color: "#7688d3", width: 1.5 },
  { scale: 0.2, rotate: 26, color: "#3f4da3", width: 1.75 },
];

/**
 * Elevation contours behind the hero. Positioned against the content column
 * rather than the section, then allowed to run past its right edge into the
 * margin — which both keeps them near the type on a wide display and gives
 * the dead space out there something to do.
 *
 * Only from lg up: below that the hero is a single column and these rings
 * land squarely behind the body copy.
 *
 * Decorative — the headline carries the meaning.
 */
const HeroBackdrop = () => {
  return (
    <svg
      className="pointer-events-none absolute -right-32 top-1/2 hidden h-[720px] w-[720px] -translate-y-1/2 opacity-70 lg:block"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {RINGS.map((ring) => (
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
  );
};

export default HeroBackdrop;
