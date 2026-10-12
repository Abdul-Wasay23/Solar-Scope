import Link from "next/link";
import { MapPin, Maximize2, Zap, ChevronRight } from "lucide-react";
import type { Project } from "@/lib/projects/types";
import ProjectStatusBadge from "./ProjectStatusBadge";
import ProjectMapPreview from "./ProjectMapPreview";
import "./ProjectCard.css";

export type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const formattedRoofArea = Number(project.roofArea || 0).toLocaleString();

  return (
    <Link
      href={`/projects/${project.id}`}
      className="project-card"
      data-testid={`project-card-${project.id}`}
      aria-label={`View details for ${project.name}`}
    >
      {/* 1. Location Map Preview with Marker */}
      <ProjectMapPreview
        latitude={project.latitude}
        longitude={project.longitude}
        projectName={project.name}
      />

      {/* 2. Type & Status Badges */}
      <div className="project-card-header">
        <span className="project-card-type-pill">{project.type}</span>
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* 3. Title */}
      <h3 className="project-card-title">{project.name}</h3>

      {/* 4. Location with Pin Icon */}
      <div className="project-card-location">
        <MapPin size={15} aria-hidden="true" />
        <span>{project.location}</span>
      </div>

      {project.description && (
        <p className="project-card-description">{project.description}</p>
      )}

      {/* 5. Metrics */}
      <div className="project-card-metrics">
        <div className="project-card-metric-item">
          <span className="project-card-metric-label">Roof Area</span>
          <span className="project-card-metric-value" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Maximize2 size={13} aria-hidden="true" style={{ color: "var(--color-text-muted)" }} />
            {formattedRoofArea} m²
          </span>
        </div>

        {project.systemCapacityKw !== undefined ? (
          <div className="project-card-metric-item">
            <span className="project-card-metric-label">Est. Capacity</span>
            <span className="project-card-metric-value" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Zap size={13} aria-hidden="true" style={{ color: "var(--color-warning)" }} />
              {project.systemCapacityKw} kW
            </span>
          </div>
        ) : (
          <div className="project-card-metric-item">
            <span className="project-card-metric-label">Status</span>
            <span className="project-card-metric-value">{project.status}</span>
          </div>
        )}
      </div>

      {/* 6. Footer */}
      <div className="project-card-footer">
        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        <span className="project-card-link-hint">
          Details <ChevronRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
