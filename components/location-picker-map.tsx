import { useCallback, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import {
  LUCKNOW_CENTER,
  BASE_LAYERS,
  LAYER_CONFIGS,
  MIN_MAP_ZOOM,
  type BaseLayer,
  type OverlayId,
} from '../lib/mapLayers'
import {
  BoundaryOverlays,
  CompactLayerSwitcher,
  CtrlScrollZoom,
  useBoundaryData,
} from './map-layers'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_OVERLAYS = LAYER_CONFIGS.filter(l => l.defaultEnabled).map(l => l.id)

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Small click-to-drop-a-pin map, used where a saved location needs an exact
// point (rather than just a ward) — e.g. so nearest-amenity distances can be
// measured from it the same way the full map does after "Locate me".
// With `readOnly` it becomes a plain "here is the pin" map instead, which is
// how a published community post shows the place it is about.
// The basemap and boundary overlays are the same ones /map offers, so the pin
// can be placed against satellite imagery or a ward outline; the outlines are
// drawn non-interactively so a click on them still drops the pin.
export default function LocationPickerMap({
  lat,
  lng,
  onPick,
  readOnly = false,
  height = 260,
  showLayers = true,
}: {
  lat?: number | null
  lng?: number | null
  onPick?: (lat: number, lng: number) => void
  readOnly?: boolean
  height?: number
  showLayers?: boolean
}) {
  const markerRef = useRef<L.Marker | null>(null)
  const [activeBase, setActiveBase] = useState<BaseLayer>('osm')
  const [enabledOverlays, setEnabledOverlays] = useState<Set<OverlayId>>(new Set(DEFAULT_OVERLAYS))
  const { data: boundaryData, loading: boundaryLoading } = useBoundaryData(enabledOverlays)

  const hasPin = lat != null && lng != null
  const center: [number, number] = hasPin ? [lat, lng] : LUCKNOW_CENTER
  const interactive = !readOnly && !!onPick
  const baseCfg = BASE_LAYERS[activeBase]

  const toggleOverlay = useCallback((id: OverlayId) => {
    setEnabledOverlays(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #d1d5db',
      }}
    >
      <MapContainer
        center={center}
        zoom={hasPin ? 16 : 12}
        minZoom={MIN_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer key={activeBase} attribution={baseCfg.attribution} url={baseCfg.url} detectRetina />
        <CtrlScrollZoom />
        <BoundaryOverlays enabled={enabledOverlays} data={boundaryData} />
        {interactive && <ClickHandler onPick={onPick!} />}
        {hasPin && (
          <Marker
            position={[lat, lng]}
            draggable={interactive}
            ref={markerRef}
            eventHandlers={{
              dragend() {
                const marker = markerRef.current
                if (!marker || !interactive) return
                const pos = marker.getLatLng()
                onPick!(pos.lat, pos.lng)
              },
            }}
          />
        )}
      </MapContainer>

      {/* Sibling of the Leaflet container, so clicking the panel never drops a pin */}
      {showLayers && (
        <CompactLayerSwitcher
          activeBase={activeBase}
          onBaseChange={setActiveBase}
          enabled={enabledOverlays}
          onToggle={toggleOverlay}
          loading={boundaryLoading}
        />
      )}
    </div>
  )
}
