import { describe, expect, it } from "vitest";
import { generatePanelLayout } from "./layout";
import { validatePanels } from "./validation";
import {
  DEFAULT_LAYOUT_CONFIG,
  LatLngPoint,
  PlacedPanel,
  PRESET_PANEL_SPECS,
  RestrictedZone,
} from "./types";
import { localMetersToLatLng } from "@/lib/geo/geometry";

describe("Module 4: Solar Panel Layout & Validation Engines", () => {
  const origin: LatLngPoint = { lat: 24.8607, lng: 67.0011 };

  // 40m x 25m site roof (~1,000 m²)
  const siteBoundary: LatLngPoint[] = [
    origin,
    localMetersToLatLng({ x: 40, y: 0 }, origin),
    localMetersToLatLng({ x: 40, y: 25 }, origin),
    localMetersToLatLng({ x: 0, y: 25 }, origin),
  ];

  it("generates a valid solar panel array fitting within the site boundary", () => {
    const layout = generatePanelLayout(siteBoundary, [], DEFAULT_LAYOUT_CONFIG);

    expect(layout.panels.length).toBeGreaterThan(0);
    expect(layout.summary.totalPanels).toBe(layout.panels.length);
    expect(layout.summary.validPanels).toBe(layout.panels.length);
    expect(layout.summary.invalidPanels).toBe(0);
    expect(layout.summary.installedCapacityKw).toBeGreaterThan(0);

    // Each panel should have valid status and specs
    for (const panel of layout.panels) {
      expect(panel.status).toBe("VALID");
      expect(panel.wattageW).toBe(DEFAULT_LAYOUT_CONFIG.panelSpec.wattageW);
    }
  });

  it("automatically excludes panels colliding with restricted zones during generation", () => {
    // Add a large restricted zone in the center (15m to 25m in X, 5m to 15m in Y)
    const restrictedZone: RestrictedZone = {
      id: "zone-hvac-1",
      name: "Roof HVAC Unit",
      category: "ROOF_OBSTRUCTION",
      points: [
        localMetersToLatLng({ x: 15, y: 5 }, origin),
        localMetersToLatLng({ x: 25, y: 5 }, origin),
        localMetersToLatLng({ x: 25, y: 15 }, origin),
        localMetersToLatLng({ x: 15, y: 15 }, origin),
      ],
      areaM2: 100,
    };

    const layoutWithoutZone = generatePanelLayout(siteBoundary, [], DEFAULT_LAYOUT_CONFIG);
    const layoutWithZone = generatePanelLayout(siteBoundary, [restrictedZone], DEFAULT_LAYOUT_CONFIG);

    // Layout with obstacle should contain fewer panels
    expect(layoutWithZone.panels.length).toBeLessThan(layoutWithoutZone.panels.length);
    expect(layoutWithZone.summary.validPanels).toBe(layoutWithZone.panels.length);
  });

  it("detects overlapping panels and flags them as OVERLAPPING", () => {
    const panel1: PlacedPanel = {
      id: "p1",
      center: localMetersToLatLng({ x: 10, y: 10 }, origin),
      widthM: 1.13,
      heightM: 2.28,
      rotationDeg: 180,
      wattageW: 540,
      status: "VALID",
    };

    // Panel 2 overlaps with panel 1 (placed almost directly on top)
    const panel2: PlacedPanel = {
      id: "p2",
      center: localMetersToLatLng({ x: 10.3, y: 10.3 }, origin),
      widthM: 1.13,
      heightM: 2.28,
      rotationDeg: 180,
      wattageW: 540,
      status: "VALID",
    };

    const { validatedPanels, validationResult } = validatePanels(
      [panel1, panel2],
      siteBoundary,
      []
    );

    expect(validationResult.overlappingPanelIds).toContain("p1");
    expect(validationResult.overlappingPanelIds).toContain("p2");
    expect(validationResult.hasBlockingErrors).toBe(true);

    const validatedP1 = validatedPanels.find((p) => p.id === "p1");
    const validatedP2 = validatedPanels.find((p) => p.id === "p2");
    expect(validatedP1?.status).toBe("OVERLAPPING");
    expect(validatedP2?.status).toBe("OVERLAPPING");
  });

  it("detects panels placed outside the site boundary and flags them as OUTSIDE_BOUNDARY", () => {
    const insidePanel: PlacedPanel = {
      id: "p-in",
      center: localMetersToLatLng({ x: 10, y: 10 }, origin),
      widthM: 1.13,
      heightM: 2.28,
      rotationDeg: 180,
      wattageW: 540,
      status: "VALID",
    };

    // Positioned outside boundary (site is 40x25, this is at 50, 50)
    const outsidePanel: PlacedPanel = {
      id: "p-out",
      center: localMetersToLatLng({ x: 50, y: 50 }, origin),
      widthM: 1.13,
      heightM: 2.28,
      rotationDeg: 180,
      wattageW: 540,
      status: "VALID",
    };

    const { validatedPanels, validationResult } = validatePanels(
      [insidePanel, outsidePanel],
      siteBoundary,
      []
    );

    expect(validationResult.outOfBoundsPanelIds).toContain("p-out");
    expect(validationResult.hasBlockingErrors).toBe(true);

    const out = validatedPanels.find((p) => p.id === "p-out");
    expect(out?.status).toBe("OUTSIDE_BOUNDARY");
  });

  it("evaluates finalization eligibility correctly (Step 12)", () => {
    // Case 1: Valid layout -> eligible
    const validLayout = generatePanelLayout(siteBoundary, [], DEFAULT_LAYOUT_CONFIG);
    const validValidation = validatePanels(validLayout.panels, siteBoundary, []);
    expect(validValidation.validationResult.hasBlockingErrors).toBe(false);
    expect(validValidation.validationResult.isValid).toBe(true);

    // Case 2: Empty panels -> cannot finalize
    const emptyValidation = validatePanels([], siteBoundary, []);
    expect(emptyValidation.validationResult.isValid).toBe(false);
  });
});
