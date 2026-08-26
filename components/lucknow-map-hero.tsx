/**
 * LucknowCorpMap — Animated SVG city-outline decoration for the intro section.
 *
 * The Bengaluru original drew a hand-designed tessellation of "5 corporation
 * zones" — Lucknow Nagar Nigam is a single unified corporation, so that
 * split does not exist here and drawing one would be inventing an
 * administrative boundary that isn't real. This version draws a single
 * rounded outline (a stylised stand-in for the city, not a traced boundary)
 * with a centre pin, compass rose and scale bar, kept from the original for
 * visual consistency with the rest of the site.
 */

const SIZE = 400

const CITY_OUTLINE_D =
  'M110,150 L150,90 L220,68 L280,80 L330,120 L350,190 L340,260 L300,320 L230,350 L160,335 L110,290 L85,220 Z'

const LucknowCorpMap = () => {
  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Stylised outline of Lucknow"
        role="img"
      >
        <defs>
          <filter id="city-shadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.10" />
          </filter>
        </defs>

        {/* Filled region — fades in */}
        <path
          d={CITY_OUTLINE_D}
          fill="#fee2e2"
          fillOpacity="0.88"
          filter="url(#city-shadow)"
          style={{ animation: 'cityFade 0.5s ease-out forwards', opacity: 0 }}
        />

        {/* Boundary stroke — draws on */}
        <path
          d={CITY_OUTLINE_D}
          stroke="#b91c1c"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
            animation: 'drawOn 1.4s ease-out 0.1s forwards',
          }}
        />

        {/* Label */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="13"
          fontWeight="700"
          fill="#7f1d1d"
          fontFamily="var(--font-inter), system-ui, sans-serif"
          letterSpacing="0.12em"
          style={{
            textTransform: 'uppercase',
            animation: 'cityFade 0.4s ease-out 0.6s forwards',
            opacity: 0,
          }}
        >
          Lucknow
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="#991b1b"
          fontFamily="var(--font-inter), system-ui, sans-serif"
          style={{
            animation: 'cityFade 0.4s ease-out 0.7s forwards',
            opacity: 0,
          }}
        >
          Lucknow Municipal Corporation
        </text>

        {/* ── City-centre pin ── */}
        <g
          style={{
            animation: 'pinPop 0.45s cubic-bezier(0.34,1.56,0.64,1) 1.2s forwards',
            opacity: 0,
          }}
        >
          <circle
            cx="218" cy="205" r="16"
            stroke="#d97706" strokeWidth="1" fill="none" opacity="0.25"
            style={{ animation: 'ripple 2.6s ease-out 1.6s infinite' }}
          />
          <circle cx="218" cy="205" r="8" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.4" />
          <circle cx="218" cy="205" r="3.5" fill="#d97706" />
          <circle cx="218" cy="205" r="1.3" fill="#fef3c7" />
        </g>

        {/* ── Compass rose (bottom-right) ── */}
        <g
          transform="translate(378, 378)"
          style={{ animation: 'cityFade 0.4s ease-out 1.4s forwards', opacity: 0 }}
        >
          <line x1="0" y1="-12" x2="0" y2="12" stroke="#78716c" strokeWidth="1" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#78716c" strokeWidth="1" />
          <polygon points="0,-12 -2.8,-6.5 2.8,-6.5" fill="#78716c" />
          <text
            x="0" y="-15" textAnchor="middle" fontSize="6.5"
            fill="#78716c" fontFamily="var(--font-inter), system-ui" fontWeight="600"
          >N</text>
        </g>

        {/* ── Scale bar (bottom-left) ── */}
        <g style={{ animation: 'cityFade 0.4s ease-out 1.4s forwards', opacity: 0 }}>
          <line x1="20" y1="388" x2="68" y2="388" stroke="#78716c" strokeWidth="1.5" />
          <line x1="20" y1="384" x2="20" y2="392" stroke="#78716c" strokeWidth="1.5" />
          <line x1="68" y1="384" x2="68" y2="392" stroke="#78716c" strokeWidth="1.5" />
          <text
            x="44" y="398" textAnchor="middle" fontSize="6.5"
            fill="#78716c" fontFamily="var(--font-inter), system-ui"
          >~10 km</text>
        </g>
      </svg>

      <style>{`
        @keyframes drawOn {
          to { stroke-dashoffset: 0; }
        }
        @keyframes cityFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pinPop {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ripple {
          0%   { r: 16; opacity: 0.25; }
          70%  { r: 28; opacity: 0; }
          100% { r: 16; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default LucknowCorpMap
