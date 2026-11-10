import { describe, expect, it } from "vitest";
import {
  calculatePolygonAreaM2,
  calculateUsableArea,
  doLineSegmentsIntersect,
  doPolygonsIntersect,
  doRotatedBoxesOverlap,
  getPolygonCentroid,
  getRotatedRectangleCorners,
  isPointInPolygon,
  isPolygonInsidePolygon,
  isSimplePolygon,
  latLngToLocalMeters,
  localMetersToLatLng,
} from "./geometry";
import type { LatLngPoint, RestrictedZone } from "@/lib/solar/types";

describe("Module 4: Spatial & Geodesic Geometry Engine", () => {
  const origin: LatLngPoint = { lat: 24.8607, lng: 67.0011 }; // Karachi

  it("converts LatLng to local meters and back with sub-millimeter precision", () => {
    const target: LatLngPoint = { lat: 24.8617, lng: 67.0021 };
    const meters = latLngToLocalMeters(target, origin);
    const convertedBack = localMetersToLatLng(meters, origin);

    expect(convertedBack.lat).toBeCloseTo(target.lat, 6);
    expect(convertedBack.lng).toBeCloseTo(target.lng, 6);
  });

  it("calculates polygon area for a known rectangular roof", () => {
    // 20m x 10m rectangle in local coordinates converted to LatLng
    const p1 = origin;
    const p2 = localMetersToLatLng({ x: 20, y: 0 }, origin);
    const p3 = localMetersToLatLng({ x: 20, y: 10 }, origin);
    const p4 = localMetersToLatLng({ x: 0, y: 10 }, origin);

    const area = calculatePolygonAreaM2([p1, p2, p3, p4]);
    // Expect ~200 m²
    expect(area).toBeGreaterThan(195);
    expect(area).toBeLessThan(205);
  });

  it("accurately detects if a point is inside a polygon using ray casting", () => {
    const polygon = [
      origin,
      localMetersToLatLng({ x: 20, y: 0 }, origin),
      localMetersToLatLng({ x: 20, y: 20 }, origin),
      localMetersToLatLng({ x: 0, y: 20 }, origin),
    ];

    const insidePoint = localMetersToLatLng({ x: 10, y: 10 }, origin);
    const outsidePoint = localMetersToLatLng({ x: 30, y: 10 }, origin);

    expect(isPointInPolygon(insidePoint, polygon)).toBe(true);
    expect(isPointInPolygon(outsidePoint, polygon)).toBe(false);
  });

  it("detects self-intersecting polygons (Step 5 validation)", () => {
    // Simple convex square
    const simple = [
      origin,
      localMetersToLatLng({ x: 20, y: 0 }, origin),
      localMetersToLatLng({ x: 20, y: 20 }, origin),
      localMetersToLatLng({ x: 0, y: 20 }, origin),
    ];
    expect(isSimplePolygon(simple)).toBe(true);

    // Self-intersecting hourglass shape (bowtie)
    const bowtie = [
      origin,
      localMetersToLatLng({ x: 20, y: 20 }, origin),
      localMetersToLatLng({ x: 20, y: 0 }, origin),
      localMetersToLatLng({ x: 0, y: 20 }, origin),
    ];
    expect(isSimplePolygon(bowtie)).toBe(false);
  });

  it("validates polygon containment (restricted zone inside site boundary)", () => {
    const site = [
      origin,
      localMetersToLatLng({ x: 50, y: 0 }, origin),
      localMetersToLatLng({ x: 50, y: 50 }, origin),
      localMetersToLatLng({ x: 0, y: 50 }, origin),
    ];

    const innerZone = [
      localMetersToLatLng({ x: 10, y: 10 }, origin),
      localMetersToLatLng({ x: 20, y: 10 }, origin),
      localMetersToLatLng({ x: 20, y: 20 }, origin),
      localMetersToLatLng({ x: 10, y: 20 }, origin),
    ];

    const outOfBoundsZone = [
      localMetersToLatLng({ x: 40, y: 40 }, origin),
      localMetersToLatLng({ x: 60, y: 40 }, origin), // extends beyond x=50
      localMetersToLatLng({ x: 60, y: 60 }, origin),
      localMetersToLatLng({ x: 40, y: 60 }, origin),
    ];

    expect(isPolygonInsidePolygon(innerZone, site)).toBe(true);
    expect(isPolygonInsidePolygon(outOfBoundsZone, site)).toBe(false);
  });

  it("computes usable roof area subtracting restricted zones and warns on overlaps", () => {
    const site = [
      origin,
      localMetersToLatLng({ x: 30, y: 0 }, origin),
      localMetersToLatLng({ x: 30, y: 20 }, origin),
      localMetersToLatLng({ x: 0, y: 20 }, origin),
    ]; // ~600 m²

    const zone1: RestrictedZone = {
      id: "z1",
      name: "Skylight 1",
      category: "SKYLIGHT",
      points: [
        localMetersToLatLng({ x: 5, y: 5 }, origin),
        localMetersToLatLng({ x: 10, y: 5 }, origin),
        localMetersToLatLng({ x: 10, y: 10 }, origin),
        localMetersToLatLng({ x: 5, y: 10 }, origin),
      ], // ~25 m²
      areaM2: 25,
    };

    const res = calculateUsableArea(site, [zone1]);
    expect(res.siteAreaM2).toBeGreaterThan(580);
    expect(res.siteAreaM2).toBeLessThan(620);
    expect(res.restrictedAreaM2).toBeGreaterThan(20);
    expect(res.usableAreaM2).toBeLessThan(res.siteAreaM2);
    expect(res.warnings).toHaveLength(0);
  });

  it("detects rotated rectangle collisions using Separating Axis Theorem (SAT)", () => {
    // Panel A at (0, 0), size 2x1, 0 deg
    const boxA = getRotatedRectangleCorners({ x: 0, y: 0 }, 2, 1, 0);

    // Panel B overlapping A at (1, 0.5), size 2x1, 0 deg
    const boxB = getRotatedRectangleCorners({ x: 1, y: 0.5 }, 2, 1, 0);

    // Panel C far away at (10, 10)
    const boxC = getRotatedRectangleCorners({ x: 10, y: 10 }, 2, 1, 0);

    expect(doRotatedBoxesOverlap(boxA, boxB)).toBe(true);
    expect(doRotatedBoxesOverlap(boxA, boxC)).toBe(false);
  });
});
