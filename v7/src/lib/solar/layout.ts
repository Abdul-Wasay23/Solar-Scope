/**
 * SolarScope — Module 4: Solar Panel Layout Generator
 *
 * Generates an optimized, boundary-constrained grid of solar panels:
 * - Multi-phase offset search for maximum roof utilization (multi-row packing)
 * - Custom panel dimensions (portrait vs landscape)
 * - Row spacing, column spacing, and boundary setback clearance
 * - Azimuth array orientation (aligned with South or custom azimuth)
 * - Automated avoidance of designated restricted zones (keepouts)
 * - Real-time metrics: panel counts, DC capacity (kWp), rooftop coverage
 */

import type {
  LatLngPoint,
  PanelLayoutConfig,
  PlacedPanel,
  RestrictedZone,
  SolarPanelLayout,
} from "@/lib/solar/types";
import {
  getPolygonCentroid,
  getRotatedRectangleCorners,
  isPointInLocalPolygon,
  latLngToLocalMeters,
  localMetersToLatLng,
  minDistanceToPolygonEdges,
  Point2D,
} from "@/lib/geo/geometry";
import { validatePanels } from "./validation";

const DEG_TO_RAD = Math.PI / 180;

/**
 * Rotates a 2D point around the origin (0,0) by angle in radians.
 */
