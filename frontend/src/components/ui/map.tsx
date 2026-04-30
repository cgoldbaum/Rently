"use client";

import MapLibreGL, { type PopupOptions, type MarkerOptions } from "maplibre-gl";
// CSS imported globally in globals.css
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

type MapProps = {
  children?: ReactNode;
  containerStyle?: React.CSSProperties;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <div className="flex gap-1">
        <span className="size-2 rounded-full bg-gray-400 animate-pulse" />
        <span className="size-2 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]" />
        <span className="size-2 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function Map({ children, containerStyle, ...props }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    const mapInstance = new MapLibreGL.Map({
      container: containerRef.current,
      style: LIGHT_STYLE,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      ...props,
    });

    const onStyleData = () => setIsStyleLoaded(true);
    const onLoad = () => { mapInstance.resize(); setIsLoaded(true); };

    mapInstance.on("load", onLoad);
    mapInstance.on("styledata", onStyleData);
    mapRef.current = mapInstance;

    return () => {
      mapInstance.off("load", onLoad);
      mapInstance.off("styledata", onStyleData);
      mapInstance.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  const isLoading = !isMounted || !isLoaded || !isStyleLoaded;

  return (
    <MapContext.Provider value={{ map: mapRef.current, isLoaded: isMounted && isLoaded && isStyleLoaded }}>
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", ...containerStyle }}>
        {isLoading && <DefaultLoader />}
        {isMounted && children}
      </div>
    </MapContext.Provider>
  );
}

// ── Marker ─────────────────────────────────────────────────────────────────

type MarkerContextValue = {
  markerRef: React.RefObject<MapLibreGL.Marker | null>;
  markerElementRef: React.RefObject<HTMLDivElement | null>;
  map: MapLibreGL.Map | null;
  isReady: boolean;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) throw new Error("Marker components must be used within MapMarker");
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  draggable?: boolean;
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

export function MapMarker({ longitude, latitude, children, draggable = false, onDragEnd, ...markerOptions }: MapMarkerProps) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const markerElementRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const container = document.createElement("div");
    markerElementRef.current = container;

    const marker = new MapLibreGL.Marker({ ...markerOptions, element: container, draggable })
      .setLngLat([longitude, latitude])
      .addTo(map);

    const handleDragEnd = () => {
      const lngLat = marker.getLngLat();
      onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    marker.on("dragend", handleDragEnd);

    markerRef.current = marker;
    setIsReady(true);

    return () => {
      marker.off("dragend", handleDragEnd);
      marker.remove();
      markerRef.current = null;
      markerElementRef.current = null;
      setIsReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  useEffect(() => { markerRef.current?.setLngLat([longitude, latitude]); }, [longitude, latitude]);
  useEffect(() => { markerRef.current?.setDraggable(draggable); }, [draggable]);

  return (
    <MarkerContext.Provider value={{ markerRef, markerElementRef, map, isReady }}>
      {children}
    </MarkerContext.Provider>
  );
}

export function MarkerContent({ children, className }: { children?: ReactNode; className?: string }) {
  const { markerElementRef, isReady } = useMarkerContext();
  if (!isReady || !markerElementRef.current) return null;
  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children ?? <div className="size-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />}
    </div>,
    markerElementRef.current
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

type MapControlsProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showLocate?: boolean;
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
  className?: string;
};

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

function ControlGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-gray-200">
      {children}
    </div>
  );
}

function ControlButton({ onClick, label, children, disabled = false }: { onClick: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      disabled={disabled}
      className={cn("flex items-center justify-center size-8 hover:bg-gray-50 transition-colors", disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

export function MapControls({ position = "bottom-right", showZoom = true, showLocate = false, onLocate, className }: MapControlsProps) {
  const { map, isLoaded } = useMap();
  const [locating, setLocating] = useState(false);

  const handleZoomIn = useCallback(() => map?.zoomTo(map.getZoom() + 1, { duration: 300 }), [map]);
  const handleZoomOut = useCallback(() => map?.zoomTo(map.getZoom() - 1, { duration: 300 }), [map]);

  const handleLocate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
        map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 1500 });
        onLocate?.(coords);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, [map, onLocate]);

  if (!isLoaded) return null;

  return (
    <div className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}>
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Acercar"><Plus className="size-4" /></ControlButton>
          <ControlButton onClick={handleZoomOut} label="Alejar"><Minus className="size-4" /></ControlButton>
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton onClick={handleLocate} label="Mi ubicación" disabled={locating}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

// ── Map-level Popup ─────────────────────────────────────────────────────────

type MapPopupProps = {
  longitude: number;
  latitude: number;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
} & Omit<PopupOptions, "className">;

export function MapPopup({ longitude, latitude, onClose, children, className, closeButton = false, ...popupOptions }: MapPopupProps) {
  const { map } = useMap();
  const popupRef = useRef<MapLibreGL.Popup | null>(null);
  const container = useRef(document.createElement("div")).current;

  useEffect(() => {
    if (!map) return;
    const popup = new MapLibreGL.Popup({ offset: 16, ...popupOptions, closeButton: false })
      .setMaxWidth("none")
      .setDOMContent(container)
      .setLngLat([longitude, latitude])
      .addTo(map);
    popup.on("close", () => onClose?.());
    popupRef.current = popup;
    return () => { if (popup.isOpen()) popup.remove(); popupRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => { popupRef.current?.setLngLat([longitude, latitude]); }, [longitude, latitude]);

  return createPortal(
    <div className={cn("relative rounded-md border bg-white p-3 shadow-md text-sm", className)}>
      {closeButton && (
        <button type="button" onClick={() => { popupRef.current?.remove(); onClose?.(); }} className="absolute top-1 right-1 opacity-60 hover:opacity-100" aria-label="Cerrar">
          <X className="size-4" />
        </button>
      )}
      {children}
    </div>,
    container
  );
}
