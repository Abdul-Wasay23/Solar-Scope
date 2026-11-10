"use client";

/**
 * SolarScope — SiteLayoutMap Component (Upgraded Engineering Studio)
 *
 * Implements high-precision satellite overhead mapping with:
 * - Red setback buffer walkway band with on/off toggle
 * - Cyan row spacing and Purple module spacing overlays with on/off toggles
 * - Draggable boundary corner handles for editing perimeter
 * - Draggable restricted zone corner handles for adjusting obstacles
 * - Removal of location pin marker over solar panels
 * - Clean top mode indicator without overlapping drawing actions
 */

import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Box,
  Eye,
  Loader2,
} from "lucide-react";
import type {
  LatLngPoint,
  PlacedPanel,
  RestrictedZone,
  RestrictedZoneCategory,
} from "@/lib/solar/types";
import { RESTRICTED_ZONE_COLORS } from "@/lib/solar/types";
import {
  calculatePolygonAreaM2,
  getPanelBoundingPoints,
  getPolygonCentroid,
  getRotatedRectangleCorners,
  latLngToLocalMeters,
  localMetersToLatLng,
  Point2D,
} from "@/lib/geo/geometry";
import type { BuildingFeature } from "@/lib/geo/buildings";
import "./SiteLayoutMap.css";

export type MapMode =
  | "VIEW"
  | "PIN_LOCATION"
  | "HOUSE_SELECTION"
  | "DRAW_BOUNDARY"
  | "DRAW_ZONE"
  | "PANEL_EDIT";

export interface SiteLayoutMapProps {
  locationCoords: LatLngPoint | null;
  siteBoundary: LatLngPoint[];
  restrictedZones: RestrictedZone[];
  panels: PlacedPanel[];
  selectedPanelId?: string | null;
  selectedPanelIds?: string[];
  mode: MapMode;
  activeZoneCategory?: RestrictedZoneCategory;
  onMapClick?: (point: LatLngPoint) => void;
  onBoundaryPointAdd?: (point: LatLngPoint) => void;
  onZonePointAdd?: (point: LatLngPoint) => void;
  onPanelSelect?: (panelId: string | null, isShift?: boolean) => void;
  draftBoundaryPoints?: LatLngPoint[];
  draftZonePoints?: LatLngPoint[];
  height?: string | number;
  // 3D Building & House Selection extensions
  buildings?: BuildingFeature[];
  selectedBuildingId?: string | null;
  onBuildingSelect?: (building: BuildingFeature | null) => void;
  is3DView?: boolean;
  tiltAngle?: number;
  rotationAngle?: number;
  onToggle3D?: () => void;
  onTiltChange?: (tilt: number) => void;
  onRotationChange?: (rotation: number) => void;
  focusRadiusMeters?: number;
  onOpenBuildingStudio?: () => void;
  setbackM?: number;
  // Spacing & Setback visualization toggles
  showSetbackZone?: boolean;
  showRowSpacing?: boolean;
  showModuleSpacing?: boolean;
  rowSpacingM?: number;
  colSpacingM?: number;
  // Boundary & Zone interactive vertex editing
  isEditBoundaryMode?: boolean;
  activeEditZoneId?: string | null;
  onUpdateBoundaryPoint?: (index: number, point: LatLngPoint) => void;
  onUpdateZonePoint?: (zoneId: string, pointIndex: number, point: LatLngPoint) => void;
}

const KARACHI_DEFAULT_CENTER: LatLngPoint = { lat: 24.8607, lng: 67.0011 };
const TIGHT_PROPERTY_ZOOM = 19;

