"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Mail,
  User,
  Phone,
  MapPin,
  Edit2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import "../../../admin.css";

export default function AdminEditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) {
          setNotFound(true);
          setIsLoaded(true);
          return;
        }
        const data = await res.json();
        const user = data.user;
        if (user) {
          setName(user.name);
          setEmail(user.email);
          setRole(user.role === "Seller" ? "Seller" : "Buyer");
          setStatus(user.status || "Active");
          setPhone(user.phone || "");
          setLocation(user.location || "");
          setIsLoaded(true);
        } else {
          setNotFound(true);
          setIsLoaded(true);
        }
      } catch {
        setNotFound(true);
        setIsLoaded(true);
      }
    }
    loadUser();
  }, [userId]);

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

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          status,
          phone: phone.trim() || undefined,
          password: password.trim() ? password.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || "Failed to update user.");
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err?.message || "Failed to update user in database. Try again.");
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${name}" (${userId})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json();
        alert(result.message || "Failed to delete user.");
        return;
      }
      router.push("/admin");
    } catch {
      alert("Failed to delete user from database.");
    }
  }

  if (!isLoaded) {
    return (
      <div className="admin-page-container">
        <p className="admin-loading-text">Loading user account details from database...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-page-container">
        <div className="admin-not-found-card">
          <h2>User Account Not Found</h2>
          <p>No account matches the identifier &ldquo;{userId}&rdquo; in PostgreSQL.</p>
          <Link href="/admin" className="admin-btn-secondary">
            Return to Admin Workspace
          </Link>
        </div>
      </div>
    );
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
        <span className="admin-breadcrumb-current">{name}</span>
      </nav>

      {/* Header */}
      <header className="admin-subpage-header">
        <div className="admin-subpage-heading">
          <div className="admin-tag-pill">
            <Edit2 size={14} />
            <span>EDIT USER ACCOUNT</span>
          </div>
          <h1>Edit Platform Account</h1>
          <p>Update role permissions, account status, and credentials in PostgreSQL.</p>
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
            <h2 className="admin-form-section-title">Account Information ({userId})</h2>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label htmlFor="user-name">Full Name <span className="admin-required">*</span></label>
                <div className="admin-input-wrap">
                  <User size={16} className="admin-field-icon" />
                  <input
                    id="user-name"
                    type="text"
                    required
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-password">New Password <span className="admin-optional">(leave blank to keep current)</span></label>
                <div className="admin-input-wrap">
                  <Lock size={16} className="admin-field-icon" />
                  <input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password to reset"
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
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
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
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="user-phone">Phone Number <span className="admin-optional">(optional)</span></label>
                <div className="admin-input-wrap">
                  <Phone size={16} className="admin-field-icon" />
                  <input
                    id="user-phone"
                    type="text"
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
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-form-actions-split">
            <button
              type="button"
              onClick={handleDelete}
              className="admin-btn-danger"
            >
              <Trash2 size={16} />
              <span>Delete User</span>
            </button>

            <div className="admin-form-actions-right">
              <Link href="/admin" className="admin-btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn-primary"
              >
                <CheckCircle2 size={17} />
                <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
