/**
 * SolarScope — Module 4: Spatial & Geodesic Geometry Engine
 *
 * Implements high-precision spatial math for rooftop solar planning:
 * - WGS84 geodesic equirectangular projections (cm-level accuracy for rooftops)
 * - Polygon area calculation (m²)
 * - Point-in-polygon ray casting
 * - Polygon self-intersection validation
 * - Polygon containment & collision detection
 * - Separating Axis Theorem (SAT) for rotated solar panel collision
 */

import type { LatLngPoint, PlacedPanel, RestrictedZone } from "@/lib/solar/types";

const EARTH_RADIUS_METERS = 6378137; // WGS84 Equatorial Radius
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Converts a geographic coordinate (lat, lng) to local Cartesian (x, y) meters
 * relative to an origin point using equirectangular projection.
 */
export function latLngToLocalMeters(point: LatLngPoint, origin: LatLngPoint): Point2D {
  const latRad = origin.lat * DEG_TO_RAD;
  const x = (point.lng - origin.lng) * DEG_TO_RAD * EARTH_RADIUS_METERS * Math.cos(latRad);
  const y = (point.lat - origin.lat) * DEG_TO_RAD * EARTH_RADIUS_METERS;
  return { x, y };
}

/**
 * Converts local Cartesian (x, y) meters back to geographic coordinate (lat, lng).
 */
export function localMetersToLatLng(point: Point2D, origin: LatLngPoint): LatLngPoint {
  const latRad = origin.lat * DEG_TO_RAD;
  const dLng = point.x / (EARTH_RADIUS_METERS * Math.cos(latRad) * DEG_TO_RAD);
  const dLat = point.y / (EARTH_RADIUS_METERS * DEG_TO_RAD);
  return {
    lat: origin.lat + dLat,
    lng: origin.lng + dLng,
  };
}

/**
 * Computes the geometric centroid of a list of geographic points.
 */
export function getPolygonCentroid(points: LatLngPoint[]): LatLngPoint {
  if (points.length === 0) return { lat: 0, lng: 0 };
  let sumLat = 0;
  let sumLng = 0;
  for (const p of points) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}

/**
 * Calculates preliminary polygon area in square meters (m²) using Shoelace formula
 * on local projected metric coordinates.
 */
