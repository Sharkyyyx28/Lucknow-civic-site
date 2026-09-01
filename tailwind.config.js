/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./components/**/*.tsx', './pages/**/*.tsx'],
  theme: {
    extend: {
      // Semantic tokens, so the palette can be re-pitched from this one block
      // rather than swept across every component.
      //
      // The palette is Lucknow's own, not a generic survey one. `brand` is a
      // deep indigo — nil, the dye Awadh traded in, and the register ink a
      // civic record is kept in. `accent` is marigold, the genda strung over
      // every gate in the city. `ink` is a warm charcoal sitting on the cream
      // of chikankari muslin, which keeps the page from going clinical.
      colors: {
        brand: {
          50: '#f2f4fc',
          100: '#e3e7f8',
          200: '#c8d0f0',
          300: '#a2b0e4',
          400: '#7688d3',
          500: '#5364bd',
          600: '#3f4da3',
          700: '#333e84',
          800: '#2b3369',
          900: '#232847',
        },
        accent: {
          50: '#fff8ec',
          100: '#feefd2',
          200: '#fcdb9d',
          300: '#f9c266',
          400: '#f5a52f',
          500: '#e88b10',
          600: '#c96f08',
          700: '#a1550c',
          800: '#7d4210',
        },
        ink: {
          50: '#faf8f4',
          100: '#f3f0e9',
          200: '#e6e1d5',
          300: '#d3ccbc',
          400: '#a9a293',
          500: '#6f6858',
          600: '#5c5648',
          700: '#453f34',
          800: '#2b271f',
          900: '#1b1813',
        },
        success: '#2f7d4f',
      },
      fontFamily: {
        // Space Grotesk sets the headlines; Inter does the reading. Deliberately
        // not one family doing both — the contrast is the personality here.
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'var(--font-inter)', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // A slow list, not a bob — the mark should look like it is surveying,
        // not bouncing.
        drift: {
          '0%, 100%': { transform: 'translateY(0) rotate(-0.4deg)' },
          '50%': { transform: 'translateY(-10px) rotate(0.4deg)' },
        },
        // Traces a boundary path on, the way a plotter would draw it.
        traceLine: {
          '0%': { strokeDashoffset: 'var(--trace-length, 600)' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        // `forwards` on the entrance animations so an element that starts at
        // opacity 0 stays put once it has arrived.
        fadeIn: 'fadeIn .5s ease-out forwards',
        fadeInUp: 'fadeInUp .7s ease-out forwards',
        slideInLeft: 'slideInLeft .6s ease-out forwards',
        drift: 'drift 9s ease-in-out infinite',
        trace: 'traceLine 2.4s ease-out forwards',
      },
      spacing: {
        28: '7rem',
      },
      letterSpacing: {
        tighter: '-.04em',
      },
      lineHeight: {
        tight: 1.2,
      },
      fontSize: {
        '5xl': '2.5rem',
        '6xl': '2.75rem',
        '7xl': '4.5rem',
        '8xl': '6.25rem',
      },
      boxShadow: {
        // Shadows are cast in warm ink rather than pure black, so a card lifts
        // off the cream ground without a grey halo appearing around it.
        sm: '0 1px 2px rgba(27, 24, 19, 0.05), 0 4px 12px -6px rgba(27, 24, 19, 0.14)',
        md: '0 2px 4px rgba(27, 24, 19, 0.05), 0 12px 32px -14px rgba(27, 24, 19, 0.22)',
        sheet: '0 1px 0 rgba(27, 24, 19, 0.04), 0 18px 48px -24px rgba(35, 40, 71, 0.35)',
      },
    },
  },
  plugins: [],
}
