/**
 * SolarScope — Project Types Definition
 * Used for project listing, details, and project management workflows.
 */

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
  roofArea: number; // in sq ft
  systemCapacityKw?: number; // estimated system size in kW
  estimatedCost?: number; // estimated budget / cost in PKR or USD
  description?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export type StatusFilterOption = "ALL" | ProjectStatus;
