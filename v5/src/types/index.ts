/**
 * SolarScope Core Type Definitions (Foundational)
 */

export type UserRole = "BUYER" | "SELLER" | "SERVICE_PROVIDER" | "ADMIN";

export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

export type BaseEntity = {
  id: string | number;
  createdAt: string;
  updatedAt: string;
};

export * from "@/lib/projects/types";
