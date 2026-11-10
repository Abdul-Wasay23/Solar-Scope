"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  MapPin,
  Maximize2,
  Zap,
  DollarSign,
  Calendar,
  AlertTriangle,
  Compass,
  Grid,
  FileBarChart,
  ChevronRight,
  Loader2,
  Play,
  Download,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import ProjectStatusBadge from "@/components/projects/ProjectStatusBadge";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import "./project-details.css";

const LocationMap = dynamic(
  () => import("@/components/projects/LocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="solarscope-map-wrapper" style={{ height: "300px" }}>
        <div className="solarscope-map-loading-overlay">
          <Loader2 size={22} className="solarscope-spin" />
          <span>Loading map view...</span>
        </div>
      </div>
    ),
  }
);

export default function ProjectDetailsPage({
  params,
}: {
  params?: { id: string };
}) {
  const router = useRouter();
  const routerParams = useParams();
  const projectId = (params?.id || routerParams?.id) as string;

  const { getProject, deleteProject, updateProject, isLoading } = useProjects();
  const project = getProject(projectId);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = () => {
    if (isDeleting || !project) return;
    setIsDeleting(true);
    deleteProject(project.id);
    router.push("/projects");
  };

  const handleToggleArchive = () => {
    if (!project) return;
    const nextStatus = project.status === "ARCHIVED" ? "IN_PROGRESS" : "ARCHIVED";
    updateProject(project.id, { status: nextStatus });
  };

  const handleGenerateReport = () => {
    router.push(`/projects/${projectId}/report`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="project-details-page">
        <div className="project-loading-state" role="status">
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  // Not Found state
  if (!project) {
    return (
      <div className="project-details-page">
        <div className="project-details-nav">
          <Link href="/projects" className="project-details-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Projects</span>
          </Link>
        </div>

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

  const hasCoordinates =
    typeof project.latitude === "number" &&
    typeof project.longitude === "number" &&
    !isNaN(project.latitude) &&
    !isNaN(project.longitude);

  // Roof Area display: in m² or "Not specified" if missing or zero
  const roofAreaDisplay =
    project.roofArea && project.roofArea > 0
      ? `${project.roofArea.toLocaleString()} m²`
      : "Not specified";

  // Formatted capacity and budget
  const capacityDisplay =
    project.systemCapacityKw !== undefined && project.systemCapacityKw > 0
      ? `${project.systemCapacityKw} kW`
      : "Not specified";

  const budgetDisplay =
    project.estimatedCost !== undefined && project.estimatedCost > 0
      ? `PKR ${project.estimatedCost.toLocaleString()}`
      : "Not specified";

  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "N/A";

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    : "N/A";

  return (
    <div className="project-details-page">
      {/* 1. Header Navigation & Edit Link */}
      <nav className="project-details-nav" aria-label="Project details navigation">
        <Link
          href="/projects"
          className="project-details-back-link"
          aria-label="Back to all projects"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Projects</span>
        </Link>

        <div className="project-details-actions">
          <Link
            href={`/projects/${project.id}/map`}
            className="project-details-simulate-btn"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#FFFFFF",
              borderColor: "var(--color-primary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: "var(--font-size-sm)",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(15, 44, 89, 0.25)",
              transition: "all 0.15s ease",
            }}
            aria-label={`Simulate Solar Design Workspace for ${project.name}`}
          >
            <Play size={15} fill="currentColor" aria-hidden="true" />
            <span>Simulate</span>
          </Link>

          {/* Generate / View Report */}
          <button
            type="button"
            id="btn-generate-report"
            onClick={handleGenerateReport}
            aria-label={`View engineering report for ${project.name}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              background: project.layoutFinalized
                ? "linear-gradient(135deg, #10B981, #059669)"
                : "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "var(--font-size-sm)",
              border: "none",
              cursor: "pointer",
              boxShadow: project.layoutFinalized
                ? "0 2px 6px rgba(16, 185, 129, 0.35)"
                : "0 2px 6px rgba(59, 130, 246, 0.35)",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Download size={15} aria-hidden="true" />
            <span>{project.layoutFinalized ? "Final Report" : "Report Preview"}</span>
          </button>

          <Link
            href={`/projects/${project.id}/edit`}
            className="project-details-edit-btn"
            aria-label={`Edit ${project.name}`}
          >
            <Edit size={15} aria-hidden="true" />
            <span>Edit Project</span>
          </Link>

          {/* Archive / Restore button */}
          <button
            type="button"
            id="btn-toggle-archive"
            className={project.status === "ARCHIVED" ? "project-details-restore-btn" : "project-details-archive-btn"}
            onClick={handleToggleArchive}
            aria-label={project.status === "ARCHIVED" ? `Restore ${project.name} from archive` : `Archive ${project.name}`}
          >
            {project.status === "ARCHIVED" ? (
              <>
                <ArchiveRestore size={15} aria-hidden="true" />
                <span>Restore</span>
              </>
            ) : (
              <>
                <Archive size={15} aria-hidden="true" />
                <span>Archive</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="project-details-delete-btn"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>Delete Project</span>
          </button>
        </div>
      </nav>

      {/* 2. Overview Card with Project Information */}
      <article className="project-overview-card">
        <div className="project-overview-header">
          <div className="project-overview-main">
            <div className="project-overview-badges">
              <span className="project-type-tag">{project.type}</span>
              <ProjectStatusBadge status={project.status} />
            </div>

            <h1 className="project-details-title">{project.name}</h1>

            <div className="project-details-location">
              <MapPin size={16} aria-hidden="true" />
              <span>{project.location}</span>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="project-details-description">{project.description}</p>
        )}

        {/* Key Metrics Grid */}
        <section className="project-metrics-grid" aria-label="Key project metrics">
          <div className="project-metric-card">
            <span className="project-metric-label">Roof Area</span>
            <span className="project-metric-value">
              <Maximize2 size={16} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              {roofAreaDisplay}
            </span>
            <span className="project-metric-subtext">Estimated usable surface</span>
          </div>

          <div className="project-metric-card">
            <span className="project-metric-label">Est. Capacity</span>
            <span className="project-metric-value">
              <Zap size={16} style={{ color: "var(--color-warning)" }} aria-hidden="true" />
              {capacityDisplay}
            </span>
            <span className="project-metric-subtext">Peak solar yield target</span>
          </div>

          <div className="project-metric-card">
            <span className="project-metric-label">Estimated Budget</span>
            <span className="project-metric-value">
              <DollarSign size={16} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              {budgetDisplay}
            </span>
            <span className="project-metric-subtext">Initial financial estimate</span>
          </div>

          <div className="project-metric-card">
            <span className="project-metric-label">Project Timeline</span>
            <span className="project-metric-value" style={{ fontSize: "1rem" }}>
              <Calendar size={16} style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              {updatedDate}
            </span>
            <span className="project-metric-subtext">Created on {createdDate}</span>
          </div>
        </section>

        {/* Project Location Map Card */}
        <section className="project-details-map-section" aria-label="Site map view">
          <div className="project-details-map-header">
            <h3 className="project-details-map-title">
              <MapPin size={16} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
              <span>Site Location & Geo Coordinates</span>
            </h3>

            {hasCoordinates && (
              <div className="project-details-coords-tag">
                <span>Lat: {project.latitude?.toFixed(5)}</span>
                <span>•</span>
                <span>Lng: {project.longitude?.toFixed(5)}</span>
              </div>
            )}
          </div>

          {hasCoordinates ? (
            <LocationMap
              coordinates={{ lat: project.latitude!, lng: project.longitude! }}
              interactive={true}
              height="340px"
              zoom={25}
            />
          ) : (
            <div className="project-details-no-coords-notice">
              <Compass size={20} />
              <span>Map preview not available because geographic coordinates were not saved for this project.</span>
            </div>
          )}
        </section>
      </article>

      {/* 3. Project Workspace Section (Step 2.8 Informational Placeholders) */}
      <section className="project-workspace-section" aria-label="Project Workspace Modules">
        <div className="project-workspace-header">
          <h2 className="project-workspace-title">Project Workspace</h2>
          <p className="project-workspace-subtitle">
            Engineering tools and calculation suites configured for this site.
          </p>
        </div>

        <div className="project-workspace-grid">
          {/* Card 1: Site & Location */}
          <Link
            href={`/projects/${project.id}/map`}
            className="workspace-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            aria-label={`Open Site & Location for ${project.name}`}
          >
            <div className="workspace-card-icon-wrapper workspace-card-icon-wrapper--site">
              <Compass size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="workspace-card-title">Site & Location</h3>
              <p className="workspace-card-desc">
                Rooftop geometry, geographic coordinates, solar irradiation data, and local boundary constraints for {project.location}.
              </p>
            </div>
            <div className="workspace-card-footer">
              <span className="workspace-card-badge" style={{ background: "var(--color-primary)", color: "#FFFFFF" }}>
                Active Module
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", color: "var(--color-primary)", fontWeight: 600 }}>
                Open Layout <ChevronRight size={14} />
              </span>
            </div>
          </Link>

          {/* Card 2: Panel Layout */}
          <Link
            href={`/projects/${project.id}/map`}
            className="workspace-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            aria-label={`Open Panel Layout for ${project.name}`}
          >
            <div className="workspace-card-icon-wrapper workspace-card-icon-wrapper--layout">
              <Grid size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="workspace-card-title">Panel Layout</h3>
              <p className="workspace-card-desc">
                Photovoltaic module arrangement, string inverter wiring, tilt and azimuth angle simulation, and obstruction shading zones.
              </p>
            </div>
            <div className="workspace-card-footer">
              <span className="workspace-card-badge" style={{ background: "var(--color-primary)", color: "#FFFFFF" }}>
                Active Module
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", color: "var(--color-primary)", fontWeight: 600 }}>
                Open Layout <ChevronRight size={14} />
              </span>
            </div>
          </Link>

          {/* Card 3: Calculations & Reports */}
          <Link
            href={`/projects/${project.id}/report`}
            className="workspace-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            aria-label={`Open Calculations & Reports for ${project.name}`}
          >
            <div className="workspace-card-icon-wrapper workspace-card-icon-wrapper--reports">
              <FileBarChart size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="workspace-card-title">Calculations & Reports</h3>
              <p className="workspace-card-desc">
                Hourly energy production forecasts, financial payback calculations, carbon offset analysis, and downloadable engineering reports.
              </p>
            </div>
            <div className="workspace-card-footer">
              <span className="workspace-card-badge" style={{ background: "var(--color-primary)", color: "#FFFFFF" }}>
                Active Module
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", color: "var(--color-primary)", fontWeight: 600 }}>
                Open Report <ChevronRight size={14} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteDialogOpen(false);
        }}
        role="alertdialog"
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        footer={
          <div className="project-delete-dialog-footer">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
              disabled={isDeleting}
            >
              Confirm Delete
            </Button>
          </div>
        }
      >
        <p className="project-delete-dialog-body-text">
          This project will be permanently removed from your active workspace along with any associated rooftop configurations and metrics.
        </p>
      </Dialog>
    </div>
  );
}
