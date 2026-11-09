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
import PhoneInput, { parsePhoneNumber } from "@/components/ui/PhoneInput";
import LocationAutocomplete from "@/components/projects/LocationAutocomplete";
import type { SelectedLocationData } from "@/components/projects/LocationAutocomplete";
import "./profile.css";

type TabKey = "IDENTITY" | "SOLAR_DEFAULTS" | "SECURITY";

export default function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { projects } = useProjects();

  const totalProjects = projects?.length ?? 4;
  const completedProjects = projects?.filter((p) => p.status === "COMPLETED")?.length ?? 2;
  const totalCapacityKw = projects?.reduce((acc, p) => acc + (p.systemCapacityKw || 0), 0) ?? 48;

  const [activeTab, setActiveTab] = useState<TabKey>("IDENTITY");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Form Fields State
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [company, setCompany] = useState(user?.company || "SolarScope Engineering Solutions");
  const [city, setCity] = useState(user?.city || "Karachi, Pakistan");
  const [isCityValidSelection, setIsCityValidSelection] = useState(true);
  const [title, setTitle] = useState(user?.title || "Senior PV Systems Designer");

  // Validation Errors State
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    city?: string;
    defaultTilt?: string;
    defaultTariff?: string;
  }>({});

  const initials = (fullName || user?.fullName || "PV")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "PV";

  // Solar Engineering Defaults State
  const [defaultPanelWattage, setDefaultPanelWattage] = useState("540");
  const [defaultTilt, setDefaultTilt] = useState(user?.defaultTilt?.toString() || "26");
  const [defaultSetback, setDefaultSetback] = useState("0.5");
  const [defaultTariff, setDefaultTariff] = useState(user?.defaultTariffPkr?.toString() || "50");
  const [gridDiscom, setGridDiscom] = useState("K-Electric (Karachi 50Hz)");

  // Preferences Toggles
  const [autoSave3D, setAutoSave3D] = useState(true);
  const [includeNepra, setIncludeNepra] = useState(true);

  // Fetch real profile from PostgreSQL on mount / user change
  useEffect(() => {
    const identifier = user?.id
      ? `userId=${encodeURIComponent(user.id)}`
      : user?.email
        ? `email=${encodeURIComponent(user.email)}`
        : null;

    if (!identifier) {
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    fetch(`/api/user/profile?${identifier}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const u = data.user;
          setFullName(u.fullName || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setCompany(u.company || "SolarScope Engineering Solutions");
          setCity(u.city || "Karachi, Pakistan");
          setIsCityValidSelection(true);
          setTitle(u.title || "Senior PV Systems Designer");
          updateProfile({
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            company: u.company,
            city: u.city,
            title: u.title,
          });
        }
      })
      .catch((err) => console.error("Failed to load DB profile:", err))
      .finally(() => setIsLoadingProfile(false));
  }, [user?.id, user?.email]);

  // Validation function
  const validateForm = (): boolean => {
    const errs: typeof fieldErrors = {};

    // 1. Full Name Validation: letters, spaces, dots, hyphens only
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errs.fullName = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errs.fullName = "Full name must be at least 2 characters.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      errs.fullName = "Full name must contain only letters and spaces.";
    }

    // 2. Email Validation: strict standard email pattern
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. name@domain.com).";
    }

    // 3. Phone Validation: verify country digits fit exactly
    if (phone.trim()) {
      const parsedPhone = parsePhoneNumber(phone);
      if (parsedPhone.localDigits.length !== parsedPhone.country.digitCount) {
        errs.phone = `Phone number must be exactly ${parsedPhone.country.digitCount} digits for ${parsedPhone.country.name} (currently ${parsedPhone.localDigits.length}).`;
      }
    }

    // 4. Organization Validation
    if (company.trim() && company.trim().length < 2) {
      errs.company = "Organization name must be at least 2 characters.";
    }

    // 5. Title Validation
    if (title.trim() && title.trim().length < 2) {
      errs.title = "Professional role / title must be at least 2 characters.";
    }

    // 6. City Validation - Must be verified real geographical location from suggestions
    if (!city.trim()) {
      errs.city = "Base city and country is required.";
    } else if (city.trim().length < 3) {
      errs.city = "Base city and country must be at least 3 characters.";
    } else if (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(city.trim())) {
      errs.city = "Invalid location. Please select a real geographical city from the suggestions.";
    } else if (!isCityValidSelection) {
      errs.city = "Please select a valid geographical location from the suggestions dropdown.";
    }

    // 7. Surface Tilt Angle Validation
    const tiltNum = parseInt(defaultTilt, 10);
    if (isNaN(tiltNum) || tiltNum < 0 || tiltNum > 90) {
      errs.defaultTilt = "Tilt angle must be a valid number between 0° and 90°.";
    }

    // 8. Electricity Tariff Validation
    const tariffNum = parseFloat(defaultTariff);
    if (isNaN(tariffNum) || tariffNum <= 0) {
      errs.defaultTariff = "Tariff must be a positive number greater than 0 PKR / kWh.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToastMessage("❌ Please fix the highlighted errors before saving.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          email: email.trim(),
          fullName: fullName.trim(),
          phone: phone.trim(),
          company: company.trim(),
          city: city.trim(),
          title: title.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update profile in database.");
      }

      const result = await res.json();
      const updatedUser = result.user;

      // Refresh displayed state from database response
      setFullName(updatedUser.fullName);
      setEmail(updatedUser.email);
      setPhone(updatedUser.phone);
      setCompany(updatedUser.company);
      setCity(updatedUser.city);
      setTitle(updatedUser.title);

      // Persist to AuthContext and local cache
      updateProfile({
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        company: updatedUser.company,
        city: updatedUser.city,
        title: updatedUser.title,
        defaultTilt: parseFloat(defaultTilt) || 26,
        defaultTariffPkr: parseFloat(defaultTariff) || 50,
      });

      setFieldErrors({});
      setToastMessage("🎉 Profile updated and saved to database successfully!");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage(`❌ ${err.message || "Could not save profile"}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
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
              {/* Full Name Field */}
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <User size={14} /> Full Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className={`vip-form-input ${fieldErrors.fullName ? "has-error" : ""}`}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="e.g. Abdul Wasay"
                  maxLength={60}
                  required
                />
                {fieldErrors.fullName && (
                  <span className="vip-field-error-text">{fieldErrors.fullName}</span>
                )}
              </div>

              {/* Email Address Field */}
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Mail size={14} /> Email Address <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="email"
                  className={`vip-form-input ${fieldErrors.email ? "has-error" : ""}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. wasay@solarscope.pk"
                  maxLength={80}
                  required
                />
                {fieldErrors.email && (
                  <span className="vip-field-error-text">{fieldErrors.email}</span>
                )}
              </div>

              {/* Contact Phone with Country Code Selector & Digit Limitation */}
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Phone size={14} /> Contact Phone / WhatsApp
                </label>
                <PhoneInput
                  id="profile-phone-input"
                  value={phone}
                  onChange={(val, isValid) => {
                    setPhone(val);
                    if (fieldErrors.phone && isValid) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  hasError={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone && (
                  <span className="vip-field-error-text">{fieldErrors.phone}</span>
                )}
              </div>

              {/* Engineering Firm / Organization Field */}
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Building size={14} /> Engineering Firm / Organization
                </label>
                <input
                  type="text"
                  className={`vip-form-input ${fieldErrors.company ? "has-error" : ""}`}
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    if (fieldErrors.company) setFieldErrors((prev) => ({ ...prev, company: undefined }));
                  }}
                  placeholder="e.g. SolarScope Technologies"
                  maxLength={100}
                />
                {fieldErrors.company && (
                  <span className="vip-field-error-text">{fieldErrors.company}</span>
                )}
              </div>

              {/* Professional Role / Title Field */}
              <div className="vip-form-group">
                <label className="vip-form-label">
                  <Briefcase size={14} /> Professional Role / Title
                </label>
                <input
                  type="text"
                  className={`vip-form-input ${fieldErrors.title ? "has-error" : ""}`}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="e.g. Senior Solar Design Engineer"
                  maxLength={80}
                />
                {fieldErrors.title && (
                  <span className="vip-field-error-text">{fieldErrors.title}</span>
                )}
              </div>

              {/* Base City & Country Field with Real-World Places Autocomplete */}
              <div className="vip-form-group">
                <LocationAutocomplete
                  id="profile-city-autocomplete"
                  label="Base City & Country"
                  placeholder="Search city, area, or country (e.g. Karachi, Lahore, Islamabad)..."
                  value={city}
                  onChange={(val) => {
                    setCity(val);
                    setIsCityValidSelection(false);
                    if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                  onSelectLocation={(data) => {
                    // Extract city & country or clean display name
                    const formatted = data.city && data.country 
                      ? `${data.city}, ${data.country}`
                      : data.displayName;
                    setCity(formatted);
                    setIsCityValidSelection(true);
                    if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                  onClear={() => {
                    setCity("");
                    setIsCityValidSelection(false);
                  }}
                  error={fieldErrors.city}
                  required
                />
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
                  inputMode="numeric"
                  className={`vip-form-input ${fieldErrors.defaultTilt ? "has-error" : ""}`}
                  min="0"
                  max="90"
                  value={defaultTilt}
                  onKeyDown={(e) => {
                    if (["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter"].includes(e.key) || e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");
                    setDefaultTilt(cleaned);
                    if (fieldErrors.defaultTilt) setFieldErrors((prev) => ({ ...prev, defaultTilt: undefined }));
                  }}
                  placeholder="26"
                />
                {fieldErrors.defaultTilt ? (
                  <span className="vip-field-error-text">{fieldErrors.defaultTilt}</span>
                ) : (
                  <span className="vip-form-hint">Optimal tilt for Pakistan ranges between 24° and 28° Facing South (180°).</span>
                )}
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
                  inputMode="decimal"
                  className={`vip-form-input ${fieldErrors.defaultTariff ? "has-error" : ""}`}
                  min="1"
                  max="200"
                  step="any"
                  value={defaultTariff}
                  onKeyDown={(e) => {
                    if (["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter"].includes(e.key) || e.ctrlKey || e.metaKey) return;
                    if (e.key === "." && !e.currentTarget.value.includes(".")) return;
                    if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
                    setDefaultTariff(cleaned);
                    if (fieldErrors.defaultTariff) setFieldErrors((prev) => ({ ...prev, defaultTariff: undefined }));
                  }}
                  placeholder="50"
                />
                {fieldErrors.defaultTariff ? (
                  <span className="vip-field-error-text">{fieldErrors.defaultTariff}</span>
                ) : (
                  <span className="vip-form-hint">Used to calculate projected utility bill savings on the dashboard and PDF reports.</span>
                )}
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
