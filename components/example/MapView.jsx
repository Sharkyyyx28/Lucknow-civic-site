import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CORPORATION_COLORS = {
    'Lucknow Central': '#ef4444',
    'Lucknow South': '#3b82f6',
    'Lucknow East': '#10b981',
    'Lucknow West': '#f59e0b',
    'Lucknow North': '#8b5cf6'
};
const createCustomIcon = (color, isSelected) => {
    const pulseHtml = isSelected ? `<div class="absolute -inset-2 rounded-full animate-marker-pulse" style="animation-duration: 2s;"></div>` : '';

    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative w-full h-full flex items-center justify-center">
                ${pulseHtml}
                <div style="
                    background-color: ${isSelected ? '#fdfffeff' : color}; 
                    width: ${isSelected ? '20px' : '12px'}; 
                    height: ${isSelected ? '20px' : '12px'}; 
                    border-radius: 50%; 
                    box-shadow: 0 0 10px ${isSelected ? '#f7f7f7ff' : color};
                    position: relative;
                    z-index: 10;
                    border: ${isSelected ? '2px solid #080C14' : 'none'};
                "></div>
            </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

const MapLegend = () => {
    return (
        <div className="absolute bottom-6 right-6 z-[1000] bg-[#0D1117]/80 backdrop-blur-md p-4 rounded-lg border border-[#1C2A3A] shadow-xl">
            <h4 className="font-bold mb-3 text-[10px] text-[#4A6080] uppercase tracking-[0.2em]">Corporations</h4>
            {Object.entries(CORPORATION_COLORS).map(([corp, color]) => (
                <div key={corp} className="flex items-center mb-2 gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></div>
                    <span className="text-xs text-[#E2E8F0] tracking-wide">{corp}</span>
                </div>
            ))}
        </div>
    );
};

const createCorporationIcon = (color, count) => {
    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative w-full h-full flex items-center justify-center animate-in fade-in duration-200">
                <div style="
                    background-color: ${color}; 
                    width: 28px; 
                    height: 28px; 
                    border-radius: 50%; 
                    box-shadow: 0 0 12px ${color};
                    position: relative;
                    z-index: 10;
                    border: 2px solid #080C14;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #FFFFFF;
                    font-weight: 800;
                    font-size: 10px;
                    font-family: monospace;
                ">${count}</div>
            </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

function ChangeView({ center: [lat, lng], zoom }) {
    const map = useMap();

    React.useEffect(() => {
        map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);

    return null;
}

function ZoomHandler({ onZoomChange }) {
    const map = useMap();
    const [zoom, setZoom] = React.useState(map.getZoom());

    useMapEvents({
        zoom: () => {
            const z = map.getZoom();
            setZoom(z);
            onZoomChange(z);
        },
        zoomend: () => {
            const z = map.getZoom();
            setZoom(z);
            onZoomChange(z);
        }
    });

    return (
        <div className="absolute bottom-6 left-6 z-[1000] bg-[#0D1117]/85 backdrop-blur-md px-3 py-2 rounded-lg border border-[#1C2A3A] shadow-xl flex items-center gap-3 select-none">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#4A6080]">Zoom</span>
                <span className="text-xs font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-1.5 py-0.5 rounded border border-[#3B82F6]/20">
                    {zoom}
                </span>
            </div>
        </div>
    );
}

function CorporationMarkers({ groups }) {
    const map = useMap();

    return (
        <>
            {groups.map(corp => (
                <Marker
                    key={corp.name}
                    position={[corp.lat, corp.lng]}
                    icon={createCorporationIcon(CORPORATION_COLORS[corp.name] || '#4A6080', corp.count)}
                    eventHandlers={{
                        click: () => {
                            map.setView([corp.lat, corp.lng], 10);
                        }
                    }}
                >
                    <Popup className="custom-popup">
                        <div className="p-2">
                            <h3 className="font-semibold text-sm text-[#E2E8F0] tracking-wide mb-1.5">{corp.name}</h3>
                            <p className="text-[10px] text-[#4A6080] font-mono">
                                <strong className="text-[#3B82F6] font-sans text-[9px] uppercase tracking-widest mr-1">AREAS:</strong> {corp.count}
                            </p>
                            <p className="text-[9px] text-[#3B82F6] font-mono mt-1.5 animate-pulse">
                               Double Click marker to zoom in
                            </p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

function MapView({ areas, loading, selectedArea, onAreaSelect }) {
    const defaultCenter = [12.9716, 77.5946];

    const mapCenter = selectedArea ? [selectedArea.lat, selectedArea.lng] :
        areas.length === 1 ? [areas[0].lat, areas[0].lng] :
            defaultCenter;

    const mapZoom = selectedArea ? 15 :
        areas.length === 1 ? 14 : 11;

    const [currentZoom, setCurrentZoom] = React.useState(mapZoom);

    React.useEffect(() => {
        setCurrentZoom(mapZoom);
    }, [mapZoom]);

    const handleZoomChange = React.useCallback((zoomLevel) => {
        setCurrentZoom(zoomLevel);
    }, []);

    const corporationGroups = React.useMemo(() => {
        const groups = {};
        areas.forEach(area => {
            const corp = area.corporation || 'Unknown';
            if (!groups[corp]) {
                groups[corp] = {
                    name: corp,
                    areas: [],
                    latSum: 0,
                    lngSum: 0,
                };
            }
            groups[corp].areas.push(area);
            groups[corp].latSum += area.lat;
            groups[corp].lngSum += area.lng;
        });

        return Object.values(groups).map(g => ({
            name: g.name,
            count: g.areas.length,
            lat: g.latSum / g.areas.length,
            lng: g.lngSum / g.areas.length,
        }));
    }, [areas]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#080C14] text-[#4A6080] gap-4">
                <div className="w-10 h-10 border-2 border-[#1C2A3A] border-t-[#3B82F6] rounded-full animate-spin shadow-[0_0_15px_#3B82F6]"></div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em]">INITIALIZING MAP</span>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', background: '#080C14' }}
                zoomControl={false}
            >
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <ZoomHandler onZoomChange={handleZoomChange} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {currentZoom < 11 ? (
                    <CorporationMarkers groups={corporationGroups} />
                ) : (
                    areas.map((area, idx) => {
                        const isSelected = selectedArea?.pincode === area.pincode && selectedArea?.area === area.area;

                        return (

                            <Marker
                                key={`${area.pincode}-${idx}`}
                                position={[area.lat, area.lng]}
                                icon={createCustomIcon(CORPORATION_COLORS[area.corporation] || '#4A6080', isSelected)}
                                eventHandlers={{
                                    click: () => onAreaSelect(area),
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div className="p-2">
                                        <h3 className="font-semibold text-sm text-[#E2E8F0] tracking-wide mb-2">{area.area}</h3>
                                        <div className="text-[10px] text-[#4A6080] space-y-1.5 font-mono">
                                            <p><strong className="text-[#3B82F6] font-sans text-[9px] uppercase tracking-widest mr-1">PIN:</strong> {area.pincode}</p>
                                            <p><strong className="text-[#3B82F6] font-sans text-[9px] uppercase tracking-widest mr-1">ZONE:</strong> {area.corporation}</p>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })
                )}

                <MapLegend />
            </MapContainer>
        </div>
    );
}

export default MapView;