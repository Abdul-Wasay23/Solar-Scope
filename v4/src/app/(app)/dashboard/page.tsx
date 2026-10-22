"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Zap,
  DollarSign,
  Plus,
  ArrowRight,
  FolderKanban,
  Play,
  FileText,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Home,
  Building,
  Factory,
  ChevronRight,
  Compass,
  Sparkles,
  Layers,
  FileCheck2,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import ProjectStatusBadge from "@/components/projects/ProjectStatusBadge";
import type { ProjectStatus } from "@/lib/projects/types";
import "./dashboard.css";

export default function DashboardPage() {
  const { projects, isLoading } = useProjects();
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProjectStatus>("ALL");

  // Computed metrics from real projects
  const metrics = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(
      (p) => p.status === "COMPLETED" || p.layoutFinalized
    ).length;
    const inProgress = projects.filter(
      (p) => p.status === "IN_PROGRESS" && !p.layoutFinalized
    ).length;
    const draft = projects.filter((p) => p.status === "DRAFT").length;

    // Total designed solar capacity (kWp)
    const totalCapacityKw = projects.reduce((sum, p) => {
      const cap =
        p.panelLayout?.summary?.installedCapacityKw || p.systemCapacityKw || 0;
      return sum + cap;
    }, 0);

    // Total usable solar surface area
    const totalAreaM2 = projects.reduce((sum, p) => {
      const area = p.boundaryAreaM2 || p.usableAreaM2 || p.roofArea || 0;
      return sum + area;
    }, 0);

    // Solar energy yield estimates (1,600 kWh/kWp/year, PKR 50/kWh tariff)
    const annualGenerationKwh = Math.round(totalCapacityKw * 1600);
    const annualSavingsPKR = Math.round(annualGenerationKwh * 50);

    return {
      total,
      completed,
      inProgress,
      draft,
      totalCapacityKw: Math.round(totalCapacityKw * 10) / 10,
      totalAreaM2: Math.round(totalAreaM2),
      annualGenerationKwh,
      annualSavingsPKR,
    };
  }, [projects]);

  // Filtered recent projects (sorted newest first)
  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (statusFilter !== "ALL") {
      list = list.filter((p) => p.status === statusFilter);
    }
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [projects, statusFilter]);

  // Project type icon helper
  const getPropertyIcon = (type?: string) => {
    switch (type) {
      case "Commercial":
        return <Building size={18} />;
      case "Industrial":
        return <Factory size={18} />;
      default:
        return <Home size={18} />;
    }
  };

  return (
    <div className="vip-dashboard">
      {/* 1. Clean, Welcoming VIP Header */}
      <section className="vip-hero-banner">
        <div className="vip-hero-left">
          <div className="vip-telemetry-pill">
            <span className="vip-live-dot" />
            <span>SolarScope Studio • Active Workspace</span>
          </div>

          <h1 className="vip-hero-title">Solar Projects Dashboard</h1>

          <p className="vip-hero-subtitle">
            Design rooftop solar layouts with satellite precision, simulate power output, and generate client-ready feasibility reports.
          </p>
        </div>

        <div className="vip-hero-actions">
          <Link
            href="/projects/new"
            className="vip-btn-new-project"
            id="btn-dashboard-new-project"
          >
            <Plus size={18} />
            <span>New Solar Project</span>
          </Link>
          <Link href="/projects" className="vip-btn-all-projects">
            <FolderKanban size={17} />
            <span>All Projects ({projects.length})</span>
          </Link>
        </div>
      </section>

      {/* 2. Three Clean, Essential KPI Cards */}
      <section className="vip-kpi-grid">
        {/* KPI 1: Active Projects */}
        <div className="vip-kpi-card">
          <div className="vip-kpi-header">
            <span className="vip-kpi-title">Active Projects</span>
            <div className="vip-kpi-icon-wrap vip-kpi-icon--blue">
              <FolderKanban size={22} />
            </div>
          </div>
          <div className="vip-kpi-value-wrap">
            <div className="vip-kpi-value">{isLoading ? "—" : metrics.total}</div>
            <div className="vip-kpi-subtext">Total workspace sites</div>
          </div>
          <div className="vip-kpi-badge-row">
            <span className="vip-kpi-badge vip-kpi-badge--success">
              {metrics.completed} Completed
            </span>
            <span className="vip-kpi-badge vip-kpi-badge--info">
              {metrics.inProgress} In Design
            </span>
            <span className="vip-kpi-badge vip-kpi-badge--warning">
              {metrics.draft} Draft
            </span>
          </div>
        </div>

        {/* KPI 2: Total Solar Capacity */}
        <div className="vip-kpi-card">
          <div className="vip-kpi-header">
            <span className="vip-kpi-title">Total Solar Capacity</span>
            <div className="vip-kpi-icon-wrap vip-kpi-icon--amber">
              <Zap size={22} />
            </div>
          </div>
          <div className="vip-kpi-value-wrap">
            <div className="vip-kpi-value">
              {isLoading ? "—" : `${metrics.totalCapacityKw} kWp`}
            </div>
            <div className="vip-kpi-subtext">
              {metrics.totalAreaM2 > 0
                ? `${metrics.totalAreaM2.toLocaleString()} m² engineered roof area`
                : "Cumulative solar system size"}
            </div>
          </div>
          <div className="vip-kpi-badge-row">
            <TrendingUp size={14} style={{ color: "#D97706" }} />
            <span>
              {metrics.annualGenerationKwh > 0
                ? `Est. ${metrics.annualGenerationKwh.toLocaleString()} kWh / year`
                : "Ready for layout simulation"}
            </span>
          </div>
        </div>

        {/* KPI 3: Est. Annual Bill Savings */}
        <div className="vip-kpi-card">
          <div className="vip-kpi-header">
            <span className="vip-kpi-title">Est. Annual Savings</span>
            <div className="vip-kpi-icon-wrap vip-kpi-icon--green">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="vip-kpi-value-wrap">
            <div className="vip-kpi-value">
              {isLoading
                ? "—"
                : metrics.annualSavingsPKR > 0
                ? `PKR ${(metrics.annualSavingsPKR / 1000).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}k`
                : "PKR 0"}
            </div>
            <div className="vip-kpi-subtext">Utility grid bill reduction</div>
          </div>
          <div className="vip-kpi-badge-row">
            <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
            <span>Calculated with net-metering tariffs</span>
          </div>
        </div>
      </section>

      {/* 3. First-Time User 3-Step Guide (Easy to Understand) */}
      <section className="vip-onboarding-section">
        <div className="vip-onboarding-header">
          <div className="vip-card-title-group">
            <Compass size={20} className="vip-card-title-icon" />
            <div>
              <h2 className="vip-card-title">How To Design With SolarScope</h2>
              <p className="vip-card-subtitle">
                Complete your solar energy assessment in 3 straightforward steps
              </p>
            </div>
          </div>
          <Link href="/projects/new" className="vip-onboarding-start-btn">
            <span>Start Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="vip-steps-container">
          <div className="vip-step-box">
            <div className="vip-step-number">1</div>
            <div className="vip-step-content">
              <h3 className="vip-step-heading">Create Project</h3>
              <p className="vip-step-text">
                Enter your property address, building type (residential/commercial), and approximate rooftop size.
              </p>
            </div>
          </div>

          <div className="vip-step-box">
            <div className="vip-step-number">2</div>
            <div className="vip-step-content">
              <h3 className="vip-step-heading">Simulate Rooftop</h3>
              <p className="vip-step-text">
                Open the interactive satellite map, trace your usable roof boundary, and place solar panels with one click.
              </p>
            </div>
          </div>

          <div className="vip-step-box">
            <div className="vip-step-number">3</div>
            <div className="vip-step-content">
              <h3 className="vip-step-heading">Download Report</h3>
              <p className="vip-step-text">
                Review automated power generation, financial payback timeline, and export a clean PDF proposal for clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Recent Solar Projects Workspace */}
      <section className="vip-card-section">
        <div className="vip-projects-toolbar">
          <div className="vip-card-title-group">
            <FolderKanban size={19} className="vip-card-title-icon" />
            <div>
              <h2 className="vip-card-title">Your Solar Projects</h2>
              <p className="vip-card-subtitle">
                Select a project to simulate 3D solar layout or download feasibility report
              </p>
            </div>
          </div>

          <div className="vip-filter-tabs">
            {(["ALL", "IN_PROGRESS", "COMPLETED", "DRAFT"] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  className={`vip-filter-btn ${
                    statusFilter === status ? "is-active" : ""
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "ALL"
                    ? "All Projects"
                    : status === "IN_PROGRESS"
                    ? "In Progress"
                    : status === "COMPLETED"
                    ? "Completed"
                    : "Draft"}
                </button>
              )
            )}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="vip-empty-state">
            <div className="vip-empty-icon">
              <Sun size={32} />
            </div>
            <h3 className="vip-empty-title">No solar projects to display</h3>
            <p className="vip-empty-desc">
              {statusFilter !== "ALL"
                ? `No projects found under the "${statusFilter.toLowerCase()}" filter. Switch back to "All Projects" or create a new one.`
                : "You haven't created any solar projects yet. Start by setting up your first rooftop site!"}
            </p>
            <Link href="/projects/new" className="vip-btn-new-project">
              <Plus size={16} />
              <span>Create Your First Project</span>
            </Link>
          </div>
        ) : (
          <div className="vip-project-list">
            {filteredProjects.slice(0, 6).map((project) => {
              const capacity =
                project.panelLayout?.summary?.installedCapacityKw ||
                project.systemCapacityKw ||
                0;
              const panelsCount =
                project.panelLayout?.summary?.validPanels ||
                project.panelLayout?.panels?.length ||
                0;
              const roofArea = project.boundaryAreaM2 || project.roofArea || 0;
              const isDone =
                project.status === "COMPLETED" || project.layoutFinalized;

              return (
                <div key={project.id} className="vip-project-row">
                  <div className="vip-project-info">
                    <div className="vip-project-icon">
                      {getPropertyIcon(project.type)}
                    </div>
                    <div className="vip-project-meta-wrap">
                      <Link
                        href={`/projects/${project.id}`}
                        className="vip-project-name-link"
                      >
                        {project.name}
                      </Link>
                      <span className="vip-project-location">
                        <MapPin size={13} />
                        <span>{project.location || "Location Coordinates"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="vip-project-stats">
                    <div className="vip-project-stat-col">
                      <span className="vip-project-stat-label">Capacity</span>
                      <span className="vip-project-stat-val">
                        {capacity > 0 ? `${capacity} kWp` : "Not Sized"}
                      </span>
                    </div>

                    <div className="vip-project-stat-col">
                      <span className="vip-project-stat-label">Panels</span>
                      <span className="vip-project-stat-val">
                        {panelsCount > 0 ? `${panelsCount} Units` : "0"}
                      </span>
                    </div>

                    <div className="vip-project-stat-col">
                      <span className="vip-project-stat-label">Roof Area</span>
                      <span className="vip-project-stat-val">
                        {roofArea > 0 ? `${roofArea.toLocaleString()} m²` : "—"}
                      </span>
                    </div>

                    <div className="vip-project-status-col">
                      <ProjectStatusBadge status={project.status} />
                    </div>
                  </div>

                  <div className="vip-project-actions">
                    {/* Primary Direct Simulate Button */}
                    <Link
                      href={`/projects/${project.id}/map`}
                      className="vip-action-btn-simulate"
                      title="Open Satellite Rooftop Simulation"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Simulate</span>
                    </Link>

                    {/* Report Button (if finalized/completed) */}
                    {isDone && (
                      <Link
                        href={`/projects/${project.id}/report`}
                        className="vip-action-btn-report"
                        title="Download Engineering Report"
                      >
                        <FileText size={13} />
                        <span>Report</span>
                      </Link>
                    )}

                    {/* Overview & Settings Button */}
                    <Link
                      href={`/projects/${project.id}`}
                      className="vip-action-btn-view"
                      title="Project Overview & Settings"
                    >
                      <span>Details</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Quick Workspace Shortcuts */}
      <section className="vip-quick-shortcuts">
        <Link href="/projects/new" className="vip-shortcut-card">
          <div className="vip-shortcut-icon-wrap vip-shortcut-icon--blue">
            <Plus size={20} />
          </div>
          <div>
            <h4 className="vip-shortcut-title">New Project Setup</h4>
            <p className="vip-shortcut-desc">
              Add a new rooftop site by entering coordinates, address, and roof size.
            </p>
          </div>
        </Link>

        {projects.length > 0 ? (
          <Link
            href={`/projects/${projects[0].id}/map`}
            className="vip-shortcut-card"
          >
            <div className="vip-shortcut-icon-wrap vip-shortcut-icon--gold">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <h4 className="vip-shortcut-title">Rooftop Simulation Studio</h4>
              <p className="vip-shortcut-desc">
                Jump directly into your latest project map to place panels and review yield.
              </p>
            </div>
          </Link>
        ) : (
          <Link href="/projects/new" className="vip-shortcut-card">
            <div className="vip-shortcut-icon-wrap vip-shortcut-icon--gold">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <h4 className="vip-shortcut-title">Rooftop Studio</h4>
              <p className="vip-shortcut-desc">
                Create your first project to open the interactive satellite designer.
              </p>
            </div>
          </Link>
        )}

        <Link
          href={
            projects.some((p) => p.status === "COMPLETED" || p.layoutFinalized)
              ? `/projects/${
                  projects.find(
                    (p) => p.status === "COMPLETED" || p.layoutFinalized
                  )?.id
                }/report`
              : "/projects"
          }
          className="vip-shortcut-card"
        >
          <div className="vip-shortcut-icon-wrap vip-shortcut-icon--green">
            <FileCheck2 size={20} />
          </div>
          <div>
            <h4 className="vip-shortcut-title">Feasibility Reports</h4>
            <p className="vip-shortcut-desc">
              View energy production summaries and export client-ready PDF reports.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
