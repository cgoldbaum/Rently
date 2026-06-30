"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, MapControls, useMap } from "@/components/ui/map";
import { Search, MapPin, Check, X, Loader2 } from "lucide-react";

// ── Geocoding via Nominatim (OpenStreetMap, sin API key) ───────────────────

async function geocode(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ar&accept-language=es`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data = await res.json() as { lat: string; lon: string; display_name: string }[];
  if (!data[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data = await res.json() as { display_name?: string; address?: { road?: string; house_number?: string; city?: string; town?: string; suburb?: string; state?: string } };
  if (!data.address) return data.display_name ?? null;
  const { road, house_number, city, town, suburb, state } = data.address;
  const parts = [road, house_number && road ? house_number : null, city ?? town ?? suburb, state].filter(Boolean);
  return parts.join(", ") || data.display_name || null;
}

// ── Click handler interno ───────────────────────────────────────────────────

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const handler = (e: { lngLat: { lat: number; lng: number } }) => onClick(e.lngLat.lat, e.lngLat.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [map, isLoaded, onClick]);

  return null;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface LocationPickerProps {
  onConfirm: (address: string) => void;
  onClose: () => void;
  initialAddress?: string;
}

// Buenos Aires
const DEFAULT_CENTER: [number, number] = [-58.3816, -34.6037];
const DEFAULT_ZOOM = 12;

export default function LocationPicker({ onConfirm, onClose, initialAddress = "" }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [reversing, setReversing] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const mapRef = useRef<{ flyTo?: (opts: { center: [number, number]; zoom: number }) => void }>(null);

  // Si hay dirección inicial, geocodificar al montar
  useEffect(() => {
    if (!initialAddress.trim()) return;
    geocode(initialAddress).then((result) => {
      if (result) {
        setMarker({ lat: result.lat, lng: result.lng });
        setSelectedAddress(result.display);
        setMapCenter([result.lng, result.lat]);
        setMapZoom(15);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const result = await geocode(searchQuery);
      if (result) {
        setMarker({ lat: result.lat, lng: result.lng });
        setSelectedAddress(result.display);
        setFlyTo({ center: [result.lng, result.lat], zoom: 16 });
      } else {
        setSelectedAddress("");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setMarker({ lat, lng });
    setSelectedAddress("");
    setReversing(true);
    try {
      const address = await reverseGeocode(lat, lng);
      setSelectedAddress(address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setSearchQuery(address ?? "");
    } finally {
      setReversing(false);
    }
  }, []);

  const handleConfirm = () => {
    if (!selectedAddress) return;
    // Extraer solo la parte útil de la dirección de Nominatim
    const short = selectedAddress.split(",").slice(0, 3).join(",").trim();
    onConfirm(short);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} color="var(--accent, #1a56db)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Elegir ubicación en mapa</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, lineHeight: 0 }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Buscar dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
          <button
            className="btn btn-secondary"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            style={{ whiteSpace: "nowrap", gap: 6, display: "flex", alignItems: "center" }}
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>
        </div>

        {/* Hint */}
        <div style={{ padding: "6px 16px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
          También podés hacer click en el mapa para marcar la ubicación exacta. El marcador es arrastrable.
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 240, position: "relative" }}>
          <MapInner
            center={mapCenter}
            zoom={mapZoom}
            flyTo={flyTo}
            onFlyToDone={() => setFlyTo(null)}
            marker={marker}
            onMapClick={handleMapClick}
            onMarkerDragEnd={handleMapClick}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontSize: 13, color: selectedAddress ? "#111827" : "#9ca3af", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {reversing ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Obteniendo dirección...
              </span>
            ) : selectedAddress || "Seleccioná una ubicación"}
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedAddress || reversing}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Check size={14} /> Usar esta dirección
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente que gestiona flyTo y click ───────────────────────────────

interface MapInnerProps {
  center: [number, number];
  zoom: number;
  flyTo: { center: [number, number]; zoom: number } | null;
  onFlyToDone: () => void;
  marker: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (lat: number, lng: number) => void;
}

function MapInner({ center, zoom, flyTo, onFlyToDone, marker, onMapClick, onMarkerDragEnd }: MapInnerProps) {
  return (
    <Map center={center} zoom={zoom} containerStyle={{ height: "100%", minHeight: 240 }}>
      <MapClickHandler onClick={onMapClick} />
      <FlyToHandler flyTo={flyTo} onDone={onFlyToDone} />
      {marker && (
        <MapMarker longitude={marker.lng} latitude={marker.lat} draggable onDragEnd={({ lat, lng }) => onMarkerDragEnd(lat, lng)}>
          <MarkerContent>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50% 50% 50% 0", background: "#1a56db", border: "2px solid #fff", transform: "rotate(-45deg)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
            </div>
          </MarkerContent>
        </MapMarker>
      )}
      <MapControls position="bottom-right" showZoom showLocate onLocate={({ longitude, latitude }) => onMapClick(latitude, longitude)} />
    </Map>
  );
}

function FlyToHandler({ flyTo, onDone }: { flyTo: { center: [number, number]; zoom: number } | null; onDone: () => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!flyTo || !map || !isLoaded) return;
    map.flyTo({ center: flyTo.center, zoom: flyTo.zoom, duration: 1200 });
    onDone();
  }, [flyTo, map, isLoaded, onDone]);

  return null;
}
