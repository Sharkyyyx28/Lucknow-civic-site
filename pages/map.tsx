import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Navbar from '../components/navbar'

const LayeredLucknowMap = dynamic(
  () => import('../components/LayeredLucknowMap'),
  { ssr: false }
)

export default function MapPage() {
  const router = useRouter()
  const wardParam = typeof router.query.ward === 'string' ? router.query.ward : undefined

  return (
    <>
      <Head>
        <title>Lucknow Map Explorer</title>
        <meta name="description" content="Interactive map of Lucknow — the municipal corporation boundary and ward boundaries (2018), with click-to-locate." />
      </Head>

      {/* Height comes from .map-page-shell: 100dvh where it is supported, so the
          mobile browser's own chrome can't crop the bottom of the map. */}
      <div className="map-page-shell">
        {/* Same navbar as the rest of the site, rather than a bar of its own */}
        <div style={{ flexShrink: 0 }}>
          <Navbar />
        </div>

        {/* Map fills remaining height */}
        <div style={{ flex: 1, position: 'relative' }}>
          <LayeredLucknowMap initialWardName={wardParam} />
        </div>
      </div>
    </>
  )
}
