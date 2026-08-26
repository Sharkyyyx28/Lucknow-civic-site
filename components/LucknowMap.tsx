import { useEffect, useState } from 'react'
import {
  MapContainer, TileLayer, Popup, Marker, GeoJSON,
  LayersControl, useMap, useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Real bounds, from the DataMeet Lucknow Municipal Corporation boundary
// shapefile (see lib/mapLayers.ts, which is the canonical source for these —
// this small embedded map keeps its own copy rather than importing it, same
// as the Bengaluru original did).
const LUCKNOW_BOUNDS: [[number, number], [number, number]] = [
  [26.70, 80.75],
  [27.00, 81.15],
]

interface ClickResult {
  latlng: [number, number]
  pincode: string
  displayName: string
}

// ── Inner components ────────────────────────────────────────────────────────

function LoadingTracker({ onLoadingChange }: { onLoadingChange: (v: boolean) => void }) {
  const map = useMap()
  useEffect(() => {
    let pending = 0
    const onStart = () => { pending++; onLoadingChange(true) }
    const onDone = () => { pending = Math.max(0, pending - 1); if (pending === 0) onLoadingChange(false) }
    map.on('tileloadstart', onStart)
    map.on('tileload', onDone)
    map.on('tileerror', onDone)
    return () => {
      map.off('tileloadstart', onStart)
      map.off('tileload', onDone)
      map.off('tileerror', onDone)
    }
  }, [map, onLoadingChange])
  return null
}

function FitBounds() {
  const map = useMap()
  useEffect(() => { map.fitBounds(LUCKNOW_BOUNDS) }, [map])
  return null
}

function CtrlScrollZoom() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) { e.preventDefault(); e.deltaY < 0 ? map.zoomIn() : map.zoomOut() }
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [map])
  return null
}

function ResetViewButton() {
  const map = useMap()
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '50px', marginRight: '10px' }}>
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); map.fitBounds(LUCKNOW_BOUNDS) }}
          title="Reset view to Lucknow"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, fontSize: 14 }}
        >⌂</a>
      </div>
    </div>
  )
}

function LocateButton() {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            if (!navigator.geolocation) return
            setLocating(true)
            navigator.geolocation.getCurrentPosition(
              (pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 14); setLocating(false) },
              () => setLocating(false)
            )
          }}
          title="Show my location"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, fontSize: 16 }}
        >{locating ? '…' : '⊕'}</a>
      </div>
    </div>
  )
}

// Clicking the map reverse-geocodes the point via Nominatim and shows
// whatever address/pincode it returns. Bengaluru's version additionally
// looked the pincode up against a static pincode→ward CSV; Lucknow has no
// equivalent CSV (see lib/wards.ts), so this shows Nominatim's own answer
// directly rather than routing through a lookup that would always come back
// empty.
function ClickHandler({ onResult }: { onResult: (r: ClickResult | null) => void }) {
  const [loading, setLoading] = useState(false)
  const map = useMap()

  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng
      setLoading(true)
      onResult(null)
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'User-Agent': 'Lucknow-Explorer/1.0 (neubitat.com)' } }
        )
        const geoData = await geoRes.json()
        const pincode: string = geoData?.address?.postcode ?? ''
        const displayName: string = geoData?.display_name ?? ''
        onResult({ latlng: [lat, lng], pincode, displayName })
      } catch {
        onResult({ latlng: [lat, lng], pincode: '', displayName: '' })
      } finally {
        setLoading(false)
      }
    },
  })

  useEffect(() => {
    map.getContainer().style.cursor = loading ? 'wait' : 'crosshair'
    return () => { map.getContainer().style.cursor = '' }
  }, [loading, map])

  return null
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LucknowMap() {
  const [result, setResult] = useState<ClickResult | null>(null)
  const [boundary, setBoundary] = useState<object | null>(null)
  const [tileLoading, setTileLoading] = useState(false)

  useEffect(() => {
    fetch('/lucknow-boundary.json').then(r => r.json()).then(setBoundary).catch(() => {})
  }, [])

  return (
    <div className="relative w-full rounded shadow-sm overflow-hidden" style={{ height: '480px' }}>
      {tileLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
        <span className="bg-white/90 text-xs font-medium px-3 py-1 rounded-full shadow text-gray-600">
          Click anywhere to see the address & pincode
        </span>
      </div>

      <MapContainer
        center={[26.8467, 80.9462]}
        zoom={12}
        minZoom={10}
        maxBounds={[[26.55, 80.55], [27.15, 81.35]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="Street">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              detectRetina={true}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              detectRetina={true}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <LoadingTracker onLoadingChange={setTileLoading} />
        <FitBounds />
        <CtrlScrollZoom />
        <ResetViewButton />
        <LocateButton />

        {boundary && (
          <GeoJSON
            data={boundary as any}
            style={{ color: '#2563eb', weight: 2.5, fillOpacity: 0.04 }}
          />
        )}

        <ClickHandler onResult={setResult} />
        {result && (
          <Marker position={result.latlng}>
            <Popup>
              <div style={{ fontSize: 13, maxWidth: 220 }}>
                {result.pincode && (
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Pincode: {result.pincode}</p>
                )}
                {result.displayName ? (
                  <p style={{ color: '#374151' }}>{result.displayName}</p>
                ) : (
                  <p style={{ color: '#6b7280' }}>No address found for this location.</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
