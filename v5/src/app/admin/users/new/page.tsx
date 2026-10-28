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
} from "lucide-react";
import {
  getStoredAdminUsers,
  saveStoredAdminUsers,
  type AdminUser,
} from "@/lib/admin/adminStorage";
import "../../admin.css";

export default function AdminNewUserPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("Buyer");
  const [status, setStatus] = useState<AdminUser["status"]>("Active");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
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

    setIsSubmitting(true);
    try {
      const current = getStoredAdminUsers();
      const newUser: AdminUser = {
        id: `SS-${1050 + current.length}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        status,
        joined: "Just now",
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
      };

      saveStoredAdminUsers([newUser, ...current]);
      router.push("/admin");
    } catch {
      setError("Failed to create user account. Try again.");
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
          <p>Register a buyer, verified solar seller, or platform administrator account.</p>
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
                <label htmlFor="user-role">Platform Role <span className="admin-required">*</span></label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                  className="admin-select"
                >
                  <option value="Buyer">Buyer (Solar consumer / Project planner)</option>
                  <option value="Seller">Seller (Vendor / Hardware / Installer)</option>
                  <option value="Admin">Administrator (Full platform permissions)</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-status">Account Status</label>
                <select
                  id="user-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
                  className="admin-select"
                >
                  <option value="Active">Active (Immediate full access)</option>
                  <option value="Pending">Pending (Requires identity / business verification)</option>
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
              <span>{isSubmitting ? "Creating..." : "Create Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
