/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./components/**/*.tsx', './pages/**/*.tsx'],
  theme: {
    extend: {
      // Semantic tokens, so the palette can be re-pitched from this one block
      // rather than swept across every component.
      //
      // `brand` is a deep survey teal and `accent` a warm ochre — the two inks
      // a printed city map is drawn in. `ink` is a warm near-black; pairing it
      // with the warm `paper` off-white keeps the page from going clinical.
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        ink: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        success: '#0070f3',
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
        sm: '0 5px 10px rgba(0, 0, 0, 0.12)',
        md: '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
