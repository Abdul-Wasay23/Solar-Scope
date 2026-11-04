"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  User,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import "../../admin.css";

export default function AdminNewUserPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Buyer" | "Seller">("Buyer");
  const [status, setStatus] = useState<"Active" | "Pending" | "Suspended">("Active");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide a user full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!password || password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          status,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to create user in database.");
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err?.message || "Failed to create user account. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-page-container">
      {/* Navigation Breadcrumb */}
      <nav className="admin-breadcrumb-bar" aria-label="Breadcrumb">
        <Link href="/admin" className="admin-back-link">
          <ArrowLeft size={16} />
          <span>Back to Admin Workspace</span>
        </Link>
        <span className="admin-breadcrumb-sep">/</span>
        <span className="admin-breadcrumb-muted">Users</span>
        <span className="admin-breadcrumb-sep">/</span>
        <span className="admin-breadcrumb-current">Add New User</span>
      </nav>

      {/* Header */}
      <header className="admin-subpage-header">
        <div className="admin-subpage-heading">
          <div className="admin-tag-pill">
            <ShieldCheck size={14} />
            <span>USER ACCESS MANAGEMENT</span>
          </div>
          <h1>Create Platform Account</h1>
          <p>Register a buyer or verified solar seller directly in PostgreSQL database.</p>
        </div>
      </header>

      {/* Form Card */}
      <div className="admin-form-card">
        <form onSubmit={handleSubmit} className="admin-form">
          {error && (
            <div className="admin-alert-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="admin-form-section">
            <h2 className="admin-form-section-title">Account Information</h2>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="user-name">Full Name <span className="admin-required">*</span></label>
                <div className="admin-input-wrap">
                  <User size={16} className="admin-field-icon" />
                  <input
                    id="user-name"
                    type="text"
                    required
                    placeholder="e.g. Asad Siddiqui"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-email">Email Address <span className="admin-required">*</span></label>
                <div className="admin-input-wrap">
                  <Mail size={16} className="admin-field-icon" />
                  <input
                    id="user-email"
                    type="email"
                    required
                    placeholder="e.g. asad@solardomain.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-password">Account Password <span className="admin-required">*</span></label>
                <div className="admin-input-wrap">
                  <Lock size={16} className="admin-field-icon" />
                  <input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password for login (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin-input with-icon"
                  />
                  <button
                    type="button"
                    className="admin-settings-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-role">Platform Role <span className="admin-required">*</span></label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "Buyer" | "Seller")}
                  className="admin-select"
                >
                  <option value="Buyer">Buyer (Solar consumer / Project planner)</option>
                  <option value="Seller">Seller (Vendor / Hardware / Installer)</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-status">Account Status</label>
                <select
                  id="user-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Active" | "Pending" | "Suspended")}
                  className="admin-select"
                >
                  <option value="Active">Active (Immediate full access)</option>
                  <option value="Pending">Pending (Requires verification)</option>
                  <option value="Suspended">Suspended (Restricted access)</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-phone">Phone Number <span className="admin-optional">(optional)</span></label>
                <div className="admin-input-wrap">
                  <Phone size={16} className="admin-field-icon" />
                  <input
                    id="user-phone"
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-location">City / Region <span className="admin-optional">(optional)</span></label>
                <div className="admin-input-wrap">
                  <MapPin size={16} className="admin-field-icon" />
                  <input
                    id="user-location"
                    type="text"
                    placeholder="e.g. Lahore, Pakistan"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-form-actions">
            <Link href="/admin" className="admin-btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-primary"
            >
              <CheckCircle2 size={17} />
              <span>{isSubmitting ? "Creating in Database..." : "Create Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
