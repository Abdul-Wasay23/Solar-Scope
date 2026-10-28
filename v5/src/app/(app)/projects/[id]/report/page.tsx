"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  Sun,
  Zap,
  DollarSign,
  Leaf,
  MapPin,
  Grid,
  FileCheck2,
  AlertTriangle,
  Loader2,
  Home,
  BarChart3,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import "./report.css";

function loadHtml2Pdf(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }
  if ((window as any).html2pdf) {
    return Promise.resolve((window as any).html2pdf);
  }
  const existing = document.getElementById("solarscope-html2pdf-script") as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve((window as any).html2pdf));
      existing.addEventListener("error", reject);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "solarscope-html2pdf-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function ProjectReportPage({
  params,
}: {
  params?: { id: string };
}) {
  const routerParams = useParams();
  const projectId = (params?.id || routerParams?.id) as string;

  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const { getProject, isLoading } = useProjects();
  const project = getProject(projectId);

  // Loading state
  if (isLoading) {
    return (
      <div className="report-loading-page">
        <Loader2 size={36} className="report-spin" />
        <p>Loading project report…</p>
      </div>
    );
  }

  // Not Found state
  if (!project) {
    return (
      <div className="report-not-found">
        <AlertTriangle size={36} />
        <h1>Project Not Found</h1>
        <p>We couldn&apos;t find a project with ID &ldquo;{projectId}&rdquo;.</p>
        <Link href="/projects" className="report-back-link">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const layout = project.panelLayout;
  const summary = layout?.summary;
  const panels = layout?.panels || [];
  const validPanels = panels.filter((p) => p.status === "VALID");
  const totalPanels = panels.length;
  const validCount = validPanels.length;
  const panelSpec = layout?.config?.panelSpec;

  // Financial estimates (Pakistan context)
  const capacityKw = summary?.installedCapacityKw || project.systemCapacityKw || 0;
  const annualProductionKwh = capacityKw * 1600; // ~1600 kWh/kWp/year in Pakistan
  const electricityCostPerKwh = 50; // PKR per kWh (avg Pakistan)
  const annualSavingsPKR = annualProductionKwh * electricityCostPerKwh;
  const systemCostPKR = project.estimatedCost || capacityKw * 250000; // ~250,000 PKR/kWp
  const paybackYears = systemCostPKR > 0 && annualSavingsPKR > 0 ? (systemCostPKR / annualSavingsPKR).toFixed(1) : "N/A";
  const lifetimeSavingsPKR = annualSavingsPKR * 25; // 25-year system life

  // Environmental impact
  const co2OffsetTonsPerYear = annualProductionKwh * 0.000649; // Pakistan grid emission factor
  const treesEquivalent = Math.round(co2OffsetTonsPerYear * 45);

  // Dates
  const generatedDate = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const finalizedDate = project.layoutFinalizedAt
    ? new Date(project.layoutFinalizedAt).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "N/A";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !project) return;
    setIsDownloadingPdf(true);

    try {
      const html2pdf = await loadHtml2Pdf();
      const element = reportRef.current || document.getElementById("solar-report-document");
      if (!element) {
        window.print();
        return;
      }

      const safeProjectName = (project.name || "Project").replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SolarScope_Report_${safeProjectName}_${dateStr}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn("Direct PDF download failed, opening browser print dialog instead:", err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const roofAreaM2 = project.boundaryAreaM2 || project.roofArea || 0;
  const usableAreaM2 = project.usableAreaM2 || roofAreaM2;

  return (
    <div className="report-wrapper">
      {/* Toolbar (hidden on print) */}
      <div className="report-toolbar no-print">
        <Link
          href={`/projects/${project.id}`}
          className="report-back-link"
        >
          <ArrowLeft size={16} />
          <span>Back to Project</span>
        </Link>

        <div className="report-toolbar-actions">
          <button
            type="button"
            className="report-print-btn"
            onClick={handlePrint}
            aria-label="Print report"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button
            type="button"
            className="report-download-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            aria-label="Save as PDF"
            style={isDownloadingPdf ? { opacity: 0.75, cursor: "wait" } : undefined}
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 size={16} className="report-spin" />
                <span>Downloading PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Save as PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div className="report-document" ref={reportRef} id="solar-report-document">
        {/* Cover Header */}
        <header className="report-header">
          <div className="report-header-brand">
            <div className="report-brand-logo">
              <Sun size={28} />
              <span>SolarScope</span>
            </div>
            <div className="report-brand-tagline">Solar Engineering Platform</div>
          </div>

          <div className="report-header-meta">
            <div className="report-meta-item">
              <span className="report-meta-label">Report Generated</span>
              <span className="report-meta-value">{generatedDate}</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Report Type</span>
              <span className="report-meta-value">Solar Feasibility & Layout Report</span>
            </div>
            {project.layoutFinalized && (
              <div className="report-meta-item">
                <span className="report-meta-label">Layout Finalized</span>
                <span className="report-meta-value report-finalized-date">
                  <FileCheck2 size={12} /> {finalizedDate}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="report-divider" />

        {/* Project Title Section */}
        <section className="report-title-section">
          <div className="report-status-badge" data-status={project.status}>
            {project.status}
          </div>
          <h1 className="report-project-name">{project.name}</h1>
          <div className="report-project-meta">
            <span className="report-project-meta-item">
              <MapPin size={14} /> {project.location}
            </span>
            <span className="report-project-meta-item">
              <Home size={14} /> {project.type} Installation
            </span>
            {typeof project.latitude === "number" && !isNaN(project.latitude) && (
              <span className="report-project-meta-item">
                Coordinates: {project.latitude.toFixed(5)}, {project.longitude?.toFixed(5)}
              </span>
            )}
          </div>
          {project.description && (
            <p className="report-project-description">{project.description}</p>
          )}
        </section>

        {/* Key Metrics Banner */}
        <section className="report-kpi-banner">
          <div className="report-kpi-card report-kpi-card--primary">
            <div className="report-kpi-icon"><Zap size={24} /></div>
            <div className="report-kpi-body">
              <span className="report-kpi-value">{capacityKw > 0 ? `${capacityKw} kWp` : "—"}</span>
              <span className="report-kpi-label">Installed Capacity</span>
            </div>
          </div>

          <div className="report-kpi-card report-kpi-card--energy">
            <div className="report-kpi-icon"><Sun size={24} /></div>
            <div className="report-kpi-body">
              <span className="report-kpi-value">{annualProductionKwh > 0 ? `${annualProductionKwh.toLocaleString()} kWh` : "—"}</span>
              <span className="report-kpi-label">Est. Annual Production</span>
            </div>
          </div>

          <div className="report-kpi-card report-kpi-card--financial">
            <div className="report-kpi-icon"><DollarSign size={24} /></div>
            <div className="report-kpi-body">
              <span className="report-kpi-value">{annualSavingsPKR > 0 ? `PKR ${Math.round(annualSavingsPKR).toLocaleString()}` : "—"}</span>
              <span className="report-kpi-label">Est. Annual Savings</span>
            </div>
          </div>

          <div className="report-kpi-card report-kpi-card--eco">
            <div className="report-kpi-icon"><Leaf size={24} /></div>
            <div className="report-kpi-body">
              <span className="report-kpi-value">{co2OffsetTonsPerYear > 0 ? `${co2OffsetTonsPerYear.toFixed(1)} tons` : "—"}</span>
              <span className="report-kpi-label">CO₂ Offset / Year</span>
            </div>
          </div>

          {project.batteryIncluded && (
            <div className="report-kpi-card report-kpi-card--primary" style={{ borderColor: "rgba(255, 184, 0, 0.4)" }}>
              <div className="report-kpi-icon" style={{ color: "#FFB800" }}><Zap size={24} /></div>
              <div className="report-kpi-body">
                <span className="report-kpi-value">{project.batteryCapacityKwh || 5.12} kWh</span>
                <span className="report-kpi-label">LiFePO4 Battery Storage</span>
              </div>
            </div>
          )}
        </section>

        {/* Section 1: System Design Summary */}
        <section className="report-section">
          <div className="report-section-header">
            <Grid size={18} />
            <h2 className="report-section-title">1. Solar Panel Array Design</h2>
          </div>

          <div className="report-two-col">
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Array Configuration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Panels Placed</td>
                    <td><strong>{totalPanels}</strong></td>
                  </tr>
                  <tr>
                    <td>Valid / Active Panels</td>
                    <td><strong className="report-value--success">{validCount}</strong></td>
                  </tr>
                  <tr>
                    <td>Invalid / Flagged</td>
                    <td>
                      <strong className={totalPanels - validCount > 0 ? "report-value--warning" : ""}>
                        {totalPanels - validCount}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Installed Capacity</td>
                    <td><strong>{capacityKw} kWp</strong></td>
                  </tr>
                  {((summary?.panelCoverageM2 !== undefined) || ((summary as any)?.totalPanelAreaM2 !== undefined)) && (
                    <tr>
                      <td>Total Panel Area</td>
                      <td><strong>{(summary?.panelCoverageM2 ?? (summary as any)?.totalPanelAreaM2 ?? 0).toFixed(1)} m²</strong></td>
                    </tr>
                  )}
                  {roofAreaM2 > 0 && (
                    <tr>
                      <td>Roof Coverage</td>
                      <td><strong>{Math.min(100, Math.round(((summary?.panelCoverageM2 || (summary as any)?.totalPanelAreaM2 || (validCount * (panelSpec ? panelSpec.widthM * panelSpec.heightM : 2))) / roofAreaM2) * 100))}%</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Panel Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  {panelSpec ? (
                    <>
                      <tr>
                        <td>Panel Model</td>
                        <td><strong>{panelSpec.modelName || (panelSpec as any).name || "Standard Monocrystalline"}</strong></td>
                      </tr>
                      <tr>
                        <td>Dimensions</td>
                        <td><strong>{panelSpec.widthM.toFixed(2)}m × {panelSpec.heightM.toFixed(2)}m</strong></td>
                      </tr>
                      <tr>
                        <td>Rated Power</td>
                        <td><strong>{panelSpec.wattageW || (panelSpec as any).wattPeak || 400} Wp</strong></td>
                      </tr>
                      {((panelSpec as any).efficiencyPercent || 21.5) && (
                        <tr>
                          <td>Panel Efficiency</td>
                          <td><strong>{(panelSpec as any).efficiencyPercent || 21.5}%</strong></td>
                        </tr>
                      )}
                      <tr>
                        <td>Panel Area</td>
                        <td><strong>{(panelSpec.widthM * panelSpec.heightM).toFixed(3)} m²</strong></td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={2} className="report-cell--muted">No panel specification saved</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section: Energy Storage System (Battery Bank) */}
        {project.batteryIncluded && (
          <section className="report-section">
            <div className="report-section-header">
              <Zap size={18} />
              <h2 className="report-section-title">Energy Storage System (LiFePO4 Battery Bank)</h2>
            </div>

            <div className="report-two-col">
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Battery Storage Specifications</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Battery Model</td>
                      <td><strong>{project.batteryModel || "LiFePO4 Home Storage"}</strong></td>
                    </tr>
                    <tr>
                      <td>Nominal Storage Capacity</td>
                      <td><strong className="report-value--success">{project.batteryCapacityKwh || 5.12} kWh</strong></td>
                    </tr>
                    <tr>
                      <td>Cell Chemistry</td>
                      <td><strong>Lithium Iron Phosphate (LiFePO4)</strong></td>
                    </tr>
                    <tr>
                      <td>Depth of Discharge (DoD)</td>
                      <td><strong>95%</strong></td>
                    </tr>
                    <tr>
                      <td>Design Cycle Life</td>
                      <td><strong>6,000+ Cycles (15+ Years)</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Backup & Resilience Metrics</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Estimated Outage Duration</td>
                      <td>
                        <strong>
                          {project.batteryCapacityKwh === 3.5 && "~4–6 Hours Essential Backup"}
                          {project.batteryCapacityKwh === 5.12 && "~8–10 Hours Standard Home Backup"}
                          {project.batteryCapacityKwh === 10.24 && "~14–18 Hours Extended Backup"}
                          {project.batteryCapacityKwh === 15.36 && "~24+ Hours Full Independence"}
                          {![3.5, 5.12, 10.24, 15.36].includes(project.batteryCapacityKwh || 0) &&
                            `~${Math.round((project.batteryCapacityKwh || 5.12) * 1.8)} Hours Backup`}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Inverter Coupling</td>
                      <td><strong>Hybrid Solar Inverter (48V / High-Voltage DC)</strong></td>
                    </tr>
                    <tr>
                      <td>Automatic Transfer Switch (ATS)</td>
                      <td><strong>Seamless (&lt;20ms UPS Grade Switching)</strong></td>
                    </tr>
                    <tr>
                      <td>Primary Application</td>
                      <td><strong>Load-Shedding Backup & Night Self-Consumption</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
        <section className="report-section">
          <div className="report-section-header">
            <MapPin size={18} />
            <h2 className="report-section-title">2. Site & Roof Geometry</h2>
          </div>

          <div className="report-two-col">
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Roof Measurements</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Roof Area</td>
                    <td><strong>{roofAreaM2 > 0 ? `${roofAreaM2.toFixed(1)} m²` : "N/A"}</strong></td>
                  </tr>
                  <tr>
                    <td>Usable Solar Area</td>
                    <td><strong>{usableAreaM2 > 0 ? `${usableAreaM2.toFixed(1)} m²` : "N/A"}</strong></td>
                  </tr>
                  <tr>
                    <td>Restricted / Obstruction Area</td>
                    <td><strong>{roofAreaM2 > 0 && usableAreaM2 > 0 ? `${(roofAreaM2 - usableAreaM2).toFixed(1)} m²` : "N/A"}</strong></td>
                  </tr>
                  <tr>
                    <td>Boundary Vertices</td>
                    <td><strong>{project.boundary?.length || 0} points</strong></td>
                  </tr>
                  <tr>
                    <td>Restricted Zones</td>
                    <td><strong>{project.restrictedZones?.length || 0} defined</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Layout Configuration</th>
                  </tr>
                </thead>
                <tbody>
                  {layout?.config ? (
                    <>
                      <tr>
                        <td>Panel Tilt Angle</td>
                        <td><strong>{layout.config.tiltDeg ?? "—"}°</strong></td>
                      </tr>
                      <tr>
                        <td>Azimuth Direction</td>
                        <td><strong>{layout.config.azimuthDeg ?? "—"}°</strong></td>
                      </tr>
                      <tr>
                        <td>Setback Distance</td>
                        <td><strong>{layout.config.setbackM ?? "—"} m</strong></td>
                      </tr>
                      <tr>
                        <td>Row Spacing</td>
                        <td><strong>{layout.config.rowSpacingM ?? "—"} m</strong></td>
                      </tr>
                      <tr>
                        <td>Module Spacing</td>
                        <td><strong>{layout.config.colSpacingM ?? (layout.config as any).moduleSpacingM ?? "—"} m</strong></td>
                      </tr>
                      <tr>
                        <td>Panel Orientation</td>
                        <td><strong>{layout.config.orientation ?? "Portrait"}</strong></td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={2} className="report-cell--muted">No layout configuration saved</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 3: Energy Production Estimates */}
        <section className="report-section">
          <div className="report-section-header">
            <BarChart3 size={18} />
            <h2 className="report-section-title">3. Energy Production Estimates</h2>
          </div>

          <div className="report-info-note">
            <Shield size={14} />
            <span>Estimates based on Pakistan average solar irradiance (1,600–1,800 kWh/kWp/year) and system performance ratio of 0.75.</span>
          </div>

          <div className="report-table-wrapper">
            <table className="report-table report-table--wide">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>System Capacity</td>
                  <td><strong>{capacityKw} kWp</strong></td>
                  <td>From panel layout generation</td>
                </tr>
                <tr>
                  <td>Daily Production (Peak)</td>
                  <td><strong>{capacityKw > 0 ? (capacityKw * 5).toFixed(1) : "—"} kWh</strong></td>
                  <td>Assuming 5 peak sun hours/day</td>
                </tr>
                <tr>
                  <td>Monthly Production (Est.)</td>
                  <td><strong>{capacityKw > 0 ? Math.round(annualProductionKwh / 12).toLocaleString() : "—"} kWh</strong></td>
                  <td>Annual ÷ 12 months</td>
                </tr>
                <tr>
                  <td>Annual Production (Est.)</td>
                  <td><strong>{annualProductionKwh > 0 ? annualProductionKwh.toLocaleString() : "—"} kWh</strong></td>
                  <td>Capacity × 1,600 kWh/kWp</td>
                </tr>
                <tr>
                  <td>25-Year Lifetime Production</td>
                  <td><strong>{capacityKw > 0 ? (annualProductionKwh * 25).toLocaleString() : "—"} kWh</strong></td>
                  <td>With 0.5% annual degradation rate</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Financial Analysis */}
        <section className="report-section">
          <div className="report-section-header">
            <TrendingUp size={18} />
            <h2 className="report-section-title">4. Financial Analysis</h2>
          </div>

          <div className="report-info-note">
            <Shield size={14} />
            <span>Financial projections based on Pakistani electricity tariff (PKR 50/kWh avg), net metering benefits, and current market equipment pricing.</span>
          </div>

          <div className="report-two-col">
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Investment Summary</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>System Cost Estimate</td>
                    <td><strong>PKR {systemCostPKR > 0 ? Math.round(systemCostPKR).toLocaleString() : "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Annual Electricity Savings</td>
                    <td><strong className="report-value--success">PKR {annualSavingsPKR > 0 ? Math.round(annualSavingsPKR).toLocaleString() : "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Simple Payback Period</td>
                    <td><strong>{paybackYears} years</strong></td>
                  </tr>
                  <tr>
                    <td>25-Year Net Savings</td>
                    <td><strong className="report-value--success">PKR {lifetimeSavingsPKR > 0 ? Math.round(lifetimeSavingsPKR - systemCostPKR).toLocaleString() : "—"}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th colSpan={2}>Environmental Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CO₂ Offset per Year</td>
                    <td><strong>{co2OffsetTonsPerYear.toFixed(2)} metric tons</strong></td>
                  </tr>
                  <tr>
                    <td>CO₂ Offset over 25 Years</td>
                    <td><strong>{(co2OffsetTonsPerYear * 25).toFixed(1)} metric tons</strong></td>
                  </tr>
                  <tr>
                    <td>Equivalent Trees Planted</td>
                    <td><strong>{treesEquivalent.toLocaleString()} trees / year</strong></td>
                  </tr>
                  <tr>
                    <td>Carbon Intensity Factor</td>
                    <td>649 gCO₂/kWh (Pakistan grid)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Restricted Zones Summary */}
        {project.restrictedZones && project.restrictedZones.length > 0 && (
          <section className="report-section">
            <div className="report-section-header">
              <Shield size={18} />
              <h2 className="report-section-title">5. Restricted & Obstruction Zones</h2>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table report-table--wide">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Zone Name</th>
                    <th>Category</th>
                    <th>Area (m²)</th>
                    <th>Vertices</th>
                  </tr>
                </thead>
                <tbody>
                  {project.restrictedZones.map((zone, idx) => (
                    <tr key={zone.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{zone.name}</strong></td>
                      <td>{zone.category.replace(/_/g, " ")}</td>
                      <td>{zone.areaM2?.toFixed(1) || "—"}</td>
                      <td>{zone.points.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="report-footer">
          <div className="report-footer-brand">
            <Sun size={16} />
            <span>SolarScope — Solar Engineering Platform</span>
          </div>
          <div className="report-footer-disclaimer">
            <p>
              This report is generated by SolarScope and is provided for feasibility estimation purposes only.
              Actual energy production, financial returns, and system performance may vary based on local weather conditions,
              shading, equipment brand, installation quality, grid tariff changes, and net metering regulations.
              Consult a certified solar engineer before making financial decisions.
            </p>
          </div>
          <div className="report-footer-meta">
            <span>Project ID: {project.id}</span>
            <span>•</span>
            <span>Generated: {generatedDate}</span>
            {project.layoutFinalizedAt && (
              <>
                <span>•</span>
                <span>Finalized: {finalizedDate}</span>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
