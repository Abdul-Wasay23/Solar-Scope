/**
 * SolarScope — Module 4: Solar Panel Validation & Overlap Detection Engine
 *
 * Checks:
 * 1. Panel-to-panel collision / overlaps using Separating Axis Theorem (SAT)
 * 2. Panel perimeter containment within site boundary
 * 3. Panel collision with designated restricted zones
 * 4. Overall finalization eligibility and blocking error analysis
 */

import type {
  LatLngPoint,
  LayoutSummary,
  LayoutValidationResult,
  PlacedPanel,
  RestrictedZone,
} from "@/lib/solar/types";
import {
  calculatePolygonAreaM2,
  doRotatedBoxesOverlap,
  getPolygonCentroid,
  getRotatedRectangleCorners,
  isPointInLocalPolygon,
  latLngToLocalMeters,
  minDistanceToPolygonEdges,
  Point2D,
} from "@/lib/geo/geometry";

/**
 * Validates a list of placed panels against boundary and restricted zones.
 */
export function validatePanels(
  panels: PlacedPanel[],
  siteBoundary: LatLngPoint[],
  restrictedZones: RestrictedZone[],
  setbackM: number = 0
): {
  validatedPanels: PlacedPanel[];
  validationResult: LayoutValidationResult;
  summary: LayoutSummary;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const overlappingPanelIds = new Set<string>();
  const outOfBoundsPanelIds = new Set<string>();
  const restrictedCollisionPanelIds = new Set<string>();

  // If no boundary, all panels are out of bounds
  const hasValidBoundary = siteBoundary && siteBoundary.length >= 3;
  if (!hasValidBoundary) {
    errors.push("Site boundary must have at least 3 points to validate panels.");
  }

  const origin = hasValidBoundary
    ? getPolygonCentroid(siteBoundary)
    : panels.length > 0
    ? panels[0].center
    : { lat: 0, lng: 0 };

  const boundaryLocal: Point2D[] = hasValidBoundary
    ? siteBoundary.map((p) => latLngToLocalMeters(p, origin))
    : [];

  const zonesLocal = restrictedZones
    .filter((z) => z.points.length >= 3)
    .map((z) => ({
      id: z.id,
      name: z.name,
      points: z.points.map((p) => latLngToLocalMeters(p, origin)),
    }));

  // Precompute 4 corners for each panel in local metric coordinates
  const panelCornersList: { id: string; corners: Point2D[] }[] = panels.map((panel) => {
    const centerLocal = latLngToLocalMeters(panel.center, origin);
    const corners = getRotatedRectangleCorners(
      centerLocal,
      panel.widthM,
      panel.heightM,
      panel.rotationDeg
    );
    return { id: panel.id, corners };
  });

  // 1. Check each panel against Boundary, Setback Buffer, and Restricted Zones
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const { corners } = panelCornersList[i];

    // Boundary check: all 4 corners must be inside boundary
    let isFullyInsideBoundary = hasValidBoundary;
    if (hasValidBoundary) {
      for (const corner of corners) {
        if (!isPointInLocalPolygon(corner, boundaryLocal)) {
          isFullyInsideBoundary = false;
          break;
        }
        // Strict setback clearance check
        if (setbackM > 0 && minDistanceToPolygonEdges(corner, boundaryLocal) < setbackM - 0.001) {
          isFullyInsideBoundary = false;
          break;
        }
      }
    }

    if (!isFullyInsideBoundary) {
      outOfBoundsPanelIds.add(panel.id);
    }

    // Restricted zone collision check: check if any corner is inside any restricted zone
    let collidesWithRestricted = false;
    for (const zone of zonesLocal) {
      for (const corner of corners) {
        if (isPointInLocalPolygon(corner, zone.points)) {
          collidesWithRestricted = true;
          break;
        }
      }
      if (collidesWithRestricted) break;
    }

    if (collidesWithRestricted) {
      restrictedCollisionPanelIds.add(panel.id);
    }
  }

  // 2. Pairwise panel-to-panel collision detection using SAT
  const n = panels.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pA = panelCornersList[i];
      const pB = panelCornersList[j];

      if (doRotatedBoxesOverlap(pA.corners, pB.corners)) {
        overlappingPanelIds.add(pA.id);
        overlappingPanelIds.add(pB.id);
      }
    }
  }

  // 3. Assign statuses and specific issue messages to each panel
  const validatedPanels: PlacedPanel[] = panels.map((panel) => {
    const issues: string[] = [];
    const isOverlapping = overlappingPanelIds.has(panel.id);
    const isOutOfBounds = outOfBoundsPanelIds.has(panel.id);
    const isRestrictedCollision = restrictedCollisionPanelIds.has(panel.id);

    if (isOverlapping) issues.push("Overlaps with adjacent solar panel");
    if (isOutOfBounds) issues.push("Positioned outside permitted roof boundary");
    if (isRestrictedCollision) issues.push("Intersects with a restricted roof zone");

    let status: PlacedPanel["status"] = "VALID";
    if (isOverlapping) {
      status = "OVERLAPPING";
    } else if (isRestrictedCollision) {
      status = "RESTRICTED_COLLISION";
    } else if (isOutOfBounds) {
      status = "OUTSIDE_BOUNDARY";
    }

    return {
      ...panel,
      status,
      validationIssues: issues.length > 0 ? issues : undefined,
    };
  });

  // 4. Compile layout-wide summary
  const totalPanels = validatedPanels.length;
  const validPanels = validatedPanels.filter((p) => p.status === "VALID").length;
  const invalidPanels = totalPanels - validPanels;

  // Calculate DC capacity: sum wattage of valid panels (or total panels with warning)
  const totalWattage = validatedPanels.reduce((sum, p) => sum + p.wattageW, 0);
  const installedCapacityKw = Math.round((totalWattage / 1000) * 100) / 100;

  const siteAreaM2 = hasValidBoundary
    ? Math.round(calculatePolygonAreaM2(siteBoundary) * 10) / 10
    : 0;

  const restrictedAreaM2 = Math.round(
    restrictedZones.reduce((sum, z) => sum + calculatePolygonAreaM2(z.points), 0) * 10
  ) / 10;

  const usableAreaM2 = Math.max(0, Math.round((siteAreaM2 - restrictedAreaM2) * 10) / 10);

  // Approximate surface area covered by panels
  const panelCoverageM2 = Math.round(
    validatedPanels.reduce((sum, p) => sum + p.widthM * p.heightM, 0) * 10
  ) / 10;

  // Build errors & warnings list
  if (overlappingPanelIds.size > 0) {
    errors.push(
      `${overlappingPanelIds.size} solar panel(s) are overlapping each other.`
    );
  }
  if (outOfBoundsPanelIds.size > 0) {
    errors.push(
      `${outOfBoundsPanelIds.size} solar panel(s) extend outside the roof boundary.`
    );
  }
  if (restrictedCollisionPanelIds.size > 0) {
    errors.push(
      `${restrictedCollisionPanelIds.size} solar panel(s) collide with designated restricted zones.`
    );
  }

  if (totalPanels === 0) {
    warnings.push("No solar panels have been generated or placed on the site.");
  }

  const hasBlockingErrors = errors.length > 0;
  const isValid = !hasBlockingErrors && totalPanels > 0;

  const summary: LayoutSummary = {
    totalPanels,
    validPanels,
    invalidPanels,
    installedCapacityKw,
    siteAreaM2,
    restrictedAreaM2,
    usableAreaM2,
    panelCoverageM2,
  };

  const validationResult: LayoutValidationResult = {
    isValid,
    hasBlockingErrors,
    errors,
    warnings,
    overlappingPanelIds: Array.from(overlappingPanelIds),
    outOfBoundsPanelIds: Array.from(outOfBoundsPanelIds),
    restrictedCollisionPanelIds: Array.from(restrictedCollisionPanelIds),
  };

  return {
    validatedPanels,
    validationResult,
    summary,
  };
}
