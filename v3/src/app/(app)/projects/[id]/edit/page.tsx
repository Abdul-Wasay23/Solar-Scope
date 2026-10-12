"use client";

import { useState, useEffect, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Save,
  Loader2,
  Info,
  RotateCcw,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import type { ProjectType, ProjectStatus } from "@/lib/projects/types";
import type { Coordinates } from "@/components/projects/LocationMap";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import "./edit-project.css";

const LocationMap = dynamic(
  () => import("@/components/projects/LocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="solarscope-map-wrapper" style={{ height: "280px" }}>
        <div className="solarscope-map-loading-overlay">
          <Loader2 size={24} className="solarscope-spin" />
          <span>Loading interactive map...</span>
        </div>
      </div>
    ),
  }
);

const PROJECT_TYPE_OPTIONS = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
  { value: "Industrial", label: "Industrial" },
  { value: "Agricultural", label: "Agricultural" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function EditProjectPage({
  params,
}: {
  params?: { id: string };
}) {
  const router = useRouter();
  const routerParams = useParams();
  const projectId = (params?.id || routerParams?.id) as string;

  const { getProject, updateProject, isLoading } = useProjects();
  const project = getProject(projectId);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<ProjectType>("Residential");
  const [status, setStatus] = useState<ProjectStatus>("DRAFT");
  const [roofArea, setRoofArea] = useState("");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    location?: string;
    roofArea?: string;
    general?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Populate form with existing project values
  useEffect(() => {
    if (project && !isInitialized) {
      setName(project.name || "");
      setLocation(project.location || "");
      setType(project.type || "Residential");
      setStatus(project.status || "DRAFT");
      setRoofArea(
        project.roofArea && project.roofArea > 0
          ? String(project.roofArea)
          : ""
      );
      setDescription(project.description || "");

      if (
        typeof project.latitude === "number" &&
        typeof project.longitude === "number" &&
        !isNaN(project.latitude) &&
        !isNaN(project.longitude)
      ) {
        setCoordinates({ lat: project.latitude, lng: project.longitude });
      }

      setIsInitialized(true);
    }
  }, [project, isInitialized]);

  // Handle map click or marker drag: place marker & reverse geocode to fill Location input
  const handleMapClick = async (coords: Coordinates) => {
    setCoordinates(coords);
    setIsReverseGeocoding(true);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setLocation(data.display_name);
          if (errors.location) {
            setErrors((prev) => ({ ...prev, location: undefined }));
          }
        }
      }
    } catch {
      // Reverse geocoding failed: retain marker & coordinates, use fallback if empty
      if (!location.trim()) {
        setLocation(`Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="edit-project-page">
        <div className="edit-project-header">
          <h1 className="edit-project-title">Edit Project</h1>
          <p className="edit-project-subtitle">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Not Found state
  if (!project) {
    return (
      <div className="edit-project-page">
        <Link href="/projects" className="edit-project-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Projects</span>
        </Link>

        <div className="project-not-found-card" role="alert">
          <div className="project-not-found-icon">
            <AlertTriangle size={32} aria-hidden="true" />
          </div>
          <h1 className="project-not-found-title">Project Not Found</h1>
          <p className="project-not-found-desc">
            We couldn&apos;t find any project matching ID &ldquo;
            <strong>{projectId || "unknown"}</strong>&rdquo;. It may have been removed or does not exist in your workspace.
          </p>
          <Link href="/projects">
            <Button variant="primary">
              <ArrowLeft size={16} style={{ marginRight: "6px" }} />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const newErrors: {
      name?: string;
      location?: string;
      roofArea?: string;
      general?: string;
    } = {};

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const trimmedRoof = roofArea.trim();

    if (!trimmedName) {
      newErrors.name = "Project name is required";
    }

    if (!trimmedLocation) {
      newErrors.location = "Location is required";
    }

    let parsedRoofArea = 0;
    if (trimmedRoof !== "") {
      const parsed = Number(trimmedRoof);
      if (isNaN(parsed) || parsed <= 0) {
        newErrors.roofArea = "Roof area must be a positive number";
      } else {
        parsedRoofArea = parsed;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      updateProject(project.id, {
        name: trimmedName,
        location: trimmedLocation,
        type,
        status,
        roofArea: parsedRoofArea,
        description: description.trim() || undefined,
        latitude: coordinates ? coordinates.lat : undefined,
        longitude: coordinates ? coordinates.lng : undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch {
      setErrors({
        general: "Failed to update project. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="edit-project-page">
      <Link
        href={`/projects/${project.id}`}
        className="edit-project-back-link"
        aria-label="Back to project details"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Project Details</span>
      </Link>

      <div className="edit-project-header">
        <h1 className="edit-project-title">Edit Project</h1>
        <p className="edit-project-subtitle">
          Update specifications, location, or development status for &ldquo;{project.name}&rdquo;.
        </p>
      </div>

      <div className="edit-project-card">
        <form onSubmit={handleSubmit} className="edit-project-form" noValidate>
          {errors.general && (
            <div className="edit-project-general-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* 1. Project Name */}
          <Input
            label="Project Name"
            placeholder="e.g. F-7 Villa Solar System"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            required
            helperText="A clear, identifiable title for your solar planning installation."
          />

          {/* 2. Location */}
          <Input
            label="Location / Address"
            placeholder="e.g. Street 12, F-7/2, Islamabad"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) {
                setErrors((prev) => ({ ...prev, location: undefined }));
              }
            }}
            error={errors.location}
            required
            helperText="Site address or geographic region in Pakistan."
          />

          {/* Interactive Site Map */}
          <div className="edit-project-map-section">
            <div className="edit-project-map-header">
              <p className="edit-project-map-instruction">
                <Info
                  size={14}
                  aria-hidden="true"
                  style={{ color: "var(--color-primary)" }}
                />
                <span>
                  Click on the map or drag the pin to update geographic coordinates.
                </span>
              </p>

              {coordinates && (
                <button
                  type="button"
                  className="edit-project-map-reset-btn"
                  onClick={() => setCoordinates(null)}
                  title="Remove marker pin"
                >
                  <RotateCcw size={12} />
                  <span>Reset Pin</span>
                </button>
              )}
            </div>

            <LocationMap
              coordinates={coordinates}
              onMapClick={handleMapClick}
              isGeocoding={isReverseGeocoding}
              interactive={true}
              height="280px"
            />
          </div>

          {/* 3. Project Type & Status */}
          <div className="edit-project-form-row edit-project-form-row--two-col">
            <Select
              label="Project Type"
              options={PROJECT_TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
              required
              helperText="Determines load profile and tariff calculations."
            />

            <Select
              label="Project Status"
              options={PROJECT_STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              required
              helperText="Current pipeline stage for this project."
            />
          </div>

          {/* 4. Roof Area (m²) */}
          <Input
            label="Usable Roof Area (m²)"
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 2400"
            value={roofArea}
            onChange={(e) => {
              setRoofArea(e.target.value);
              if (errors.roofArea) {
                setErrors((prev) => ({ ...prev, roofArea: undefined }));
              }
            }}
            error={errors.roofArea}
            helperText="Optional. Approximate surface available for solar panel installation."
          />

          {/* 5. Project Description */}
          <div className="edit-project-textarea-group">
            <label htmlFor="edit-project-description" className="edit-project-textarea-label">
              Project Description
            </label>
            <textarea
              id="edit-project-description"
              className="edit-project-textarea"
              placeholder="Add engineering notes, client requirements, or special site conditions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <span className="edit-project-textarea-helper">
              Optional background or architectural notes.
            </span>
          </div>

          {/* 6. Form Actions */}
          <div className="edit-project-actions">
            <Link
              href={`/projects/${project.id}`}
              className="edit-project-cancel-btn"
            >
              Cancel
            </Link>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              <Save size={16} style={{ marginRight: "6px" }} aria-hidden="true" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