function loadLeafletLibrary(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  if ((window as any).L) {
    return Promise.resolve((window as any).L);
  }

  if (!document.getElementById("solarscope-leaflet-css")) {
    const link = document.createElement("link");
    link.id = "solarscope-leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }

    const existingScript = document.getElementById(
      "solarscope-leaflet-script"
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).L));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "solarscope-leaflet-script";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function SiteLayoutMap({
  locationCoords,
  siteBoundary,
  restrictedZones,
  panels,
  selectedPanelId,
  selectedPanelIds,
  mode,
  activeZoneCategory = "OTHER",
  onMapClick,
  onBoundaryPointAdd,
  onZonePointAdd,
  onPanelSelect,
  draftBoundaryPoints = [],
  draftZonePoints = [],
  height = "560px",
  buildings = [],
  selectedBuildingId = null,
  onBuildingSelect,
  is3DView = false,
  tiltAngle = 45,
  rotationAngle = 0,
  onToggle3D,
  onTiltChange,
  onRotationChange,
  focusRadiusMeters = 50,
  onOpenBuildingStudio,
  setbackM = 0.5,
  showSetbackZone = true,
  showRowSpacing = true,
  showModuleSpacing = true,
  rowSpacingM = 0.5,
  colSpacingM = 0.05,
  isEditBoundaryMode = false,
  activeEditZoneId = null,
  onUpdateBoundaryPoint,
  onUpdateZonePoint,
}: SiteLayoutMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  // Layer groups to prevent layer duplication
  const locationMarkerRef = useRef<any>(null);
  const focusCircleRef = useRef<any>(null);
  const buildingsLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const draftBoundaryLayerRef = useRef<any>(null);
  const restrictedZonesLayerRef = useRef<any>(null);
  const draftZoneLayerRef = useRef<any>(null);
  const panelsLayerRef = useRef<any>(null);
  const setbackLayerRef = useRef<any>(null);
  const spacingLayerRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store latest callbacks in refs to avoid recreating the map
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const onBoundaryPointAddRef = useRef(onBoundaryPointAdd);
  onBoundaryPointAddRef.current = onBoundaryPointAdd;

  const onZonePointAddRef = useRef(onZonePointAdd);
  onZonePointAddRef.current = onZonePointAdd;

  const onPanelSelectRef = useRef(onPanelSelect);
  onPanelSelectRef.current = onPanelSelect;

  const onBuildingSelectRef = useRef(onBuildingSelect);
  onBuildingSelectRef.current = onBuildingSelect;

  const onUpdateBoundaryPointRef = useRef(onUpdateBoundaryPoint);
  onUpdateBoundaryPointRef.current = onUpdateBoundaryPoint;

  const onUpdateZonePointRef = useRef(onUpdateZonePoint);
  onUpdateZonePointRef.current = onUpdateZonePoint;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Custom Pin DivIcon - Vivid Red Pin with Drop Shadow for clear rooftop visibility
  const getPinIcon = (L: any) =>
    L.divIcon({
      className: "solarscope-map-pin-container",
      html: `
        <div class="solarscope-custom-pin" aria-hidden="true" style="width:34px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.65));animation:bouncePin 1.5s infinite alternate ease-in-out;">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 44 17 44C17 44 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="#DC2626"/>
            <circle cx="17" cy="17" r="8" fill="#FFFFFF"/>
            <circle cx="17" cy="17" r="4.5" fill="#DC2626"/>
          </svg>
        </div>
      `,
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -44],
    });

  // Dynamic vertex marker icon
  const getVertexIcon = (L: any, color: string = "#0F2C59", size: number = 10, pulsing: boolean = false) =>
    L.divIcon({
      className: "solarscope-vertex-pin",
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #FFFFFF;
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
          cursor: grab;
          ${pulsing ? `animation: pulseDot 1.2s infinite ease-in-out;` : ""}
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

  // 1. Initialize Map
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

        const initialCenter =
          locationCoords ||
          (siteBoundary.length > 0
            ? getPolygonCentroid(siteBoundary)
            : KARACHI_DEFAULT_CENTER);
        const initialZoom = 19;

        const map = L.map(containerRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: initialZoom,
          maxZoom: 25,
          zoomControl: false,
        });

        // High-Resolution Satellite Imagery (Esri World Imagery)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA, USGS",
            maxZoom: 25,
            maxNativeZoom: 19,
          }
        ).addTo(map);

        // Reference overlay (place names & building labels)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 25,
            maxNativeZoom: 19,
          }
        ).addTo(map);

        L.control.zoom({ position: "topright" }).addTo(map);

        // Initialize Layer groups
        buildingsLayerRef.current = L.layerGroup().addTo(map);
        boundaryLayerRef.current = L.layerGroup().addTo(map);
        setbackLayerRef.current = L.layerGroup().addTo(map);
        spacingLayerRef.current = L.layerGroup().addTo(map);
        draftBoundaryLayerRef.current = L.layerGroup().addTo(map);
        restrictedZonesLayerRef.current = L.layerGroup().addTo(map);
        draftZoneLayerRef.current = L.layerGroup().addTo(map);
        panelsLayerRef.current = L.layerGroup().addTo(map);

        // Global Map Click Handler
        map.on("click", (e: any) => {
          const clickedPoint: LatLngPoint = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
          };

          const currentMode = modeRef.current;
          if (currentMode === "PIN_LOCATION") {
            if (onMapClickRef.current) {
              onMapClickRef.current(clickedPoint);
            }
          } else if (currentMode === "DRAW_BOUNDARY") {
            if (onBoundaryPointAddRef.current) {
              onBoundaryPointAddRef.current(clickedPoint);
            }
          } else if (currentMode === "DRAW_ZONE") {
            if (onZonePointAddRef.current) {
              onZonePointAddRef.current(clickedPoint);
            }
          } else if (currentMode === "HOUSE_SELECTION") {
            if (onBuildingSelectRef.current) {
              onBuildingSelectRef.current(null);
            }
          } else if (currentMode === "PANEL_EDIT" || currentMode === "VIEW") {
            if (onPanelSelectRef.current) {
              onPanelSelectRef.current(null);
            }
          }
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);
        setTimeout(() => {
          map.invalidateSize();
          const target =
            locationCoords ||
            (siteBoundary && siteBoundary.length > 0
              ? getPolygonCentroid(siteBoundary)
              : KARACHI_DEFAULT_CENTER);
          map.setView([target.lat, target.lng], 19);
        }, 120);
        setTimeout(() => {
          map.invalidateSize();
          const target =
            locationCoords ||
            (siteBoundary && siteBoundary.length > 0
              ? getPolygonCentroid(siteBoundary)
              : KARACHI_DEFAULT_CENTER);
          map.setView([target.lat, target.lng], 19);
        }, 350);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError("Unable to load map. Please check your internet connection.");
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Project Location Pin Marker & Focus Zone
  // (Hidden when panels or boundary are placed to avoid covering solar modules)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    if (!map || !L) return;

    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove();
      locationMarkerRef.current = null;
    }

    if (focusCircleRef.current) {
      focusCircleRef.current.remove();
      focusCircleRef.current = null;
    }

    if (locationCoords) {
      const targetCenter =
        siteBoundary && siteBoundary.length >= 3
          ? getPolygonCentroid(siteBoundary)
          : locationCoords;

      // Only show location pin when in PIN_LOCATION mode or before boundary/panels are placed
      const shouldShowPin =
        mode === "PIN_LOCATION" ||
        (siteBoundary.length < 3 && (!panels || panels.length === 0));

      if (shouldShowPin) {
        const focusCircle = L.circle([locationCoords.lat, locationCoords.lng], {
          radius: focusRadiusMeters,
          color: "#38BDF8",
          weight: 1.5,
          opacity: 0.7,
          fillColor: "#0284C7",
          fillOpacity: 0.05,
          dashArray: "4, 6",
          interactive: false,
        }).addTo(map);

        focusCircleRef.current = focusCircle;

        const marker = L.marker([locationCoords.lat, locationCoords.lng], {
          icon: getPinIcon(L),
          draggable: mode === "PIN_LOCATION",
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          if (onMapClickRef.current) {
            onMapClickRef.current({ lat: pos.lat, lng: pos.lng });
          }
        });

        locationMarkerRef.current = marker;
      }
    }
  }, [locationCoords, mode, focusRadiusMeters, siteBoundary, panels, isMapReady]);

  // 3. Clear artificial building overlays to keep satellite map unobstructed
  useEffect(() => {
    if (!buildingsLayerRef.current) return;
    buildingsLayerRef.current.clearLayers();
  }, [buildings, selectedBuildingId, is3DView]);

  // 4. Render Site / Rooftop Boundary Polygon with Draggable Corner Editing
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();

    if (siteBoundary && siteBoundary.length >= 3) {
      const latLngs = siteBoundary.map((p) => [p.lat, p.lng]);

      const polygon = L.polygon(latLngs, {
        color: isEditBoundaryMode ? "#3B82F6" : "#10B981",
        weight: isEditBoundaryMode ? 3.5 : 3,
        opacity: 0.95,
        fillColor: isEditBoundaryMode ? "#3B82F6" : "#10B981",
        fillOpacity: isEditBoundaryMode ? 0.22 : 0.16,
      });

      polygon.bindTooltip(
        isEditBoundaryMode
          ? "Boundary Edit Mode: Drag corner handles to reshape"
          : "Confirmed Usable Roof Area",
        {
          sticky: true,
          className: "solarscope-map-tooltip",
        }
      );

      boundaryLayerRef.current.addLayer(polygon);

      // Render vertex corner handles (draggable when isEditBoundaryMode is true)
      siteBoundary.forEach((pt, index) => {
        const vertexMarker = L.marker([pt.lat, pt.lng], {
          icon: isEditBoundaryMode
            ? getVertexIcon(L, "#3B82F6", 14, true)
            : getVertexIcon(L, "#10B981", 10),
          draggable: isEditBoundaryMode,
        });

        if (isEditBoundaryMode) {
          vertexMarker.bindTooltip(`Vertex #${index + 1} (Drag to adjust)`, {
            direction: "top",
          });

          vertexMarker.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            if (onUpdateBoundaryPointRef.current) {
              onUpdateBoundaryPointRef.current(index, { lat: pos.lat, lng: pos.lng });
            }
          });
        }

        boundaryLayerRef.current.addLayer(vertexMarker);
      });
    }
  }, [siteBoundary, isEditBoundaryMode, isMapReady]);

  // 4b. Render Setback / Walkway Buffer Zone in RED (#EF4444)
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !setbackLayerRef.current) return;

    setbackLayerRef.current.clearLayers();

    if (!siteBoundary || siteBoundary.length < 3 || setbackM <= 0 || !showSetbackZone) return;

    try {
      const origin = getPolygonCentroid(siteBoundary);
      const localPts = siteBoundary.map((p) => latLngToLocalMeters(p, origin));

      const cx = localPts.reduce((s: number, p: any) => s + p.x, 0) / localPts.length;
      const cy = localPts.reduce((s: number, p: any) => s + p.y, 0) / localPts.length;

      // Inset each point toward centroid by setbackM
      const insetLocal = localPts.map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const factor = Math.max(0, (dist - setbackM) / dist);
        return { x: cx + dx * factor, y: cy + dy * factor };
      });

      const insetLatLng = insetLocal.map((p) => localMetersToLatLng(p, origin));
      const outerLatLngs = siteBoundary.map((p) => [p.lat, p.lng]);
      const innerLatLngs = insetLatLng.map((p) => [p.lat, p.lng]);

      // Donut walkway polygon in RED
      const walkwayPoly = L.polygon([outerLatLngs, innerLatLngs], {
        color: "#DC2626",
        weight: 1.5,
        opacity: 0.9,
        fillColor: "#EF4444",
        fillOpacity: 0.28,
        dashArray: "4,4",
        interactive: false,
      });

      walkwayPoly.bindTooltip(`Walkway Setback Buffer: ${setbackM}m (No Panels Permitted)`, {
        sticky: true,
        className: "solarscope-map-tooltip",
      });

      setbackLayerRef.current.addLayer(walkwayPoly);

      // Inner boundary guideline
      const innerLine = L.polygon(innerLatLngs, {
        color: "#EF4444",
        weight: 1.5,
        opacity: 0.75,
        fillColor: "transparent",
        fillOpacity: 0,
        dashArray: "3,3",
        interactive: false,
      });
      setbackLayerRef.current.addLayer(innerLine);
    } catch {
      // geometry guard
    }
  }, [siteBoundary, setbackM, showSetbackZone, isMapReady]);

  // 4c. Render Row Spacing (Cyan) and Module Spacing (Purple) Corridors
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !spacingLayerRef.current) return;

    spacingLayerRef.current.clearLayers();

    if (!panels || panels.length < 2) return;
    if (!showRowSpacing && !showModuleSpacing) return;

    try {
      const origin = panels[0].center;
      const panelsLocal = panels.map((p) => ({
        panel: p,
        local: latLngToLocalMeters(p.center, origin),
      }));

      // Find pairs and draw spacing indicators
      for (let i = 0; i < panelsLocal.length; i++) {
        for (let j = i + 1; j < panelsLocal.length; j++) {
          const p1 = panelsLocal[i];
          const p2 = panelsLocal[j];

          const dx = p2.local.x - p1.local.x;
          const dy = p2.local.y - p1.local.y;

          const azRad = (p1.panel.rotationDeg * Math.PI) / 180;
          const cos = Math.cos(-azRad);
          const sin = Math.sin(-azRad);
          const du = Math.abs(dx * cos - dy * sin);
          const dv = Math.abs(dx * sin + dy * cos);

          const w = p1.panel.widthM;
          const h = p1.panel.heightM;

          // 1. Module Spacing (Purple): Adjacent in same row along width axis
          if (showModuleSpacing && dv < h * 0.4 && du > w * 0.8 && du < w * 2.2) {
            const gapWidth = Math.max(0.05, du - w);
            const gapCenterLocal = {
              x: (p1.local.x + p2.local.x) / 2,
              y: (p1.local.y + p2.local.y) / 2,
            };
            const gapCorners = getRotatedRectangleCorners(
              gapCenterLocal,
              gapWidth,
              h * 0.95,
              p1.panel.rotationDeg
            );
            const gapLatLngs = gapCorners
              .map((c) => localMetersToLatLng(c, origin))
              .map((p) => [p.lat, p.lng]);

            const gapPoly = L.polygon(gapLatLngs, {
              color: "#9333EA",
              weight: 1,
              fillColor: "#A855F7",
              fillOpacity: 0.35,
              interactive: false,
            });
            gapPoly.bindTooltip(`Module Spacing: ${gapWidth.toFixed(2)}m`, {
              sticky: true,
              className: "solarscope-map-tooltip",
            });
            spacingLayerRef.current.addLayer(gapPoly);
          }

          // 2. Row Spacing (Cyan): Adjacent in successive rows along height axis
          if (showRowSpacing && du < w * 0.5 && dv > h * 0.8 && dv < h * 3.0) {
            const gapHeight = Math.max(0.1, dv - h);
            const rowGapCenterLocal = {
              x: (p1.local.x + p2.local.x) / 2,
              y: (p1.local.y + p2.local.y) / 2,
            };
            const rowGapCorners = getRotatedRectangleCorners(
              rowGapCenterLocal,
              w * 0.95,
              gapHeight,
              p1.panel.rotationDeg
            );
            const rowGapLatLngs = rowGapCorners
              .map((c) => localMetersToLatLng(c, origin))
              .map((p) => [p.lat, p.lng]);

            const rowPoly = L.polygon(rowGapLatLngs, {
              color: "#0891B2",
              weight: 1,
              fillColor: "#06B6D4",
              fillOpacity: 0.35,
              interactive: false,
            });
            rowPoly.bindTooltip(`Row Pitch Spacing: ${gapHeight.toFixed(2)}m`, {
              sticky: true,
              className: "solarscope-map-tooltip",
            });
            spacingLayerRef.current.addLayer(rowPoly);
          }
        }
      }
    } catch {
      // guard
    }
  }, [panels, showRowSpacing, showModuleSpacing, isMapReady]);

  // 5. Render Draft Boundary in Progress
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !draftBoundaryLayerRef.current) return;

    draftBoundaryLayerRef.current.clearLayers();

    if (draftBoundaryPoints && draftBoundaryPoints.length > 0) {
      const latLngs = draftBoundaryPoints.map((p) => [p.lat, p.lng]);

      if (draftBoundaryPoints.length >= 3) {
        const draftPoly = L.polygon(latLngs, {
          color: "#2563EB",
          weight: 2,
          dashArray: "6, 6",
          fillColor: "#2563EB",
          fillOpacity: 0.15,
        });
        draftBoundaryLayerRef.current.addLayer(draftPoly);
      } else if (draftBoundaryPoints.length === 2) {
        const draftLine = L.polyline(latLngs, {
          color: "#2563EB",
          weight: 2,
          dashArray: "6, 6",
        });
        draftBoundaryLayerRef.current.addLayer(draftLine);
      }

      draftBoundaryPoints.forEach((pt, index) => {
        const vertexMarker = L.marker([pt.lat, pt.lng], {
          icon: getVertexIcon(L, "#2563EB", 10),
          interactive: false,
        });
        vertexMarker.bindTooltip(`P${index + 1}`, {
          permanent: true,
          direction: "top",
          className: "solarscope-vertex-tooltip",
        });
        draftBoundaryLayerRef.current.addLayer(vertexMarker);
      });
    }
  }, [draftBoundaryPoints, isMapReady]);

  // 6. Render Restricted Zones with Draggable Vertex Editing
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !restrictedZonesLayerRef.current) return;

    restrictedZonesLayerRef.current.clearLayers();

    restrictedZones.forEach((zone) => {
      if (zone.points.length < 3) return;

      const latLngs = zone.points.map((p) => [p.lat, p.lng]);
      const styling = RESTRICTED_ZONE_COLORS[zone.category] || RESTRICTED_ZONE_COLORS.OTHER;
      const isEditingThisZone = activeEditZoneId === zone.id;

      const poly = L.polygon(latLngs, {
        color: isEditingThisZone ? "#F59E0B" : styling.stroke,
        weight: isEditingThisZone ? 3 : 2,
        fillColor: styling.stroke,
        fillOpacity: 0.35,
        dashArray: "4, 4",
      });

      poly.bindTooltip(
        isEditingThisZone
          ? `Editing ${zone.name}: Drag corner pins to adjust`
          : `${zone.name} (${zone.areaM2} m²)`,
        {
          sticky: true,
          className: "solarscope-map-tooltip",
        }
      );

      restrictedZonesLayerRef.current.addLayer(poly);

      // Render vertex handles for this zone
      zone.points.forEach((pt, pIdx) => {
        const marker = L.marker([pt.lat, pt.lng], {
          icon: isEditingThisZone
            ? getVertexIcon(L, "#F59E0B", 13, true)
            : getVertexIcon(L, styling.stroke, 8),
          draggable: isEditingThisZone,
        });

        if (isEditingThisZone) {
          marker.bindTooltip(`${zone.name} Corner #${pIdx + 1} (Drag to move)`, {
            direction: "top",
          });

          marker.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            if (onUpdateZonePointRef.current) {
              onUpdateZonePointRef.current(zone.id, pIdx, { lat: pos.lat, lng: pos.lng });
            }
          });
        }

        restrictedZonesLayerRef.current.addLayer(marker);
      });
    });
  }, [restrictedZones, activeEditZoneId, isMapReady]);

  // 7. Render Draft Restricted Zone in Progress
  useEffect(() => {
    const L = leafletLibRef.current;
    if (!L || !draftZoneLayerRef.current) return;

    draftZoneLayerRef.current.clearLayers();

    if (draftZonePoints && draftZonePoints.length > 0) {
      const latLngs = draftZonePoints.map((p) => [p.lat, p.lng]);
      const styling =
        RESTRICTED_ZONE_COLORS[activeZoneCategory] || RESTRICTED_ZONE_COLORS.OTHER;

      if (draftZonePoints.length >= 3) {
        const poly = L.polygon(latLngs, {
          color: styling.stroke,
          weight: 2,
          dashArray: "4, 4",
          fillColor: styling.stroke,
          fillOpacity: 0.25,
        });
        draftZoneLayerRef.current.addLayer(poly);
      } else if (draftZonePoints.length === 2) {
        const line = L.polyline(latLngs, {
          color: styling.stroke,
          weight: 2,
          dashArray: "4, 4",
        });
        draftZoneLayerRef.current.addLayer(line);
      }

      draftZonePoints.forEach((pt, index) => {
        const marker = L.marker([pt.lat, pt.lng], {
          icon: getVertexIcon(L, styling.stroke, 10),
          interactive: false,
        });
        marker.bindTooltip(`Z${index + 1}`, {
          permanent: true,
          direction: "top",
          className: "solarscope-vertex-tooltip",
        });
        draftZoneLayerRef.current.addLayer(marker);
      });
    }
  }, [draftZonePoints, activeZoneCategory, isMapReady]);

  // 8. Render Solar Panels
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    if (!map || !L || !panelsLayerRef.current) return;

    panelsLayerRef.current.clearLayers();

    panels.forEach((panel) => {
      const boundingCorners = getPanelBoundingPoints(panel);
      const latLngs = boundingCorners.map((p) => [p.lat, p.lng]);

      const isSelected =
        selectedPanelIds && selectedPanelIds.length > 0
          ? selectedPanelIds.includes(panel.id)
          : panel.id === selectedPanelId;

      let strokeColor = "#0F2C59";
      let fillColor = "#1E3A8A";
      let fillOpacity = 0.78;

      if (panel.status === "OVERLAPPING") {
        strokeColor = "#DC2626";
        fillColor = "#EF4444";
      } else if (panel.status === "OUTSIDE_BOUNDARY") {
        strokeColor = "#D97706";
        fillColor = "#F59E0B";
      } else if (panel.status === "RESTRICTED_COLLISION") {
        strokeColor = "#991B1B";
        fillColor = "#B91C1C";
      }

      if (isSelected) {
        strokeColor = "#FFB800";
        fillColor = "#FFB800";
        fillOpacity = 0.95;
      }

      const panelPolygon = L.polygon(latLngs, {
        color: strokeColor,
        weight: isSelected ? 3 : 1.5,
        fillColor,
        fillOpacity,
        className: isSelected ? "solarscope-selected-panel-poly" : "",
      });

      panelPolygon.on("click", (e: any) => {
        L.DomEvent.stopPropagation(e);
        const isShift = !!(e.originalEvent && e.originalEvent.shiftKey);
        if (onPanelSelectRef.current) {
          onPanelSelectRef.current(panel.id, isShift);
        }
      });

      panelPolygon.bindTooltip(
        `${panel.id.toUpperCase()}: ${panel.wattageW}W (${panel.status})`,
        {
          sticky: true,
          className: "solarscope-map-tooltip",
        }
      );

      panelsLayerRef.current.addLayer(panelPolygon);
    });
  }, [panels, selectedPanelId, selectedPanelIds, isMapReady]);

  // Recenter on tight 50m property focus
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    if (!map || !L) return;

    const target =
      locationCoords ||
      (siteBoundary.length > 0 ? getPolygonCentroid(siteBoundary) : KARACHI_DEFAULT_CENTER);
    map.setView([target.lat, target.lng], 19, {
      animate: true,
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  };

  return (
    <div
      className={`solarscope-site-map-wrapper ${isFullscreen ? "is-fullscreen" : ""}`}
      style={!isFullscreen ? { height } : undefined}
    >
      <div
        ref={containerRef}
        className={`solarscope-site-map-container ${is3DView ? "is-3d-perspective" : ""}`}
        style={
          is3DView
            ? {
              width: "140%",
              height: "140%",
              marginLeft: "-20%",
              marginTop: "-20%",
              transform: `perspective(1000px) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg)`,
              transformOrigin: "50% 50%",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }
            : {
              width: "100%",
              height: "100%",
              transform: "none",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }
        }
        data-testid="site-layout-map"
      />

      {/* Loading Overlay */}
      {!isMapReady && !loadError && (
        <div className="solarscope-site-map-loading">
          <Loader2 size={28} className="solarscope-spin" />
          <span>Initializing high-precision spatial map...</span>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="solarscope-site-map-error">
          <p>{loadError}</p>
        </div>
      )}

      {/* Top Floating Controls - Hidden when drawing to avoid overlap with action banner */}
      {mode !== "DRAW_BOUNDARY" && mode !== "DRAW_ZONE" && (
        <div className="solarscope-site-map-top-bar">
          <div className="solarscope-site-map-mode-indicator">
            <span className="mode-dot" data-mode={mode} />
            <span className="mode-label">
              {mode === "VIEW" && (isEditBoundaryMode ? "Boundary Corner Edit Mode" : "Navigation Mode")}
              {mode === "PIN_LOCATION" && "Click Map to Pin Location"}
              {mode === "HOUSE_SELECTION" && "Click House to Select in 3D"}
              {mode === "PANEL_EDIT" && "Panel Inspection & Manual Editing"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Floating Status Badge */}
      <div className="solarscope-site-map-bottom-bar">
        {locationCoords && (
          <div className="solarscope-site-map-badge">
            <MapPin size={12} />
            <span>
              {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)} (~50m zone)
            </span>
          </div>
        )}

        {siteBoundary.length >= 3 && (
          <div className="solarscope-site-map-badge">
            <span>Rooftop: {Math.round(calculatePolygonAreaM2(siteBoundary))} m²</span>
          </div>
        )}
      </div>

      {/* Floating Action Controls */}
      <div className="solarscope-site-map-controls">
        <button
          type="button"
          onClick={handleRecenter}
          className="solarscope-map-btn"
          title="Recenter on house"
          aria-label="Recenter on house"
        >
          <Compass size={16} />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="solarscope-map-btn"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}
