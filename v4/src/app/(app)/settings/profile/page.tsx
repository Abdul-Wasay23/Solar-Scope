"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Briefcase,
  Sliders,
  Shield,
  ShieldCheck,
  Zap,
  Sun,
  Layers,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Globe,
  FileCheck2,
  Compass,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/context/ProjectsContext";
import "./profile.css";

type TabKey = "IDENTITY" | "SOLAR_DEFAULTS" | "SECURITY";

export default function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { projects } = useProjects();

  const [activeTab, setActiveTab] = useState<TabKey>("IDENTITY");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields State
  const [fullName, setFullName] = useState(user?.fullName || "Abdul Wasay");
  const [email, setEmail] = useState(user?.email || "wasay@solarscope.pk");
  const [phone, setPhone] = useState(user?.phone || "+92 300 1234567");
  const [company, setCompany] = useState(user?.company || "SolarScope Engineering Solutions");
  const [city, setCity] = useState(user?.city || "Karachi, Pakistan");
  const [title, setTitle] = useState(user?.title || "Senior PV Systems Designer");
  const [role, setRole] = useState(user?.role || "BUYER");

  // Solar Engineering Defaults State
  const [defaultPanelWattage, setDefaultPanelWattage] = useState("540");
  const [defaultTilt, setDefaultTilt] = useState(user?.defaultTilt?.toString() || "26");
  const [defaultSetback, setDefaultSetback] = useState("0.5");
  const [defaultTariff, setDefaultTariff] = useState(user?.defaultTariffPkr?.toString() || "50");
  const [gridDiscom, setGridDiscom] = useState("K-Electric (Karachi 50Hz)");

  // Preferences Toggles
  const [autoSave3D, setAutoSave3D] = useState(true);
  const [includeNepra, setIncludeNepra] = useState(true);

  // Sync state if user changes in context
  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      if (user.company) setCompany(user.company);
      if (user.city) setCity(user.city);
      if (user.title) setTitle(user.title);
      if (user.role) setRole(user.role);
      if (user.defaultTilt) setDefaultTilt(user.defaultTilt.toString());
      if (user.defaultTariffPkr) setDefaultTariff(user.defaultTariffPkr.toString());
    }
  }, [user]);

  // Compute live user stats from real projects
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED" || p.layoutFinalized).length;
  const totalCapacityKw = Math.round(
    projects.reduce((acc, p) => acc + (p.panelLayout?.summary?.installedCapacityKw || p.systemCapacityKw || 0), 0) * 10
  ) / 10;

  // Get initials for avatar
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SW";

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      city: city.trim(),
      title: title.trim(),
      role: role as any,
      defaultTilt: parseFloat(defaultTilt) || 26,
      defaultTariffPkr: parseFloat(defaultTariff) || 50,
    });

    setTimeout(() => {
      setIsSaving(false);
      setToastMessage("🎉 Profile & engineering preferences saved successfully!");
      setTimeout(() => setToastMessage(null), 3500);
    }, 400);
  };

  return (
    <div className="vip-profile-page">
      {/* 1. VIP Profile Hero Header */}
      <section className="vip-profile-hero">
        <div className="vip-profile-hero-left">
          <div className="vip-profile-avatar-wrap">
            <div className="vip-profile-avatar">
              {initials}
            </div>
            <div className="vip-profile-avatar-badge" title="Certified Solar Designer">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="vip-profile-meta">
            <div className="vip-profile-name-row">
              <h1 className="vip-profile-name">{fullName}</h1>
              <span className="vip-profile-role-pill">
                <Sun size={12} />
                <span>Certified PV Designer</span>
              </span>
            </div>

            <p className="vip-profile-title-text">
              {title} • {company}
            </p>

            <div className="vip-profile-contact-row">
              <span className="vip-profile-contact-item">
                <Mail size={13} />
                <span>{email}</span>
              </span>
              <span className="vip-profile-contact-item">
                <MapPin size={13} />
                <span>{city}</span>
              </span>
              <span className="vip-profile-contact-item">
                <Phone size={13} />
                <span>{phone}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="vip-profile-hero-stats">
          <div className="vip-profile-stat-item">
            <span className="vip-profile-stat-num">{totalProjects}</span>
            <span className="vip-profile-stat-lbl">Sites Created</span>
          </div>
          <div className="vip-profile-stat-divider" />
          <div className="vip-profile-stat-item">
            <span className="vip-profile-stat-num">{completedProjects}</span>
            <span className="vip-profile-stat-lbl">Finalized</span>
          </div>
          <div className="vip-profile-stat-divider" />
          <div className="vip-profile-stat-item">
            <span className="vip-profile-stat-num">{totalCapacityKw} kWp</span>
            <span className="vip-profile-stat-lbl">Designed</span>
          </div>
        </div>
      </section>

      {/* 2. Navigation Tabs */}
      <nav className="vip-profile-tabs" aria-label="Profile navigation sections">
        <button
          type="button"
          className={`vip-tab-btn ${activeTab === "IDENTITY" ? "is-active" : ""}`}
          onClick={() => setActiveTab("IDENTITY")}
        >
          <User size={16} />
          <span>Professional Identity</span>
        </button>

        <button
          type="button"
          className={`vip-tab-btn ${activeTab === "SOLAR_DEFAULTS" ? "is-active" : ""}`}
          onClick={() => setActiveTab("SOLAR_DEFAULTS")}
        >
          <Zap size={16} />
          <span>Solar Workspace Defaults</span>
        </button>

        <button
          type="button"
          className={`vip-tab-btn ${activeTab === "SECURITY" ? "is-active" : ""}`}
          onClick={() => setActiveTab("SECURITY")}
        >
          <Shield size={16} />
          <span>Security & System Preferences</span>
        </button>
      </nav>

      {/* 3. Settings Forms */}
      <form onSubmit={handleSaveProfile} className="vip-settings-card">
        {/* Tab 1: Professional Identity */}
        {activeTab === "IDENTITY" && (
          <>
            <div className="vip-settings-section-head">
              <div className="vip-settings-title-wrap">
                <div className="vip-settings-icon">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="vip-settings-title">Personal & Professional Identity</h2>
                  <p className="vip-settings-desc">
                    These credentials appear on your exported solar engineering PDF reports and project summaries.
                  </p>
                </div>
              </div>
            </div>

            <div className="vip-form-grid">
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <User size={14} /> Full Name
                </label>
                <input
                  type="text"
                  className="vip-form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abdul Wasay"
                  required
                />
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  className="vip-form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. wasay@solarscope.pk"
                  required
                />
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Phone size={14} /> Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  className="vip-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                />
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Building size={14} /> Engineering Firm / Organization
                </label>
                <input
                  type="text"
                  className="vip-form-input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. SolarScope Technologies"
                />
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Briefcase size={14} /> Professional Role / Title
                </label>
                <input
                  type="text"
                  className="vip-form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Solar Design Engineer"
                />
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <MapPin size={14} /> Base City & Country
                </label>
                <input
                  type="text"
                  className="vip-form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Karachi, Pakistan"
                />
              </div>

              <div className="vip-form-group vip-form-grid--full">
                <label className="vip-form-label">
                  <Sliders size={14} /> Workspace Access Role
                </label>
                <select
                  className="vip-form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="BUYER">Solar PV Client / Property Owner</option>
                  <option value="SERVICE_PROVIDER">Solar EPC Engineer / System Installer</option>
                  <option value="SELLER">Solar Hardware Vendor / Equipment Supplier</option>
                  <option value="ADMIN">Lead System Administrator</option>
                </select>
                <span className="vip-form-hint">
                  Controls permissions for layout editing, equipment specification overrides, and client report delivery.
                </span>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Solar Workspace Defaults */}
        {activeTab === "SOLAR_DEFAULTS" && (
          <>
            <div className="vip-settings-section-head">
              <div className="vip-settings-title-wrap">
                <div className="vip-settings-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#D97706" }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="vip-settings-title">Spatial Layout & Engineering Defaults</h2>
                  <p className="vip-settings-desc">
                    These default parameters are pre-populated whenever you create or simulate a new solar rooftop project.
                  </p>
                </div>
              </div>
            </div>

            <div className="vip-form-grid">
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Zap size={14} /> Default Module Rating
                </label>
                <select
                  className="vip-form-select"
                  value={defaultPanelWattage}
                  onChange={(e) => setDefaultPanelWattage(e.target.value)}
                >
                  <option value="400">400W Monocrystalline (1.05m × 1.75m)</option>
                  <option value="540">540W Tier-1 Bifacial PV (1.13m × 2.28m) — Recommended</option>
                  <option value="650">650W Commercial Utility PV (1.30m × 2.40m)</option>
                </select>
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Compass size={14} /> Default Surface Tilt Angle (Degrees)
                </label>
                <input
                  type="number"
                  className="vip-form-input"
                  min="0"
                  max="60"
                  value={defaultTilt}
                  onChange={(e) => setDefaultTilt(e.target.value)}
                  placeholder="26"
                />
                <span className="vip-form-hint">Optimal tilt for Pakistan ranges between 24° and 28° Facing South (180°).</span>
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Layers size={14} /> Boundary Perimeter Setback Walkway
                </label>
                <select
                  className="vip-form-select"
                  value={defaultSetback}
                  onChange={(e) => setDefaultSetback(e.target.value)}
                >
                  <option value="0.3">0.3 meters (~1.0 ft clearance)</option>
                  <option value="0.5">0.5 meters (~1.6 ft walkway) — Standard</option>
                  <option value="0.8">0.8 meters (~2.6 ft maintenance corridor)</option>
                  <option value="1.0">1.0 meters (~3.3 ft strict safety setback)</option>
                </select>
              </div>

              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Globe size={14} /> Electricity Tariff Basis (PKR / kWh)
                </label>
                <input
                  type="number"
                  className="vip-form-input"
                  min="10"
                  max="120"
                  value={defaultTariff}
                  onChange={(e) => setDefaultTariff(e.target.value)}
                  placeholder="50"
                />
                <span className="vip-form-hint">Used to calculate projected utility bill savings on the dashboard and PDF reports.</span>
              </div>

              <div className="vip-form-group vip-form-grid--full">
                <label className="vip-form-label">
                  <Building size={14} /> Target Electricity Distribution Company (DISCO)
                </label>
                <select
                  className="vip-form-select"
                  value={gridDiscom}
                  onChange={(e) => setGridDiscom(e.target.value)}
                >
                  <option value="K-Electric (Karachi 50Hz)">K-Electric (Karachi Division)</option>
                  <option value="LESCO (Lahore Electric Supply)">LESCO (Lahore & Surrounding)</option>
                  <option value="IESCO (Islamabad Electric Supply)">IESCO (Islamabad / Rawalpindi)</option>
                  <option value="MEPCO (Multan Electric Power)">MEPCO (South Punjab)</option>
                  <option value="HESCO / SEPCO (Sindh Rural)">HESCO / SEPCO (Hyderabad / Sukkur)</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Tab 3: Security & Preferences */}
        {activeTab === "SECURITY" && (
          <>
            <div className="vip-settings-section-head">
              <div className="vip-settings-title-wrap">
                <div className="vip-settings-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981" }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="vip-settings-title">Security & System Preferences</h2>
                  <p className="vip-settings-desc">
                    Manage session security, workspace automation, and regulatory disclosures.
                  </p>
                </div>
              </div>
            </div>

            <div className="vip-session-box">
              <div className="vip-session-left">
                <div className="vip-session-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="vip-session-title">Current Workspace Session Active</div>
                  <div className="vip-session-sub">
                    Encrypted client session • Windows Browser Environment • NEPRA Compliance Ready
                  </div>
                </div>
              </div>
              <span className="vip-profile-role-pill" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                Verified Session
              </span>
            </div>

            <div className="vip-toggle-row">
              <div className="vip-toggle-info">
                <span className="vip-toggle-title">Automated Layout State Persistence</span>
                <span className="vip-toggle-desc">
                  Automatically preserve boundary polygons and placed PV modules to localStorage while simulating in 3D.
                </span>
              </div>
              <label className="vip-switch">
                <input
                  type="checkbox"
                  checked={autoSave3D}
                  onChange={(e) => setAutoSave3D(e.target.checked)}
                />
                <span className="vip-slider" />
              </label>
            </div>

            <div className="vip-toggle-row">
              <div className="vip-toggle-info">
                <span className="vip-toggle-title">Include NEPRA Net-Metering Disclosures in PDF Reports</span>
                <span className="vip-toggle-desc">
                  Attaches statutory net-metering technical guidelines, inverter specifications, and grid safety clauses in exports.
                </span>
              </div>
              <label className="vip-switch">
                <input
                  type="checkbox"
                  checked={includeNepra}
                  onChange={(e) => setIncludeNepra(e.target.checked)}
                />
                <span className="vip-slider" />
              </label>
            </div>
          </>
        )}

        {/* Action Footer */}
        <div className="vip-form-footer">
          <button
            type="submit"
            className="vip-btn-save"
            disabled={isSaving}
            id="btn-save-profile"
          >
            {isSaving ? (
              <>
                <Zap size={16} className="report-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="vip-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} style={{ color: "#10B981" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
