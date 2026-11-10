"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  X,
  RotateCcw,
  FolderKanban,
  Clock,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import type { StatusFilterOption } from "@/lib/projects/types";
import ProjectCard from "@/components/projects/ProjectCard";
import Button from "@/components/ui/Button";
import "./projects.css";

const STATUS_FILTER_TABS: { label: string; value: StatusFilterOption }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function ProjectsPage() {
  const { projects, isLoading, resetToDemo } = useProjects();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterOption>("ALL");

  // Calculate project counts from actual project data
  const counts = useMemo(() => {
    return {
      all: projects.length,
      draft: projects.filter((p) => p.status === "DRAFT").length,
      inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
      completed: projects.filter((p) => p.status === "COMPLETED").length,
      archived: projects.filter((p) => p.status === "ARCHIVED").length,
    };
  }, [projects]);

  // Combined Search and Status filter
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      // 1. Status Filter
      const matchesStatus =
        selectedStatus === "ALL" || project.status === selectedStatus;

      // 2. Search Filter (matches both name and location)
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [projects, searchQuery, selectedStatus]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("ALL");
  };

  const isFilteringActive = searchQuery.trim().length > 0 || selectedStatus !== "ALL";

  if (isLoading) {
    return (
      <div className="projects-page">
        <section className="projects-header">
          <div>
            <h1 className="projects-title">Projects</h1>
            <p className="projects-subtitle">Loading your solar projects...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="projects-page">
      {/* 1. Header with Title and Create Action */}
      <header className="projects-header">
        <div className="projects-header-info">
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">
            Manage your solar planning pipeline, rooftop surveys, and system designs.
          </p>
        </div>

        <div className="projects-header-actions">
          <Link href="/projects/new" className="projects-create-btn">
            <Plus size={18} aria-hidden="true" />
            <span>Create Project</span>
          </Link>
        </div>
      </header>

      {/* 2. Project Statistics Bar (Calculated from actual data) */}
      <section className="projects-stats-grid" aria-label="Project statistics">
        <div className="projects-stat-card">
          <div className="projects-stat-icon-wrapper projects-stat-icon-wrapper--all">
            <FolderKanban size={22} aria-hidden="true" />
          </div>
          <div className="projects-stat-details">
            <span className="projects-stat-label">Total Projects</span>
            <span className="projects-stat-value">{counts.all}</span>
          </div>
        </div>

        <div className="projects-stat-card">
          <div className="projects-stat-icon-wrapper projects-stat-icon-wrapper--progress">
            <Clock size={22} aria-hidden="true" />
          </div>
          <div className="projects-stat-details">
            <span className="projects-stat-label">In Progress</span>
            <span className="projects-stat-value">{counts.inProgress}</span>
          </div>
        </div>

        <div className="projects-stat-card">
          <div className="projects-stat-icon-wrapper projects-stat-icon-wrapper--completed">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div className="projects-stat-details">
            <span className="projects-stat-label">Completed</span>
            <span className="projects-stat-value">{counts.completed}</span>
          </div>
        </div>

        <div className="projects-stat-card">
          <div className="projects-stat-icon-wrapper projects-stat-icon-wrapper--draft">
            <FileEdit size={22} aria-hidden="true" />
          </div>
          <div className="projects-stat-details">
            <span className="projects-stat-label">Drafts</span>
            <span className="projects-stat-value">{counts.draft}</span>
          </div>
        </div>
      </section>

      {/* 3. Controls Toolbar: Search & Status Filters */}
      <section className="projects-toolbar" aria-label="Search and filter projects">
        <div className="projects-search-wrapper">
          <Search size={18} className="projects-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="projects-search-input"
            placeholder="Search by project name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search projects by name or location"
          />
          {searchQuery && (
            <button
              type="button"
              className="projects-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="projects-filter-tabs" role="tablist" aria-label="Filter by project status">
          {STATUS_FILTER_TABS.map((tab) => {
            const isActive = selectedStatus === tab.value;
            const tabCount =
              tab.value === "ALL"
                ? counts.all
                : tab.value === "DRAFT"
                  ? counts.draft
                  : tab.value === "IN_PROGRESS"
                    ? counts.inProgress
                    : tab.value === "COMPLETED"
                      ? counts.completed
                      : counts.archived;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`projects-filter-tab ${isActive ? "is-active" : ""}`}
                onClick={() => setSelectedStatus(tab.value)}
              >
                <span>{tab.label}</span>
                <span className="projects-tab-count">{tabCount}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active filters summary indicator */}
      {isFilteringActive && (
        <div className="projects-active-filters-bar">
          <span>
            Showing <strong>{filteredProjects.length}</strong> of{" "}
            <strong>{projects.length}</strong> projects
            {selectedStatus !== "ALL" && (
              <>
                {" "}
                with status <em>{selectedStatus.replace("_", " ")}</em>
              </>
            )}
            {searchQuery && (
              <>
                {" "}
                matching &ldquo;<em>{searchQuery}</em>&rdquo;
              </>
            )}
          </span>
          <button
            type="button"
            className="projects-reset-link-btn"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* 4. Project Grid or Empty States */}
      {projects.length === 0 ? (
        /* Empty State 1: No projects exist in the entire database/state */
        <div className="projects-empty-state">
          <div className="projects-empty-icon">
            <FolderKanban size={32} />
          </div>
          <h2 className="projects-empty-title">No projects yet</h2>
          <p className="projects-empty-desc">
            You don&apos;t have any solar planning projects in your workspace yet.
            Create your first project or reload the demo dataset to explore.
          </p>
          <div className="projects-empty-actions">
            <Link href="/projects/new" className="projects-create-btn">
              <Plus size={18} />
              <span>Create Project</span>
            </Link>
            <Button variant="outline" onClick={resetToDemo}>
              <RotateCcw size={16} style={{ marginRight: "6px" }} />
              Load Demo Projects
            </Button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Empty State 2: Projects exist, but search/filter returned 0 results */
        <div className="projects-empty-state">
          <div className="projects-empty-icon">
            <Search size={32} />
          </div>
          <h2 className="projects-empty-title">No matching projects found</h2>
          <p className="projects-empty-desc">
            No projects matched your criteria
            {searchQuery ? ` for "${searchQuery}"` : ""}
            {selectedStatus !== "ALL"
              ? ` with status ${selectedStatus.replace("_", " ")}`
              : ""}
            . Try searching with different keywords or reset your filters.
          </p>
          <div className="projects-empty-actions">
            <Button variant="primary" onClick={handleClearFilters}>
              <RotateCcw size={16} style={{ marginRight: "6px" }} />
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        /* 5. Projects Listing Cards Grid */
        <div className="projects-grid" data-testid="projects-grid">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