export function calculatePolygonAreaM2(points: LatLngPoint[]): number {
  if (!points || points.length < 3) return 0;

  const origin = points[0];
  const localPoints: Point2D[] = points.map((p) => latLngToLocalMeters(p, origin));

  let area = 0;
  const n = localPoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += localPoints[i].x * localPoints[j].y;
    area -= localPoints[j].x * localPoints[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Tests if a point is inside a polygon using the Ray-Casting algorithm.
 */
export function isPointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Tests if a 2D metric point is inside a 2D metric polygon.
 */
export function isPointInLocalPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if two line segments (a1-a2) and (b1-b2) strictly intersect.
 */
function ccw(p1: Point2D, p2: Point2D, p3: Point2D): number {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

export function doLineSegmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): boolean {
  const d1 = ccw(p3, p4, p1);
  const d2 = ccw(p3, p4, p2);
  const d3 = ccw(p1, p2, p3);
  const d4 = ccw(p1, p2, p4);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  return false;
}

/**
 * Validates whether a polygon is simple (does not self-intersect).
 */
export function isSimplePolygon(points: LatLngPoint[]): boolean {
  if (points.length < 3) return false;
  const origin = points[0];
  const local: Point2D[] = points.map((p) => latLngToLocalMeters(p, origin));

  const n = local.length;
  for (let i = 0; i < n; i++) {
    const p1 = local[i];
    const p2 = local[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Adjacent segments or closing wrap-around segments share a vertex; skip
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;

      const p3 = local[j];
      const p4 = local[(j + 1) % n];

      if (doLineSegmentsIntersect(p1, p2, p3, p4)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Tests if an inner polygon is completely contained inside an outer polygon.
 */
export function isPolygonInsidePolygon(
  inner: LatLngPoint[],
  outer: LatLngPoint[]
): boolean {
  if (inner.length < 3 || outer.length < 3) return false;

  // 1. All vertices of inner must be inside outer
  for (const vertex of inner) {
    if (!isPointInPolygon(vertex, outer)) {
      return false;
    }
  }

  // 2. No edges of inner can intersect edges of outer
  const origin = outer[0];
  const outerLocal = outer.map((p) => latLngToLocalMeters(p, origin));
  const innerLocal = inner.map((p) => latLngToLocalMeters(p, origin));

  const nOuter = outerLocal.length;
  const nInner = innerLocal.length;

  for (let i = 0; i < nOuter; i++) {
    const o1 = outerLocal[i];
    const o2 = outerLocal[(i + 1) % nOuter];

    for (let j = 0; j < nInner; j++) {
      const i1 = innerLocal[j];
      const i2 = innerLocal[(j + 1) % nInner];

      if (doLineSegmentsIntersect(o1, o2, i1, i2)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Tests if two polygons intersect or overlap at any point.
 */
export function doPolygonsIntersect(polyA: LatLngPoint[], polyB: LatLngPoint[]): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  // 1. Check if any vertex of A is in B
  for (const p of polyA) {
    if (isPointInPolygon(p, polyB)) return true;
  }

  // 2. Check if any vertex of B is in A
  for (const p of polyB) {
    if (isPointInPolygon(p, polyA)) return true;
  }

  // 3. Check for edge intersections
  const origin = polyA[0];
  const aLocal = polyA.map((p) => latLngToLocalMeters(p, origin));
  const bLocal = polyB.map((p) => latLngToLocalMeters(p, origin));

  const nA = aLocal.length;
  const nB = bLocal.length;

  for (let i = 0; i < nA; i++) {
    const a1 = aLocal[i];
    const a2 = aLocal[(i + 1) % nA];

    for (let j = 0; j < nB; j++) {
      const b1 = bLocal[j];
      const b2 = bLocal[(j + 1) % nB];

      if (doLineSegmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Computes 4 corner points of a rotated rectangle in local meters.
 */
export function getRotatedRectangleCorners(
  center: Point2D,
  width: number,
  height: number,
  rotationDeg: number
): Point2D[] {
  const rad = rotationDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const halfW = width / 2;
  const halfH = height / 2;

  // 4 corners relative to (0,0) before rotation
  const offsets = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  return offsets.map((o) => ({
    x: center.x + (o.x * cos - o.y * sin),
    y: center.y + (o.x * sin + o.y * cos),
  }));
}

/**
 * Separating Axis Theorem (SAT) collision detection between two rotated rectangles.
 */
export function doRotatedBoxesOverlap(cornersA: Point2D[], cornersB: Point2D[]): boolean {
  const polygons = [cornersA, cornersB];

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let i1 = 0; i1 < polygon.length; i1++) {
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];

      // Perpendicular normal axis
      const normal = {
        x: -(p2.y - p1.y),
        y: p2.x - p1.x,
      };

      // Project polygon A onto axis
      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of cornersA) {
        const projected = normal.x * p.x + normal.y * p.y;
        if (projected < minA) minA = projected;
        if (projected > maxA) maxA = projected;
      }

      // Project polygon B onto axis
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of cornersB) {
        const projected = normal.x * p.x + normal.y * p.y;
        if (projected < minB) minB = projected;
        if (projected > maxB) maxB = projected;
      }

      // If projections do not overlap, axis of separation found
      if (maxA < minB || maxB < minA) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Returns the 4 corner geographic coordinates of a placed solar panel.
 */
export function getPanelBoundingPoints(
  panel: PlacedPanel,
  origin?: LatLngPoint
): LatLngPoint[] {
  const orig = origin || panel.center;
  const centerLocal = latLngToLocalMeters(panel.center, orig);
  const cornersLocal = getRotatedRectangleCorners(
    centerLocal,
    panel.widthM,
    panel.heightM,
    panel.rotationDeg
  );
  return cornersLocal.map((c) => localMetersToLatLng(c, orig));
}

/**
 * Computes preliminary area calculations and boundary validation warnings for Step 5.
 */
export function calculateUsableArea(
  siteBoundary: LatLngPoint[],
  restrictedZones: RestrictedZone[]
): {
  siteAreaM2: number;
  restrictedAreaM2: number;
  usableAreaM2: number;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!siteBoundary || siteBoundary.length < 3) {
    return {
      siteAreaM2: 0,
      restrictedAreaM2: 0,
      usableAreaM2: 0,
      warnings: ["Site boundary is missing or has fewer than 3 vertices."],
    };
  }

  if (!isSimplePolygon(siteBoundary)) {
    warnings.push(
      "Site boundary has self-intersecting edges. Please redraw the perimeter polygon."
    );
  }

  const siteAreaM2 = Math.round(calculatePolygonAreaM2(siteBoundary) * 10) / 10;
  let totalRestrictedAreaM2 = 0;

  // Validate each restricted zone
  for (let i = 0; i < restrictedZones.length; i++) {
    const zone = restrictedZones[i];
    if (zone.points.length < 3) continue;

    const zoneArea = Math.round(calculatePolygonAreaM2(zone.points) * 10) / 10;
    totalRestrictedAreaM2 += zoneArea;

    // Check if zone is inside site boundary
    if (!isPolygonInsidePolygon(zone.points, siteBoundary)) {
      warnings.push(
        `Restricted zone "${zone.name}" extends beyond the site boundary perimeter.`
      );
    }

    // Check for overlap with other restricted zones
    for (let j = i + 1; j < restrictedZones.length; j++) {
      const otherZone = restrictedZones[j];
      if (otherZone.points.length < 3) continue;

      if (doPolygonsIntersect(zone.points, otherZone.points)) {
        warnings.push(
          `Restricted zone "${zone.name}" overlaps with "${otherZone.name}". Simple area subtraction may overestimate usable surface.`
        );
      }
    }
  }

  const restrictedAreaM2 = Math.round(totalRestrictedAreaM2 * 10) / 10;
  const usableAreaM2 = Math.max(0, Math.round((siteAreaM2 - restrictedAreaM2) * 10) / 10);

  return {
    siteAreaM2,
    restrictedAreaM2,
    usableAreaM2,
    warnings,
  };
}

/**
 * Calculates the perpendicular distance from point p to line segment (a -> b).
 */
export function distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Returns the shortest distance from a local 2D point to any edge of a polygon.
 */
export function minDistanceToPolygonEdges(p: Point2D, polygon: Point2D[]): number {
  let minDist = Infinity;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const d = distancePointToSegment(p, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

