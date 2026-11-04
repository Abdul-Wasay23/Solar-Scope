/**
 * SolarScope — Module 4: Spatial & Solar Panel Layout Types
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type RestrictedZoneCategory =
  | "CHIMNEY_VENT"
  | "SKYLIGHT"
  | "MAINTENANCE_ACCESS"
  | "ROOF_OBSTRUCTION"
  | "OTHER";

export const RESTRICTED_ZONE_LABELS: Record<RestrictedZoneCategory, string> = {
  CHIMNEY_VENT: "Chimney / Vent",
  SKYLIGHT: "Skylight",
  MAINTENANCE_ACCESS: "Maintenance Access",
  ROOF_OBSTRUCTION: "Roof Obstruction",
  OTHER: "Other Restricted Area",
};

export const RESTRICTED_ZONE_COLORS: Record<
  RestrictedZoneCategory,
  { stroke: string; fill: string; badge: string }
> = {
  CHIMNEY_VENT: { stroke: "#EA580C", fill: "rgba(234, 88, 12, 0.25)", badge: "#FFEDD5" },
  SKYLIGHT: { stroke: "#2563EB", fill: "rgba(37, 99, 235, 0.25)", badge: "#DBEAFE" },
  MAINTENANCE_ACCESS: { stroke: "#D97706", fill: "rgba(217, 119, 6, 0.25)", badge: "#FEF3C7" },
  ROOF_OBSTRUCTION: { stroke: "#DC2626", fill: "rgba(220, 38, 38, 0.25)", badge: "#FEE2E2" },
  OTHER: { stroke: "#6B7280", fill: "rgba(107, 114, 128, 0.25)", badge: "#F3F4F6" },
};

export interface RestrictedZone {
  id: string;
  name: string;
  category: RestrictedZoneCategory;
  points: LatLngPoint[];
  areaM2: number;
  createdAt?: string;
}

export type PanelOrientation = "PORTRAIT" | "LANDSCAPE";

export interface SolarPanelSpec {
  widthM: number;
  heightM: number;
  wattageW: number;
  modelName?: string;
}

export const PRESET_PANEL_SPECS: Record<string, SolarPanelSpec> = {
  standard: {
    modelName: "Standard Monocrystalline (400W)",
    widthM: 1.05,
    heightM: 1.75,
    wattageW: 400,
  },
  highEfficiency: {
    modelName: "Tier-1 Bifacial Solar PV (540W)",
    widthM: 1.13,
    heightM: 2.28,
    wattageW: 540,
  },
  commercial: {
    modelName: "Commercial Utility Grade (650W)",
    widthM: 1.3,
    heightM: 2.4,
    wattageW: 650,
  },
  longi400: {
    modelName: "Longi Solar Hi-MO 5 Mono (400W)",
    widthM: 1.05,
    heightM: 1.75,
    wattageW: 400,
  },
  jinko400: {
    modelName: "JinkoSolar Tiger Neo N-Type (400W)",
    widthM: 1.03,
    heightM: 1.72,
    wattageW: 400,
  },
  canadian540: {
    modelName: "Canadian Solar HiKu6 Mono PERC (540W)",
    widthM: 1.13,
    heightM: 2.28,
    wattageW: 540,
  },
  ja540: {
    modelName: "JA Solar DeepBlue 3.0 Bifacial (540W)",
    widthM: 1.13,
    heightM: 2.28,
    wattageW: 540,
  },
  trina650: {
    modelName: "Trina Solar Vertex Ultra-High (650W)",
    widthM: 1.3,
    heightM: 2.38,
    wattageW: 650,
  },
  risen650: {
    modelName: "Risen Energy Titan PV Module (650W)",
    widthM: 1.3,
    heightM: 2.4,
    wattageW: 650,
  },
};

export interface PanelLayoutConfig {
  panelSpec: SolarPanelSpec;
  orientation: PanelOrientation;
  rowSpacingM: number;
  colSpacingM: number;
  azimuthDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  tiltDeg: number;    // Surface tilt angle (e.g. 15-30 deg)
  setbackM: number;    // Boundary perimeter setback in meters
  maxCapacityKw?: number; // Optional target / max system capacity cap (e.g. 5, 10 kWp)
}

export const DEFAULT_LAYOUT_CONFIG: PanelLayoutConfig = {
  panelSpec: PRESET_PANEL_SPECS.highEfficiency,
  orientation: "PORTRAIT",
  rowSpacingM: 0.5,
  colSpacingM: 0.3,
  azimuthDeg: 180, // Facing South for Pakistan
  tiltDeg: 25,
  setbackM: 0.5,
};

export type PanelValidationStatus =
  | "VALID"
  | "OVERLAPPING"
  | "OUTSIDE_BOUNDARY"
  | "RESTRICTED_COLLISION";

export interface PlacedPanel {
  id: string;
  center: LatLngPoint;
  widthM: number;
  heightM: number;
  rotationDeg: number;
  wattageW: number;
  status: PanelValidationStatus;
  validationIssues?: string[];
}

export interface LayoutSummary {
  totalPanels: number;
  validPanels: number;
  invalidPanels: number;
  installedCapacityKw: number;
  siteAreaM2: number;
  restrictedAreaM2: number;
  usableAreaM2: number;
  panelCoverageM2: number;
}

export interface SolarPanelLayout {
  config: PanelLayoutConfig;
  panels: PlacedPanel[];
  summary: LayoutSummary;
  generatedAt: string;
  updatedAt: string;
}

export interface LayoutValidationResult {
  isValid: boolean;
  hasBlockingErrors: boolean;
  errors: string[];
  warnings: string[];
  overlappingPanelIds: string[];
  outOfBoundsPanelIds: string[];
  restrictedCollisionPanelIds: string[];
}
