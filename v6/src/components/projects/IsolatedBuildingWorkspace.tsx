"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  RotateCw,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sun,
  Eye,
  ArrowLeft,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Grid,
  Shield,
  Download
} from "lucide-react";
import type { LatLngPoint, PlacedPanel, SolarPanelSpec } from "@/lib/solar/types";
import { latLngToLocalMeters, getPolygonCentroid, calculatePolygonAreaM2 } from "@/lib/geo/geometry";
import "./IsolatedBuildingWorkspace.css";

export interface IsolatedBuildingProps {
  projectId: string;
  projectName?: string;
  locationCoords?: LatLngPoint | null;
  buildingPoints: LatLngPoint[];
  buildingName?: string;
  heightMeters?: number;
  levels?: number;
  panels?: PlacedPanel[];
  panelSpec?: SolarPanelSpec;
  setbackM?: number;
  onBackToMap: () => void;
  onProceedToSolar?: () => void;
}

interface Point3D {
  x: number; // East (meters)
  y: number; // North (meters)
  z: number; // Up (meters)
}

interface Face3D {
  points: Point3D[];
  normal: Point3D;
  center: Point3D;
  type: "roof" | "wall" | "ground";
  label?: string;
  color?: string;
}

export default function IsolatedBuildingWorkspace({
  projectId,
  projectName = "SolarScope Project",
  locationCoords,
  buildingPoints,
  buildingName = "Target Residential Structure",
  heightMeters = 6.5,
  levels = 2,
  panels = [],
  panelSpec,
  setbackM = 0,
  onBackToMap,
  onProceedToSolar,
}: IsolatedBuildingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport & Camera Orbit State
  const [yaw, setYaw] = useState<number>(35); // Horizontal rotation in degrees
  const [pitch, setPitch] = useState<number>(38); // Vertical tilt angle (10 to 88 degrees)
  const [zoom, setZoom] = useState<number>(1.15); // Zoom scale multiplier
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Display Settings
  const [viewMode, setViewMode] = useState<"3d-solid" | "wireframe" | "solar-ready">("3d-solid");
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [sunAzimuth, setSunAzimuth] = useState<number>(180); // 180° = South sun
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Calculate building centroid and local metric coordinates (in meters)
  const centroid = useMemo(() => {
    if (buildingPoints.length > 0) {
      return getPolygonCentroid(buildingPoints);
    }
    return locationCoords || { lat: 24.93923, lng: 67.15024 };
  }, [buildingPoints, locationCoords]);

  // Fallback footprint if points not passed
  const effectivePoints = useMemo(() => {
    if (buildingPoints && buildingPoints.length >= 3) {
      return buildingPoints;
    }
    // Standard localized demo building footprint ~18m x 14m
    const dLat = 0.00015;
    const dLng = 0.00018;
    return [
      { lat: centroid.lat - dLat * 0.5, lng: centroid.lng - dLng * 0.6 },
      { lat: centroid.lat + dLat * 0.5, lng: centroid.lng - dLng * 0.6 },
      { lat: centroid.lat + dLat * 0.5, lng: centroid.lng + dLng * 0.6 },
      { lat: centroid.lat - dLat * 0.5, lng: centroid.lng + dLng * 0.6 },
    ];
  }, [buildingPoints, centroid]);

  // Convert geographic points into localized Cartesian metric coords (meters centered at 0,0)
  const { local2DPoints, centerOffset } = useMemo(() => {
    const raw = effectivePoints.map((p) => latLngToLocalMeters(p, centroid));
    // Center bounding box at (0, 0)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    raw.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const pts = raw.map((pt) => ({
      x: pt.x - centerX,
      y: pt.y - centerY,
    }));
    return {
      local2DPoints: pts,
      centerOffset: { x: centerX, y: centerY },
    };
  }, [effectivePoints, centroid]);

  // Dimensional Stats
  const stats = useMemo(() => {
    const areaM2 = Math.round(calculatePolygonAreaM2(effectivePoints) * 10) / 10;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    local2DPoints.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    const widthM = Math.round((maxX - minX) * 10) / 10;
    const lengthM = Math.round((maxY - minY) * 10) / 10;
    const effectiveHeight = heightMeters || levels * 3.2;

    // Calculate perimeter
    let perimeter = 0;
    for (let i = 0; i < local2DPoints.length; i++) {
      const next = (i + 1) % local2DPoints.length;
      const dx = local2DPoints[next].x - local2DPoints[i].x;
      const dy = local2DPoints[next].y - local2DPoints[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      areaM2,
      widthM,
      lengthM,
      heightM: Math.round(effectiveHeight * 10) / 10,
      perimeterM: Math.round(perimeter * 10) / 10,
      levelsCount: levels || 2,
    };
  }, [effectivePoints, local2DPoints, heightMeters, levels]);

  // Construct 3D Geometry (Ground footprint, Extruded walls, Rooftop surface)
  const geometry3D = useMemo(() => {
    const h = stats.heightM;
    const pts = local2DPoints;
    const n = pts.length;
    const faces: Face3D[] = [];

    // 1. Ground Shadow Face
    const groundPts: Point3D[] = pts.map((p) => ({ x: p.x, y: p.y, z: 0 }));
    faces.push({
      points: groundPts,
      normal: { x: 0, y: 0, z: -1 },
      center: { x: 0, y: 0, z: 0 },
      type: "ground",
    });

    // 2. Wall Facets
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const p1 = pts[i];
      const p2 = pts[next];
      const wallPts: Point3D[] = [
        { x: p1.x, y: p1.y, z: 0 },
        { x: p2.x, y: p2.y, z: 0 },
        { x: p2.x, y: p2.y, z: h },
        { x: p1.x, y: p1.y, z: h },
      ];

      // Calculate outward face normal
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;

      faces.push({
        points: wallPts,
        normal: { x: nx, y: ny, z: 0 },
        center: {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
          z: h / 2,
        },
        type: "wall",
        label: `${(Math.sqrt(dx * dx + dy * dy)).toFixed(1)}m`,
      });
    }

    // 3. Rooftop Surface
    const roofPts: Point3D[] = pts.map((p) => ({ x: p.x, y: p.y, z: h }));
    faces.push({
      points: roofPts,
      normal: { x: 0, y: 0, z: 1 },
      center: { x: 0, y: 0, z: h },
      type: "roof",
    });

    return faces;
  }, [local2DPoints, stats.heightM]);

  // 3D Matrix Projection Function: (x, y, z) in meters -> (screenX, screenY, depth)
  const projectPoint = useCallback(
    (pt: Point3D, width: number, height: number): { x: number; y: number; depth: number } => {
      const radYaw = (yaw * Math.PI) / 180;
      const radPitch = (pitch * Math.PI) / 180;

      // 1. Rotate around Z axis (Yaw)
      const x1 = pt.x * Math.cos(radYaw) - pt.y * Math.sin(radYaw);
      const y1 = pt.x * Math.sin(radYaw) + pt.y * Math.cos(radYaw);
      const z1 = pt.z;

      // 2. Rotate around X axis (Pitch)
      const x2 = x1;
      const y2 = y1 * Math.cos(radPitch) - z1 * Math.sin(radPitch);
      const z2 = y1 * Math.sin(radPitch) + z1 * Math.cos(radPitch);

      // 3. Perspective Projection
      const cameraDistance = 45;
      const fovFactor = 1000;
      const depth = cameraDistance + y2;
      const scale = (fovFactor / Math.max(10, depth)) * zoom;

      const screenX = width / 2 + x2 * scale + panOffset.x;
      const screenY = height / 2 - z2 * scale + panOffset.y;

      return { x: screenX, y: screenY, depth: z2 };
    },
    [yaw, pitch, zoom, panOffset]
  );

  // Render 3D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI Display Scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Studio Background Gradient
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.1,
      width / 2,
      height / 2,
      width * 0.8
    );
    bgGrad.addColorStop(0, "#0F172A");
    bgGrad.addColorStop(0.6, "#090D16");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Metric Ground Grid (5m major, 1m minor)
    if (showGrid) {
      const gridSizeMeters = 30;
      const step = 2; // 2 meter grid steps

      ctx.save();
      ctx.lineWidth = 1;

      // Minor grid lines
      for (let g = -gridSizeMeters; g <= gridSizeMeters; g += step) {
        const pA = projectPoint({ x: g, y: -gridSizeMeters, z: 0 }, width, height);
        const pB = projectPoint({ x: g, y: gridSizeMeters, z: 0 }, width, height);
        ctx.strokeStyle = g === 0 ? "rgba(56, 189, 248, 0.45)" : "rgba(148, 163, 184, 0.08)";
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        const pC = projectPoint({ x: -gridSizeMeters, y: g, z: 0 }, width, height);
        const pD = projectPoint({ x: gridSizeMeters, y: g, z: 0 }, width, height);
        ctx.strokeStyle = g === 0 ? "rgba(56, 189, 248, 0.45)" : "rgba(148, 163, 184, 0.08)";
        ctx.beginPath();
        ctx.moveTo(pC.x, pC.y);
        ctx.lineTo(pD.x, pD.y);
        ctx.stroke();
      }

      // Compass Direction Indicators on Floor
      const compassRadius = 14;
      const dirOffsets = [
        { label: "N", x: 0, y: compassRadius, color: "#38BDF8" },
        { label: "S", x: 0, y: -compassRadius, color: "#94A3B8" },
        { label: "E", x: compassRadius, y: 0, color: "#94A3B8" },
        { label: "W", x: -compassRadius, y: 0, color: "#94A3B8" },
      ];
      dirOffsets.forEach((d) => {
        const pos = projectPoint({ x: d.x, y: d.y, z: 0 }, width, height);
        ctx.fillStyle = d.color;
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.label, pos.x, pos.y);
      });

      ctx.restore();
    }

    // 3. Sun Direction Vector for Realistic Shading
    const sunRad = (sunAzimuth * Math.PI) / 180;
    const sunVector = {
      x: Math.sin(sunRad) * 0.7,
      y: -Math.cos(sunRad) * 0.7,
      z: 0.8,
    };
    const sunLen = Math.sqrt(
      sunVector.x * sunVector.x + sunVector.y * sunVector.y + sunVector.z * sunVector.z
    );
    const sNorm = {
      x: sunVector.x / sunLen,
      y: sunVector.y / sunLen,
      z: sunVector.z / sunLen,
    };

    // 4. Sort Faces by Depth (Painter's Algorithm)
    const projectedFaces = geometry3D
      .map((face) => {
        const centerProj = projectPoint(face.center, width, height);
        const polyProj = face.points.map((p) => projectPoint(p, width, height));
        return {
          face,
          centerDepth: centerProj.depth,
          poly: polyProj,
        };
      })
      .sort((a, b) => a.centerDepth - b.centerDepth);

    // 5. Draw 3D Building Faces
    projectedFaces.forEach(({ face, poly }) => {
      if (poly.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();

      if (face.type === "ground") {
        // Ambient Occlusion Ground Contact Shadow
        ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (face.type === "wall") {
        // Calculate Directional Diffuse Shading
        const dot = face.normal.x * sNorm.x + face.normal.y * sNorm.y;
        const lightIntensity = Math.max(0.2, 0.55 + 0.4 * dot);

        if (viewMode === "wireframe") {
          ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
          ctx.fill();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Architectural Solid Shading
          const baseR = Math.round(30 * lightIntensity);
          const baseG = Math.round(41 * lightIntensity);
          const baseB = Math.round(59 * lightIntensity);
          ctx.fillStyle = `rgb(${baseR + 25}, ${baseG + 35}, ${baseB + 50})`;
          ctx.fill();

          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw Edge Dimension Label
        if (showDimensions && face.label && viewMode !== "wireframe") {
          const midX = (poly[0].x + poly[1].x) / 2;
          const midY = (poly[0].y + poly[1].y) / 2;
          ctx.save();
          ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
          ctx.font = "600 10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(face.label, midX, midY + 12);
          ctx.restore();
        }
      } else if (face.type === "roof") {
        // ROOFTOP SURFACE (High-Visibility Solar Installation Plane)
        if (viewMode === "solar-ready") {
          ctx.fillStyle = "rgba(16, 185, 129, 0.38)";
          ctx.fill();
          ctx.strokeStyle = "#10B981";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Solar panel grid lines
          ctx.save();
          ctx.strokeStyle = "rgba(52, 211, 153, 0.25)";
          ctx.lineWidth = 1;
          for (let step = 0.2; step <= 0.8; step += 0.2) {
            ctx.beginPath();
            ctx.moveTo(
              poly[0].x + (poly[1].x - poly[0].x) * step,
              poly[0].y + (poly[1].y - poly[0].y) * step
            );
            ctx.lineTo(
              poly[3]?.x ? poly[3].x + (poly[2].x - poly[3].x) * step : poly[2].x,
              poly[3]?.y ? poly[3].y + (poly[2].y - poly[3].y) * step : poly[2].y
            );
            ctx.stroke();
          }
          ctx.restore();
        } else if (viewMode === "wireframe") {
          ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
          ctx.fill();
          ctx.strokeStyle = "#F59E0B";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(245, 158, 11, 0.32)";
          ctx.fill();
          ctx.strokeStyle = "#F59E0B";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Roof Area Badge
        const roofCenter = projectPoint(face.center, width, height);
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.strokeStyle = viewMode === "solar-ready" ? "#10B981" : "#F59E0B";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const badgeW = 110;
        const badgeH = 24;
        ctx.roundRect(roofCenter.x - badgeW / 2, roofCenter.y - badgeH / 2, badgeW, badgeH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Roof: ${stats.areaM2} m²`, roofCenter.x, roofCenter.y);
        ctx.restore();

        // ─── Draw Setback Boundary on 3D Roof Surface (Red) ─────────
        if (setbackM && setbackM > 0) {
          const roofH = stats.heightM + 0.02;
          const setbackPoints2D = local2DPoints.map((p) => {
            const dist = Math.hypot(p.x, p.y) || 1;
            const factor = Math.max(0, (dist - setbackM) / dist);
            return { x: p.x * factor, y: p.y * factor };
          });
          const setbackCorners3D: Point3D[] = setbackPoints2D.map((c) => ({
            x: c.x,
            y: c.y,
            z: roofH,
          }));
          const screenSetback = setbackCorners3D.map((c) => projectPoint(c, width, height));

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(screenSetback[0].x, screenSetback[0].y);
          for (let si = 1; si < screenSetback.length; si++) {
            ctx.lineTo(screenSetback[si].x, screenSetback[si].y);
          }
          ctx.closePath();
          ctx.strokeStyle = "#EF4444";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.stroke();

          // Setback tag
          ctx.fillStyle = "#EF4444";
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          ctx.fillText(`Setback (${setbackM}m)`, screenSetback[0].x + 4, screenSetback[0].y - 4);
          ctx.restore();
        }

        // ─── Draw Placed Solar Panels on the Roof ───────────────────────
        if (panels.length > 0) {
          const roofH = stats.heightM + 0.04;
          panels.forEach((panel) => {
            try {
              const panelW = panel.widthM;
              const panelHt = panel.heightM;
              const rotRad = (panel.rotationDeg * Math.PI) / 180;
              // Convert panel center relative to centroid, subtracting exact centerOffset
              const pc = latLngToLocalMeters(panel.center, centroid);
              const panelLocalX = pc.x - centerOffset.x;
              const panelLocalY = pc.y - centerOffset.y;

              // Panel 4 corners in local space at roof height z = roofH
              const hw = panelW / 2;
              const hh = panelHt / 2;
              const cos = Math.cos(rotRad);
              const sin = Math.sin(rotRad);
              const corners3D: Point3D[] = [
                { x: panelLocalX + (-hw * cos - -hh * sin), y: panelLocalY + (-hw * sin + -hh * cos), z: roofH },
                { x: panelLocalX + (hw * cos - -hh * sin), y: panelLocalY + (hw * sin + -hh * cos), z: roofH },
                { x: panelLocalX + (hw * cos - hh * sin), y: panelLocalY + (hw * sin + hh * cos), z: roofH },
                { x: panelLocalX + (-hw * cos - hh * sin), y: panelLocalY + (-hw * sin + hh * cos), z: roofH },
              ];

              const screenCorners = corners3D.map((c) => projectPoint(c, width, height));

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
              for (let ci = 1; ci < screenCorners.length; ci++) {
                ctx.lineTo(screenCorners[ci].x, screenCorners[ci].y);
              }
              ctx.closePath();

              if (panel.status === "VALID") {
                ctx.fillStyle = "rgba(30, 64, 175, 0.82)";
                ctx.strokeStyle = "#60A5FA";
              } else {
                ctx.fillStyle = "rgba(185, 28, 28, 0.75)";
                ctx.strokeStyle = "#FCA5A5";
              }
              ctx.lineWidth = 1;
              ctx.fill();
              ctx.stroke();

              // Grid line in center of panel
              ctx.strokeStyle = "rgba(147, 197, 253, 0.4)";
              ctx.lineWidth = 0.5;
              const midL = { x: (screenCorners[0].x + screenCorners[3].x) / 2, y: (screenCorners[0].y + screenCorners[3].y) / 2 };
              const midR = { x: (screenCorners[1].x + screenCorners[2].x) / 2, y: (screenCorners[1].y + screenCorners[2].y) / 2 };
              ctx.beginPath();
              ctx.moveTo(midL.x, midL.y);
              ctx.lineTo(midR.x, midR.y);
              ctx.stroke();
              ctx.restore();
            } catch {
              // skip invalid panel
            }
          });

          // Panel count badge
          const roofCenterProj = projectPoint(face.center, width, height);
          ctx.save();
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.strokeStyle = "#60A5FA";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(roofCenterProj.x - 55, roofCenterProj.y - 12, 110, 22, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 10px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${panels.filter(p => p.status === "VALID").length} Solar Panels`, roofCenterProj.x, roofCenterProj.y);
          ctx.restore();
        }
      }
    });

    // 6. Height / Parapet Elevation Marker
    if (showDimensions) {
      const pBase = projectPoint({ x: local2DPoints[0].x, y: local2DPoints[0].y, z: 0 }, width, height);
      const pTop = projectPoint({ x: local2DPoints[0].x, y: local2DPoints[0].y, z: stats.heightM }, width, height);

      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pBase.x - 14, pBase.y);
      ctx.lineTo(pTop.x - 14, pTop.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#38BDF8";
      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`${stats.heightM}m Height`, pTop.x - 18, (pBase.y + pTop.y) / 2);
      ctx.restore();
    }
  }, [
    yaw,
    pitch,
    zoom,
    panOffset,
    geometry3D,
    local2DPoints,
    projectPoint,
    showGrid,
    showDimensions,
    viewMode,
    sunAzimuth,
    stats,
    panels,
    centroid,
    centerOffset,
    setbackM,
  ]);

  // Mouse / Touch Orbit Controls Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.shiftKey) {
      setIsPanning(true);
    } else {
      setIsDragging(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isPanning) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDragging) {
      setYaw((prev) => (prev + dx * 0.6 + 360) % 360);
      setPitch((prev) => Math.max(10, Math.min(88, prev + dy * 0.4)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((prev) => Math.max(0.4, Math.min(3.5, prev * zoomDelta)));
  };

  // Preset Views
  const setTopDownView = () => {
    setYaw(0);
    setPitch(88);
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.25);
  };

  const setSouthIsoView = () => {
    setYaw(35);
    setPitch(40);
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.15);
  };

  const setFacadeElevationView = () => {
    setYaw(0);
    setPitch(14);
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.2);
  };

  const handleResetCamera = () => {
    setSouthIsoView();
  };

  const handleCopySpecs = () => {
    const specs = JSON.stringify(
      {
        projectId,
        buildingName,
        coordinates: centroid,
        usableRoofAreaM2: stats.areaM2,
        dimensions: {
          widthM: stats.widthM,
          lengthM: stats.lengthM,
          heightM: stats.heightM,
          perimeterM: stats.perimeterM,
          levels: stats.levelsCount,
        },
        localFootprintMeters: local2DPoints,
        solarReadiness: "VERIFIED_FOR_LAYOUT",
      },
      null,
      2
    );
    navigator.clipboard.writeText(specs);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="isolated-building-workspace" role="region" aria-label="Isolated 3D Building Workspace">
      {/* 1. Header Toolbar */}
      <header className="isolated-header">
        <div className="isolated-header-left">
          <button
            type="button"
            className="isolated-btn-back"
            onClick={onBackToMap}
            title="Return to satellite map view"
          >
            <ArrowLeft size={16} />
            <span>Return to Map</span>
          </button>

          <div className="isolated-header-title">
            <div className="isolated-title-badge">
              <Sparkles size={13} className="text-accent" />
              <span>Isolated 3D Model Studio</span>
            </div>
            <h1>{buildingName}</h1>
          </div>
        </div>

        <div className="isolated-header-actions">
          {/* View Mode Switcher */}
          <div className="isolated-pill-switcher">
            <button
              type="button"
              className={`pill-btn ${viewMode === "3d-solid" ? "is-active" : ""}`}
              onClick={() => setViewMode("3d-solid")}
              title="Shaded 3D Architectural Model"
            >
              <Box size={14} />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === "solar-ready" ? "is-active" : ""}`}
              onClick={() => setViewMode("solar-ready")}
              title="Solar Panel Installation Surface View"
            >
              <Sun size={14} />
              <span>Solar Roof Ready</span>
            </button>
            <button
              type="button"
              className={`pill-btn ${viewMode === "wireframe" ? "is-active" : ""}`}
              onClick={() => setViewMode("wireframe")}
              title="Structural Wireframe Mode"
            >
              <Layers size={14} />
              <span>Wireframe</span>
            </button>
          </div>

          {onProceedToSolar && (
            <button
              type="button"
              className="isolated-btn-proceed"
              onClick={onProceedToSolar}
              title="Proceed with confirmed roof model to panel layout"
            >
              <CheckCircle2 size={16} />
              <span>Adopt & Place Panels</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main 3D Canvas Canvas Stage */}
      <main className="isolated-stage">
        <canvas
          ref={canvasRef}
          className="isolated-3d-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Floating Top Floating Camera Angle Toolbar */}
        <div className="isolated-camera-toolbar">
          <div className="cam-tool-group">
            <button
              type="button"
              className="cam-btn"
              onClick={setTopDownView}
              title="Top-down roof view (0°)"
            >
              <Eye size={13} />
              <span>Roof Top-Down</span>
            </button>
            <button
              type="button"
              className="cam-btn"
              onClick={setSouthIsoView}
              title="South Isometric 3D (45°)"
            >
              <Box size={13} />
              <span>South Iso</span>
            </button>
            <button
              type="button"
              className="cam-btn"
              onClick={setFacadeElevationView}
              title="Front Facade Elevation"
            >
              <Maximize2 size={13} />
              <span>Facade</span>
            </button>
          </div>

          <div className="cam-divider" />

          <div className="cam-tool-group">
            <button
              type="button"
              className="cam-btn-icon"
              onClick={() => setZoom((z) => Math.min(3.5, z * 1.15))}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="cam-btn-icon"
              onClick={() => setZoom((z) => Math.max(0.4, z * 0.85))}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="cam-btn-icon"
              onClick={() => setYaw((y) => (y - 45 + 360) % 360)}
              title="Rotate Left 45°"
            >
              <RotateCw size={14} style={{ transform: "scaleX(-1)" }} />
            </button>
            <button
              type="button"
              className="cam-btn-icon"
              onClick={() => setYaw((y) => (y + 45) % 360)}
              title="Rotate Right 45°"
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              className="cam-btn-icon"
              onClick={handleResetCamera}
              title="Reset Camera View"
            >
              <Compass size={14} />
            </button>
          </div>

          <div className="cam-divider" />

          {/* Toggle Dimensions and Grid */}
          <div className="cam-tool-group">
            <button
              type="button"
              className={`cam-btn ${showDimensions ? "is-active" : ""}`}
              onClick={() => setShowDimensions(!showDimensions)}
              title="Toggle dimension markings"
            >
              <span>{showDimensions ? "Dims On" : "Dims Off"}</span>
            </button>
            <button
              type="button"
              className={`cam-btn ${showGrid ? "is-active" : ""}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle meter floor grid"
            >
              <Grid size={13} />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Floating Building Telemetry Specs Panel (Right) */}
        <aside className="isolated-specs-panel" aria-label="Building Specifications">
          <div className="specs-card-header">
            <div className="specs-card-title">
              <Shield size={15} className="text-accent" />
              <strong>Property Geometry</strong>
            </div>
            <span className="specs-status-pill">Isolated</span>
          </div>

          <div className="specs-stats-grid">
            <div className="specs-stat-box highlight">
              <span className="stat-label">Usable Roof Surface</span>
              <span className="stat-value text-accent">{stats.areaM2} m²</span>
              <span className="stat-sub">Ready for solar layout</span>
            </div>

            <div className="specs-stat-box">
              <span className="stat-label">Footprint Dimensions</span>
              <span className="stat-value">{stats.widthM}m × {stats.lengthM}m</span>
              <span className="stat-sub">Width × Length</span>
            </div>

            <div className="specs-stat-box">
              <span className="stat-label">Structure Height</span>
              <span className="stat-value">{stats.heightM}m</span>
              <span className="stat-sub">{stats.levelsCount} Floors / Elevation</span>
            </div>

            <div className="specs-stat-box">
              <span className="stat-label">Roof Perimeter</span>
              <span className="stat-value">{stats.perimeterM}m</span>
              <span className="stat-sub">{effectivePoints.length} Boundary Vertices</span>
            </div>
          </div>

          {/* Solar Orientation / Sun Slider */}
          <div className="specs-sun-control">
            <div className="sun-control-header">
              <Sun size={14} className="text-warning" />
              <span>Sun Azimuth Angle: {sunAzimuth}°</span>
            </div>
            <input
              type="range"
              min="90"
              max="270"
              step="5"
              value={sunAzimuth}
              onChange={(e) => setSunAzimuth(Number(e.target.value))}
              className="sun-slider"
              title="Adjust sun angle to inspect shading"
            />
            <div className="sun-ticks">
              <span>East (90°)</span>
              <span>South (180°)</span>
              <span>West (270°)</span>
            </div>
          </div>

          {/* Quick Info Disclaimer */}
          <div className="specs-note">
            <Info size={13} />
            <span>
              Isolated from surrounding satellite map. Roof boundaries and scale preserved for downstream solar panel placement.
            </span>
          </div>

          {/* Copy Model Specs Button */}
          <button
            type="button"
            className="specs-copy-btn"
            onClick={handleCopySpecs}
            title="Copy metric building geometry specifications"
          >
            <Download size={13} />
            <span>{isCopied ? "Copied to Clipboard!" : "Copy Model Geometry JSON"}</span>
          </button>
        </aside>

        {/* Orbit Drag Helper Overlay */}
        <div className="isolated-drag-hint">
          <span>Click & Drag to Rotate 360° • Scroll to Zoom • Right-Click to Pan</span>
        </div>
      </main>
    </div>
  );
}
