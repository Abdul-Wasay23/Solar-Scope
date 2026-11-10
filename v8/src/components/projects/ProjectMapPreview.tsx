"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import "./ProjectMapPreview.css";

export type ProjectMapPreviewProps = {
  latitude?: number;
  longitude?: number;
  projectName?: string;
};

function loadLeafletLibrary(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

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

export default function ProjectMapPreview({
  latitude,
  longitude,
  projectName,
}: ProjectMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);

  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  useEffect(() => {
    if (!hasCoordinates) return;
    let isMounted = true;

    loadLeafletLibrary()
      .then((L) => {
        if (!isMounted || !containerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(containerRef.current, {
          center: [latitude, longitude],
          zoom: 20,
          maxZoom: 21,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        });

        // High-resolution real satellite imagery (rooftop scale)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 21,
            maxNativeZoom: 19,
          }
        ).addTo(map);

        // Reference / boundaries overlay
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 21,
            maxNativeZoom: 19,
          }
        ).addTo(map);

        const customIcon = L.divIcon({
          className: "solarscope-map-pin-container",
          html: `
            <div class="solarscope-custom-pin" aria-hidden="true" style="transform: scale(0.85); transform-origin: bottom center;">
              <svg width="32" height="42" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#0F2C59"/>
                <circle cx="17" cy="17" r="8" fill="#FFB800"/>
                <circle cx="17" cy="17" r="4" fill="#FFFFFF"/>
              </svg>
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
        });

        L.marker([latitude, longitude], {
          icon: customIcon,
          interactive: false,
        }).addTo(map);

        mapInstanceRef.current = map;
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, hasCoordinates]);

  if (!hasCoordinates || hasError) {
    return (
      <div className="project-card-map-preview" aria-hidden="true">
        <div className="project-card-map-fallback">
          <div className="project-card-map-fallback-icon">
            <MapPin size={16} />
          </div>
          <span className="project-card-map-fallback-text">
            Location Map Pending
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="project-card-map-preview" aria-hidden="true">
      <div ref={containerRef} className="project-card-map-container" />
      <div className="project-card-map-satellite-pill">
        <span>🛰️ Satellite</span>
      </div>
      <div className="project-card-map-badge">
        <MapPin size={10} />
        <span>
          {latitude.toFixed(2)}, {longitude.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
