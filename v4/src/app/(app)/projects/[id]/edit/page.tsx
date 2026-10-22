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
  FolderKanban,
  MapPin,
  Layers,
  Sparkles,
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
          <span>Loading interactive satellite map...</span>
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
      if (!location.trim()) {
        setLocation(
          `Pinned Coordinates (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
        );
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
          <h1 className="edit-project-title">Project Settings</h1>
          <p className="edit-project-subtitle">Loading project specifications...</p>
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
            <strong>{projectId || "unknown"}</strong>&rdquo;. It may have been removed or does not exist.
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
        general: "Failed to update project settings. Please try again.",
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

      {/* Header Banner */}
      <div className="edit-project-header">
        <h1 className="edit-project-title">Project Settings</h1>
        <p className="edit-project-subtitle">
          Manage installation specifications, property details, and map geocoding for &ldquo;{project.name}&rdquo;.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="edit-project-form" noValidate>
        {errors.general && (
          <div className="edit-project-general-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* ── CARD 1: GENERAL DETAILS ── */}
        <div className="edit-project-section-card">
          <div className="edit-project-card-header">
            <div className="edit-project-card-icon edit-project-icon--blue">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="edit-project-card-title">General Information</h2>
              <p className="edit-project-card-subtitle">
                Assign a clear title and specify property classification.
              </p>
            </div>
          </div>

          <div className="edit-project-card-body">
            <Input
              label="Project Name"
              placeholder="e.g. DHA Phase 6 Villa Solar System"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              error={errors.name}
              required
              helperText="A recognizable name for this solar installation site."
            />

            <div className="edit-project-form-row edit-project-form-row--two-col">
              <Select
                label="Property Type"
                options={PROJECT_TYPE_OPTIONS}
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                required
                helperText="Used to configure load profile and tariff brackets."
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
          </div>
        </div>

        {/* ── CARD 2: SITE LOCATION & MAP ── */}
        <div className="edit-project-section-card">
          <div className="edit-project-card-header">
            <div className="edit-project-card-icon edit-project-icon--amber">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="edit-project-card-title">Site Location & Coordinates</h2>
              <p className="edit-project-card-subtitle">
                Address and GPS coordinates used for solar irradiance & weather modeling.
              </p>
            </div>
          </div>

          <div className="edit-project-card-body">
            <Input
              label="Site Address / City"
              placeholder="e.g. Khayaban-e-Shamsheer, DHA Phase 5, Karachi"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) {
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }
              }}
              error={errors.location}
              required
              helperText="Full street address or city location in Pakistan."
            />

            {/* Interactive Site Map */}
            <div className="edit-project-map-section">
              <div className="edit-project-map-header">
                <p className="edit-project-map-instruction">
                  <Info size={14} style={{ color: "var(--color-primary)" }} />
                  <span>
                    Click anywhere on the satellite map or drag the pin to update coordinates.
                  </span>
                </p>

                {coordinates && (
                  <div className="edit-project-coords-badge">
                    <span>
                      {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
                    </span>
                    <button
                      type="button"
                      className="edit-project-map-reset-btn"
                      onClick={() => setCoordinates(null)}
                      title="Reset marker pin"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="edit-project-map-frame">
                <LocationMap
                  coordinates={coordinates}
                  onMapClick={handleMapClick}
                  isGeocoding={isReverseGeocoding}
                  interactive={true}
                  height="300px"
                  zoom={19}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: ROOFTOP SURFACE & NOTES ── */}
        <div className="edit-project-section-card">
          <div className="edit-project-card-header">
            <div className="edit-project-card-icon edit-project-icon--green">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="edit-project-card-title">Roof Surface & Notes</h2>
              <p className="edit-project-card-subtitle">
                Optional usable area estimate and engineering notes.
              </p>
            </div>
          </div>

          <div className="edit-project-card-body">
            <Input
              label="Estimated Usable Roof Area (m²)"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 280"
              value={roofArea}
              onChange={(e) => {
                setRoofArea(e.target.value);
                if (errors.roofArea) {
                  setErrors((prev) => ({ ...prev, roofArea: undefined }));
                }
              }}
              error={errors.roofArea}
              helperText="Approximate square meters available. The 3D simulator can auto-calculate exact polygon area."
            />

            <div className="edit-project-textarea-group">
              <label
                htmlFor="edit-project-description"
                className="edit-project-textarea-label"
              >
                Project & Client Notes
              </label>
              <textarea
                id="edit-project-description"
                className="edit-project-textarea"
                placeholder="Add site conditions, customer electric bill details, or structural notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <span className="edit-project-textarea-helper">
                Optional internal notes for this project.
              </span>
            </div>
          </div>
        </div>

        {/* ── FORM ACTIONS ── */}
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
            <Save size={16} style={{ marginRight: "8px" }} aria-hidden="true" />
            Save Project Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