function rotatePoint(p: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

/**
 * Generates an optimized solar panel array layout fitting within the site boundary.
 */
export function generatePanelLayout(
  siteBoundary: LatLngPoint[],
  restrictedZones: RestrictedZone[],
  config: PanelLayoutConfig
): SolarPanelLayout {
  const now = new Date().toISOString();

  if (!siteBoundary || siteBoundary.length < 3) {
    const emptyValidation = validatePanels([], siteBoundary, restrictedZones);
    return {
      config,
      panels: [],
      summary: emptyValidation.summary,
      generatedAt: now,
      updatedAt: now,
    };
  }

  // 1. Effective panel dimensions based on orientation
  const isLandscape = config.orientation === "LANDSCAPE";
  const panelWidth = isLandscape
    ? config.panelSpec.heightM
    : config.panelSpec.widthM;
  const panelHeight = isLandscape
    ? config.panelSpec.widthM
    : config.panelSpec.heightM;

  const rowStep = panelHeight + config.rowSpacingM;
  const colStep = panelWidth + config.colSpacingM;

  // 2. Project boundary and zones into metric space relative to centroid
  const origin = getPolygonCentroid(siteBoundary);
  const boundaryLocal: Point2D[] = siteBoundary.map((p) =>
    latLngToLocalMeters(p, origin)
  );

  const zonesLocal = (restrictedZones || [])
    .filter((z) => z.points && z.points.length >= 3)
    .map((z) => ({
      id: z.id,
      points: z.points.map((p) => latLngToLocalMeters(p, origin)),
    }));

  // 3. Grid alignment: rotate boundary by -azimuth so grid axes align with (u, v)
  const azimuthRad = config.azimuthDeg * DEG_TO_RAD;
  const boundaryGridAligned = boundaryLocal.map((p) =>
    rotatePoint(p, -azimuthRad)
  );

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const p of boundaryGridAligned) {
    if (p.x < minU) minU = p.x;
    if (p.x > maxU) maxU = p.x;
    if (p.y < minV) minV = p.y;
    if (p.y > maxV) maxV = p.y;
  }

  const setback = Math.max(0, config.setbackM);

  // Helper to test if a candidate panel center fits completely within boundary with setback and zones
  const isCandidateValid = (candidateCenterLocal: Point2D): boolean => {
    const corners = getRotatedRectangleCorners(
      candidateCenterLocal,
      panelWidth,
      panelHeight,
      config.azimuthDeg
    );

    const testPoints: Point2D[] = [
      ...corners,
      { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
      { x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
      { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
      { x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 },
      candidateCenterLocal,
    ];

    // Must be inside roof boundary
    for (const pt of testPoints) {
      if (!isPointInLocalPolygon(pt, boundaryLocal)) {
        return false;
      }
    }

    // Setback buffer distance check from boundary edges
    if (setback > 0.01) {
      const minAllowedDist = setback - 0.02; // Small tolerance so exact margin fits
      for (const pt of testPoints) {
        if (minDistanceToPolygonEdges(pt, boundaryLocal) < minAllowedDist) {
          return false;
        }
      }
    }

    // Collision with restricted zones / keepouts
    for (const zone of zonesLocal) {
      for (const corner of corners) {
        if (isPointInLocalPolygon(corner, zone.points)) {
          return false;
        }
      }
      if (isPointInLocalPolygon(candidateCenterLocal, zone.points)) {
        return false;
      }
    }

    return true;
  };

  // 4. Multi-Phase Grid Search:
  // Instead of testing a single rigid grid offset that easily drops entire rows on slanted roofs,
  // we evaluate phase offsets (uShift, vShift) across the row & column steps,
  // and choose the layout that places the MAXIMUM number of panels.
  const uPhases = [0, colStep * 0.25, colStep * 0.5, colStep * 0.75];
  const vPhases = [0, rowStep * 0.2, rowStep * 0.4, rowStep * 0.6, rowStep * 0.8];

  let bestPanels: PlacedPanel[] = [];

  for (const vShift of vPhases) {
    for (const uShift of uPhases) {
      const candidateList: PlacedPanel[] = [];
      let idx = 1;

      const baseStartU = minU + setback + panelWidth / 2 + uShift;
      const baseEndU = maxU - setback - panelWidth / 2 + colStep;
      const baseStartV = minV + setback + panelHeight / 2 + vShift;
      const baseEndV = maxV - setback - panelHeight / 2 + rowStep;

      for (let v = baseStartV; v <= baseEndV; v += rowStep) {
        for (let u = baseStartU; u <= baseEndU; u += colStep) {
          const candidateCenterGrid: Point2D = { x: u, y: v };
          const candidateCenterLocal = rotatePoint(candidateCenterGrid, azimuthRad);

          if (!isCandidateValid(candidateCenterLocal)) {
            continue;
          }

          const centerGeo = localMetersToLatLng(candidateCenterLocal, origin);
          candidateList.push({
            id: `panel-${idx++}`,
            center: centerGeo,
            widthM: panelWidth,
            heightM: panelHeight,
            rotationDeg: config.azimuthDeg,
            wattageW: config.panelSpec.wattageW,
            status: "VALID",
          });
        }
      }

      if (candidateList.length > bestPanels.length) {
        bestPanels = candidateList;
      }
    }
  }

  // 5. If target capacity cap (kWp) is specified, cap placed panels centered around roof centroid
  let panelsToPlace = bestPanels;
  if (config.maxCapacityKw && config.maxCapacityKw > 0) {
    const maxAllowedPanels = Math.floor(
      (config.maxCapacityKw * 1000) / config.panelSpec.wattageW
    );
    if (maxAllowedPanels > 0 && panelsToPlace.length > maxAllowedPanels) {
      panelsToPlace = [...panelsToPlace]
        .sort((a, b) => {
          const distA = Math.hypot(a.center.lat - origin.lat, a.center.lng - origin.lng);
          const distB = Math.hypot(b.center.lat - origin.lat, b.center.lng - origin.lng);
          return distA - distB;
        })
        .slice(0, maxAllowedPanels)
        .map((p, idx) => ({ ...p, id: `panel-${idx + 1}` }));
    }
  }

  // 6. Run full validation
  const { validatedPanels, summary } = validatePanels(
    panelsToPlace,
    siteBoundary,
    restrictedZones
  );

  return {
    config,
    panels: validatedPanels,
    summary,
    generatedAt: now,
    updatedAt: now,
  };
}
