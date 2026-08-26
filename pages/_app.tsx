import { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import localFont from 'next/font/local'
import '../styles/index.css'

// Space Grotesk sets headlines and figures — its squared-off terminals suit a
// site about boundaries and registers. Inter does the reading, because there is
// a lot of it and Inter disappears the way body text should.
//
// Both are served from public/fonts rather than next/font/google: the Google
// loader downloads at *build* time, which would put fonts.gstatic.com between
// this repo and every Docker/CI build. Latin subset, variable weight.
const inter = localFont({
  src: '../public/fonts/inter-latin.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
})

const spaceGrotesk = localFont({
  src: '../public/fonts/space-grotesk-latin.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-space-grotesk',
  fallback: ['system-ui', 'sans-serif'],
})

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      {/*
        The font variables are declared on this wrapper rather than on <body>,
        which _document owns. `font-sans` has to sit here too: it resolves
        --font-inter, and that variable only exists from this element down.
      */}
      <div
        className={`${inter.variable} ${spaceGrotesk.variable} bg-ink-50 font-sans text-ink-900 antialiased`}
      >
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  )
}
