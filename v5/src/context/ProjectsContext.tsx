"use client";

/**
 * SolarScope — Projects Shared Context
 *
 * Provides shared state for projects across listing, creation, and detail views.
 * Persists modifications (create, update, delete) to browser localStorage
 * so changes reflect throughout the user session and survive page reloads.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Project, ProjectStatus } from "@/lib/projects/types";
import { demoProjects } from "@/data/demo-projects";

const STORAGE_KEY = "ss_demo_projects";

export type NewProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt" | "status"
> & {
  status?: ProjectStatus;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectsContextValue = {
  projects: Project[];
  isLoading: boolean;
  addProject: (project: NewProjectInput) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  resetToDemo: () => void;
};

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

function readStoredProjects(): Project[] | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 0) {
      return parsed as Project[];
    }
  } catch {
    // If parse error or corrupted, return null
  }
  return null;
}

function writeStoredProjects(projects: Project[]): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Silently ignore quota / write errors
  }
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate on mount
  useEffect(() => {
    const stored = readStoredProjects();
    if (stored !== null) {
      // Merge coordinates from demoProjects if missing on demo IDs
      const enriched = stored.map((proj) => {
        if (proj.latitude === undefined || proj.longitude === undefined) {
          const demoMatch = demoProjects.find((dp) => dp.id === proj.id);
          if (demoMatch && demoMatch.latitude && demoMatch.longitude) {
            return {
              ...proj,
              latitude: demoMatch.latitude,
              longitude: demoMatch.longitude,
            };
          }
        }
        return proj;
      });
      setProjects(enriched);
      writeStoredProjects(enriched);
    } else {
      // First time initialization: populate storage with demo data
      writeStoredProjects(demoProjects);
    }
    setIsLoading(false);
  }, []);

  const persistProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects);
    writeStoredProjects(newProjects);
  }, []);

  const addProject = useCallback(
    (newProjData: NewProjectInput): Project => {
      const now = new Date().toISOString();
      const newProject: Project = {
        id: newProjData.id || `proj-${Date.now()}`,
        name: newProjData.name.trim(),
        location: newProjData.location.trim(),
        type: newProjData.type || "Residential",
        status: newProjData.status || "DRAFT",
        roofArea: Number(newProjData.roofArea) || 0,
        systemCapacityKw: newProjData.systemCapacityKw
          ? Number(newProjData.systemCapacityKw)
          : undefined,
        estimatedCost: newProjData.estimatedCost
          ? Number(newProjData.estimatedCost)
          : undefined,
        description: newProjData.description?.trim(),
        latitude:
          newProjData.latitude !== undefined && newProjData.latitude !== null
            ? Number(newProjData.latitude)
            : undefined,
        longitude:
          newProjData.longitude !== undefined && newProjData.longitude !== null
            ? Number(newProjData.longitude)
            : undefined,
        boundary: newProjData.boundary,
        boundaryAreaM2: newProjData.boundaryAreaM2,
        restrictedZones: newProjData.restrictedZones,
        usableAreaM2: newProjData.usableAreaM2,
        panelLayout: newProjData.panelLayout,
        layoutFinalized: newProjData.layoutFinalized,
        layoutFinalizedAt: newProjData.layoutFinalizedAt,
        selectedBuildingId: newProjData.selectedBuildingId,
        selectedBuildingFootprint: newProjData.selectedBuildingFootprint,
        batteryIncluded: newProjData.batteryIncluded,
        batteryCapacityKwh: newProjData.batteryCapacityKwh,
        batteryModel: newProjData.batteryModel,
        createdAt: newProjData.createdAt || now,
        updatedAt: now,
      };

      setProjects((prev) => {
        const next = [newProject, ...prev];
        writeStoredProjects(next);
        return next;
      });

      return newProject;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      setProjects((prev) => {
        const next = prev.map((proj) => {
          if (proj.id !== id) return proj;
          return {
            ...proj,
            ...updates,
            id: proj.id,
            createdAt: proj.createdAt,
            updatedAt: new Date().toISOString(),
          };
        });
        writeStoredProjects(next);
        return next;
      });
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((proj) => proj.id !== id);
      writeStoredProjects(next);
      return next;
    });
  }, []);

  const getProject = useCallback(
    (id: string): Project | undefined => {
      return projects.find((p) => p.id === id);
    },
    [projects]
  );

  const resetToDemo = useCallback(() => {
    persistProjects(demoProjects);
  }, [persistProjects]);

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      isLoading,
      addProject,
      updateProject,
      deleteProject,
      getProject,
      resetToDemo,
    }),
    [projects, isLoading, addProject, updateProject, deleteProject, getProject, resetToDemo]
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
