"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Compass, Layers } from "lucide-react";
import "./LocationMap.css";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationMapProps = {
  coordinates: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
  isGeocoding?: boolean;
  interactive?: boolean;
  zoom?: number;
  height?: string | number;
  viewCenter?: Coordinates | null;
  bounds?: [[number, number], [number, number]] | null;
  maxBounds?: [[number, number], [number, number]] | null;
  defaultLayer?: "satellite" | "streets";
};

// Default fallback coordinates: Islamabad, Pakistan
const DEFAULT_CENTER: Coordinates = { lat: 33.6844, lng: 73.0479 };
const DEFAULT_ZOOM = 12;

function loadLeafletLibrary(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  // Inject Leaflet CSS
  if (!document.getElementById("solarscope-leaflet-css")) {
    const link = document.createElement("link");
    link.id = "solarscope-leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existingScript = document.getElementById(
      "solarscope-leaflet-script"
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "solarscope-leaflet-script";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function LocationMap({
  coordinates,
  onMapClick,
  isGeocoding = false,
  interactive = true,
  zoom,
  height,
  viewCenter,
  bounds,
  maxBounds,
  defaultLayer = "satellite",
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  // Tile Layer Refs
  const satelliteLayerRef = useRef<any>(null);
  const satelliteLabelsRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<"satellite" | "streets">(defaultLayer);

  // Store latest onMapClick in ref to prevent effect re-runs
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track previous coordinates to avoid unnecessary setView calls during zoom/pan
  const prevCoordsRef = useRef<Coordinates | null>(null);

  const getPinIcon = (L: any) =>
    L.divIcon({
      className: "solarscope-map-pin-container",
      html: `
        <div class="solarscope-custom-pin" aria-hidden="true">
          <svg width="32" height="42" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#0F2C59"/>
            <circle cx="17" cy="17" r="8" fill="#FFB800"/>
            <circle cx="17" cy="17" r="4" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });

  // Initialize Leaflet map with High-Resolution Satellite & Streets Layers
  useEffect(() => {
    let isMounted = true;

    loadLeafletLibrary()
      .then((L) => {
        if (!isMounted || !containerRef.current) return;
        leafletLibRef.current = L;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const initialCenter = coordinates || DEFAULT_CENTER;
        // Higher default zoom for rooftop identification
        const initialZoom = zoom ?? (coordinates ? 18 : DEFAULT_ZOOM);

        const map = L.map(containerRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: initialZoom,
          maxZoom: 21,
          zoomControl: false,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: interactive,
          keyboard: interactive,
        });

        // 1. High-Resolution Real Satellite Imagery (Esri World Imagery)
        const satLayer = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS',
            maxZoom: 21,
            maxNativeZoom: 19,
          }
        );

        // 2. High-Resolution Reference / Street Labels Overlay
        const satLabelsLayer = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 21,
            maxNativeZoom: 19,
          }
        );

        // 3. OpenStreetMap Street Tiles
        const strLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        );

        satelliteLayerRef.current = satLayer;
        satelliteLabelsRef.current = satLabelsLayer;
        streetLayerRef.current = strLayer;

        // Default to Real Satellite Imagery Layer
        if (activeLayer === "satellite") {
          satLayer.addTo(map);
          satLabelsLayer.addTo(map);
        } else {
          strLayer.addTo(map);
        }

        if (interactive) {
          L.control.zoom({ position: "bottomright" }).addTo(map);
        }

        // Add marker if coordinates exist
        if (coordinates) {
          const marker = L.marker([coordinates.lat, coordinates.lng], {
            icon: getPinIcon(L),
            draggable: interactive && Boolean(onMapClickRef.current),
          }).addTo(map);

          if (interactive) {
            marker.on("dragend", () => {
              const pos = marker.getLatLng();
              prevCoordsRef.current = { lat: pos.lat, lng: pos.lng };
              if (onMapClickRef.current) {
                onMapClickRef.current({ lat: pos.lat, lng: pos.lng });
              }
            });
          }

          markerInstanceRef.current = marker;
          prevCoordsRef.current = { lat: coordinates.lat, lng: coordinates.lng };
        }

        // Handle map clicks — only when a click callback is supplied.
        // Pages without onMapClick (e.g. read-only Project Details) ignore
        // clicks entirely, keeping the saved pin locked in place while still
        // allowing the user to zoom and pan freely.
        if (interactive && onMapClickRef.current) {
          map.on("click", (e: any) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            prevCoordsRef.current = { lat, lng };

            if (markerInstanceRef.current) {
              markerInstanceRef.current.setLatLng([lat, lng]);
            } else {
              const marker = L.marker([lat, lng], {
                icon: getPinIcon(L),
                draggable: true,
              }).addTo(map);

              marker.on("dragend", () => {
                const pos = marker.getLatLng();
                prevCoordsRef.current = { lat: pos.lat, lng: pos.lng };
                if (onMapClickRef.current) {
                  onMapClickRef.current({ lat: pos.lat, lng: pos.lng });
                }
              });

              markerInstanceRef.current = marker;
            }

            if (onMapClickRef.current) {
              onMapClickRef.current({ lat, lng });
            }
          });
        }

        mapInstanceRef.current = map;
        setIsMapReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError("Unable to load satellite map. Please check your internet connection.");
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Layer changes dynamically (Satellite vs Streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const satLayer = satelliteLayerRef.current;
    const satLabels = satelliteLabelsRef.current;
    const strLayer = streetLayerRef.current;

    if (!satLayer || !strLayer) return;

    if (activeLayer === "satellite") {
      if (map.hasLayer(strLayer)) map.removeLayer(strLayer);
      if (!map.hasLayer(satLayer)) satLayer.addTo(map);
      if (satLabels && !map.hasLayer(satLabels)) satLabels.addTo(map);
    } else {
      if (map.hasLayer(satLayer)) map.removeLayer(satLayer);
      if (satLabels && map.hasLayer(satLabels)) map.removeLayer(satLabels);
      if (!map.hasLayer(strLayer)) strLayer.addTo(map);
    }
  }, [activeLayer]);

  // Sync marker when coordinates prop changes from outside
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    if (!map || !L || !coordinates) return;

    const prev = prevCoordsRef.current;
    const hasChanged =
      !prev ||
      Math.abs(prev.lat - coordinates.lat) > 0.00001 ||
      Math.abs(prev.lng - coordinates.lng) > 0.00001;

    if (!hasChanged) return;
    prevCoordsRef.current = { lat: coordinates.lat, lng: coordinates.lng };

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    } else {
      const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: getPinIcon(L),
        draggable: interactive && Boolean(onMapClickRef.current),
      }).addTo(map);

      if (interactive) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          prevCoordsRef.current = { lat: pos.lat, lng: pos.lng };
          if (onMapClickRef.current) {
            onMapClickRef.current({ lat: pos.lat, lng: pos.lng });
          }
        });
      }

      markerInstanceRef.current = marker;
    }

    // Zoom closely to individual rooftop level
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 18);
    map.setView([coordinates.lat, coordinates.lng], targetZoom, {
      animate: true,
    });
  }, [coordinates, interactive]);

  // Sync view when bounds change (e.g. Country or City selection)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !bounds) return;

    map.fitBounds(bounds, {
      padding: [24, 24],
      animate: true,
      maxZoom: 18,
    });
  }, [bounds]);

  // Sync boundary restriction
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (maxBounds) {
      map.setMaxBounds(maxBounds);
    } else {
      map.setMaxBounds(null);
    }
  }, [maxBounds]);

  // Sync view center when provided
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !viewCenter) return;

    map.setView([viewCenter.lat, viewCenter.lng], zoom ?? 13, {
      animate: true,
    });
  }, [viewCenter, zoom]);

  const handleCenterOnLocation = () => {
    if (!mapInstanceRef.current || !coordinates) return;
    mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 18, {
      animate: true,
    });
  };

  const wrapperStyle = height ? { height } : undefined;

  return (
    <div className="solarscope-map-wrapper" style={wrapperStyle}>
      <div
        ref={containerRef}
        className="solarscope-map-container"
        data-testid="interactive-location-map"
      />

      {/* Layer Switcher (Satellite vs Street) */}
      {interactive && isMapReady && (
        <div
          className="solarscope-map-layer-switcher"
          role="group"
          aria-label="Map imagery style"
        >
          <button
            type="button"
            className={`solarscope-layer-btn ${activeLayer === "satellite" ? "is-active" : ""
              }`}
            onClick={() => setActiveLayer("satellite")}
            title="Real high-resolution satellite imagery for rooftop inspection"
            aria-pressed={activeLayer === "satellite"}
          >
            <Layers size={12} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`solarscope-layer-btn ${activeLayer === "streets" ? "is-active" : ""
              }`}
            onClick={() => setActiveLayer("streets")}
            title="Standard street map"
            aria-pressed={activeLayer === "streets"}
          >
            <span>Street</span>
          </button>
        </div>
      )}

      {!isMapReady && !loadError && (
        <div className="solarscope-map-loading-overlay">
          <Loader2 size={24} className="solarscope-spin" />
          <span>Loading high-resolution satellite imagery...</span>
        </div>
      )}

      {isGeocoding && (
        <div className="solarscope-map-geocoding-badge" role="status">
          <Loader2 size={14} className="solarscope-spin" />
          <span>Fetching address for pinned location...</span>
        </div>
      )}

      {loadError && (
        <div className="solarscope-map-error-overlay">
          <p>{loadError}</p>
        </div>
      )}

      {/* Real Satellite Imagery Indicator */}
      {activeLayer === "satellite" && isMapReady && (
        <div className="solarscope-map-satellite-badge" aria-hidden="true">
          <span>High-Res Satellite Imagery (Rooftop Scale)</span>
        </div>
      )}

      {coordinates && isMapReady && interactive && (
        <div className="solarscope-map-coords-badge">
          <MapPin size={13} aria-hidden="true" />
          <span>
            {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
          </span>
          <button
            type="button"
            className="solarscope-map-recenter-btn"
            onClick={handleCenterOnLocation}
            title="Center map on pin (rooftop level)"
            aria-label="Center map on pinned coordinates"
          >
            <Compass size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
