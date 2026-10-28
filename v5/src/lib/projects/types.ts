/**
 * SolarScope — Project Types Definition
 * Used for project listing, details, and project management workflows.
 */

import type {
  LatLngPoint,
  RestrictedZone,
  SolarPanelLayout,
} from "@/lib/solar/types";

export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

export type ProjectType =
  | "Residential"
  | "Commercial"
  | "Industrial"
  | "Agricultural";

export interface Project {
  id: string;
  name: string;
  location: string;
  type: ProjectType;
  status: ProjectStatus;
  roofArea: number; // in sq ft or m2
  systemCapacityKw?: number; // estimated system size in kW
  estimatedCost?: number; // estimated budget / cost in PKR or USD
  description?: string;
  latitude?: number;
  longitude?: number;
  // Module 4: Spatial & Solar Layout Workflow extensions
  selectedBuildingId?: string;
  selectedBuildingFootprint?: LatLngPoint[];
  boundary?: LatLngPoint[];
  boundaryAreaM2?: number;
  restrictedZones?: RestrictedZone[];
  usableAreaM2?: number;
  panelLayout?: SolarPanelLayout;
  layoutFinalized?: boolean;
  layoutFinalizedAt?: string;
  // Battery Storage Workflow
  batteryIncluded?: boolean;
  batteryCapacityKwh?: number;
  batteryModel?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatusFilterOption = "ALL" | ProjectStatus;

export * from "@/lib/solar/types";

