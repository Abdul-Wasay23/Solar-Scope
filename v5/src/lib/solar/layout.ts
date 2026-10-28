/**
 * SolarScope — Module 4: Solar Panel Layout Generator
 *
 * Generates an optimized, boundary-constrained grid of solar panels:
 * - Supports custom panel dimensions (portrait vs landscape)
 * - Row spacing, column spacing, and boundary setback clearance
 * - Azimuth array orientation (aligned with South or custom azimuth)
 * - Automated avoidance of designated restricted zones
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
 * Generates a preliminary solar panel array layout fitting within the site boundary.
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

  // 1. Determine effective panel dimensions based on orientation
  const isLandscape = config.orientation === "LANDSCAPE";
  const panelWidth = isLandscape
    ? config.panelSpec.heightM
    : config.panelSpec.widthM;
  const panelHeight = isLandscape
    ? config.panelSpec.widthM
    : config.panelSpec.heightM;

  const rowStep = panelHeight + config.rowSpacingM;
  const colStep = panelWidth + config.colSpacingM;

  // 2. Project site boundary and zones into local metric space
  const origin = getPolygonCentroid(siteBoundary);
  const boundaryLocal: Point2D[] = siteBoundary.map((p) =>
    latLngToLocalMeters(p, origin)
  );

  const zonesLocal = restrictedZones
    .filter((z) => z.points.length >= 3)
    .map((z) => ({
      id: z.id,
      points: z.points.map((p) => latLngToLocalMeters(p, origin)),
    }));

  // 3. Grid alignment: rotate boundary by -azimuth so grid axes align with (u, v)
  const azimuthRad = config.azimuthDeg * DEG_TO_RAD;
  const boundaryGridAligned = boundaryLocal.map((p) =>
    rotatePoint(p, -azimuthRad)
  );

  // Find bounding box in grid-aligned space
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

  // 4. Iterate along grid coordinates (u, v) to test candidate panels
  const candidatePanels: PlacedPanel[] = [];
  let panelIndex = 1;

  // Apply boundary setback
  const setback = Math.max(0, config.setbackM);
  const startU = minU + setback + panelWidth / 2;
  const endU = maxU - setback - panelWidth / 2;
  const startV = minV + setback + panelHeight / 2;
  const endV = maxV - setback - panelHeight / 2;

  for (let v = startV; v <= endV; v += rowStep) {
    for (let u = startU; u <= endU; u += colStep) {
      // Candidate center in grid-aligned space
      const candidateCenterGrid: Point2D = { x: u, y: v };
      // Rotate back to local metric space
      const candidateCenterLocal = rotatePoint(candidateCenterGrid, azimuthRad);

      // Compute 4 corners in local metric space
      const corners = getRotatedRectangleCorners(
        candidateCenterLocal,
        panelWidth,
        panelHeight,
        config.azimuthDeg
      );

      // Test points: 4 corners + 4 edge midpoints + center to ensure 100% containment
      const testPoints: Point2D[] = [
        ...corners,
        { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
        { x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
        { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
        { x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 },
        candidateCenterLocal,
      ];

      // Boundary containment: all points must be inside boundary
      let isInsideBoundary = true;
      for (const pt of testPoints) {
        if (!isPointInLocalPolygon(pt, boundaryLocal)) {
          isInsideBoundary = false;
          break;
        }
      }
      if (!isInsideBoundary) continue;

      // Strict setback check: every test point must be at least setback meters away from boundary edges (zero tolerance)
      if (setback > 0) {
        let touchesSetback = false;
        // Require at least setback meters clearance (plus tiny 0.005m epsilon so not even 0.0001px touches)
        const minClearance = setback + 0.005;
        for (const pt of testPoints) {
          if (minDistanceToPolygonEdges(pt, boundaryLocal) < minClearance) {
            touchesSetback = true;
            break;
          }
        }
        if (touchesSetback) continue;
      }

      // Restricted zone collision check: exclude if any corner touches restricted zone
      let collidesWithZone = false;
      for (const zone of zonesLocal) {
        for (const corner of corners) {
          if (isPointInLocalPolygon(corner, zone.points)) {
            collidesWithZone = true;
            break;
          }
        }
        if (collidesWithZone) break;
      }

      if (collidesWithZone) continue;

      // Convert center to geographic coordinates
      const centerGeo = localMetersToLatLng(candidateCenterLocal, origin);

      candidatePanels.push({
        id: `panel-${panelIndex++}`,
        center: centerGeo,
        widthM: panelWidth,
        heightM: panelHeight,
        rotationDeg: config.azimuthDeg,
        wattageW: config.panelSpec.wattageW,
        status: "VALID",
      });
    }
  }

  // 5. If target / max capacity (kWp) is specified, cap candidate panels
  let panelsToPlace = candidatePanels;
  if (config.maxCapacityKw && config.maxCapacityKw > 0) {
    const maxAllowedPanels = Math.floor(
      (config.maxCapacityKw * 1000) / config.panelSpec.wattageW
    );
    if (maxAllowedPanels > 0 && panelsToPlace.length > maxAllowedPanels) {
      // Cluster panels towards the center of the rooftop for optimal aesthetics and structural layout
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

  // 6. Run full validation suite on generated candidates
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
