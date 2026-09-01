import Head from 'next/head'
import { CMS_NAME, HOME_OG_IMAGE_URL } from '../lib/constants'

const Meta = () => {
  return (
    <Head>
      {/* SVG first: browsers that support it take it and stay crisp at any
          size, the PNGs are the fallback, and the .ico covers the rest. */}
      <link rel="icon" type="image/svg+xml" href="/favicon/icon.svg" />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/favicon-16x16.png"
      />
      <link rel="shortcut icon" href="/favicon/favicon.ico" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/apple-touch-icon.png"
      />
      <link rel="manifest" href="/favicon/site.webmanifest" />
      <link
        rel="mask-icon"
        href="/favicon/safari-pinned-tab.svg"
        color="#333e84"
      />
      <meta name="msapplication-TileColor" content="#333e84" />
      <meta name="theme-color" content="#333e84" />
      <meta
        name="description"
        content={`${CMS_NAME} civic data — who represents the city, the metro network, neighbourhood amenities and what residents are reporting.`}
      />
      <meta property="og:image" content={HOME_OG_IMAGE_URL} />
    </Head>
  )
}

export default Meta
