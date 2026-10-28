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
} from "lucide-react";
import {
  getStoredAdminUsers,
  saveStoredAdminUsers,
  type AdminUser,
} from "@/lib/admin/adminStorage";
import "../../../admin.css";

export default function AdminEditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("Buyer");
  const [status, setStatus] = useState<AdminUser["status"]>("Active");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const users = getStoredAdminUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
      setPhone(user.phone || "");
      setLocation(user.location || "");
      setIsLoaded(true);
    } else {
      setNotFound(true);
      setIsLoaded(true);
    }
  }, [userId]);

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
      const users = getStoredAdminUsers();
      const nextUsers = users.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            status,
            phone: phone.trim() || undefined,
            location: location.trim() || undefined,
          };
        }
        return u;
      });

      saveStoredAdminUsers(nextUsers);
      router.push("/admin");
    } catch {
      setError("Failed to update user. Try again.");
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete user account "${name}" (${userId})?`)) {
      return;
    }

    const users = getStoredAdminUsers();
    const filtered = users.filter((u) => u.id !== userId);
    saveStoredAdminUsers(filtered);
    router.push("/admin");
  }

  if (!isLoaded) {
    return (
      <div className="admin-page-container">
        <p className="admin-loading-text">Loading user account details...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-page-container">
        <div className="admin-not-found-card">
          <h2>User Account Not Found</h2>
          <p>No user account was found with the ID: {userId}</p>
          <Link href="/admin" className="admin-btn-primary">
            <ArrowLeft size={16} /> Return to Admin Workspace
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
        <span className="admin-breadcrumb-muted">{name}</span>
        <span className="admin-breadcrumb-sep">/</span>
        <span className="admin-breadcrumb-current">Edit Account</span>
      </nav>

      {/* Header */}
      <header className="admin-subpage-header">
        <div className="admin-subpage-heading">
          <div className="admin-tag-pill">
            <Edit2 size={14} />
            <span>ACCOUNT ID: {userId}</span>
          </div>
          <h1>Edit Platform Account</h1>
          <p>Modify role privileges, verification status, and profile records.</p>
        </div>

        <div className="admin-subpage-header-actions">
          <button
            type="button"
            onClick={handleDelete}
            className="admin-btn-danger"
            title="Permanently remove account"
          >
            <Trash2 size={16} />
            <span>Delete User</span>
          </button>
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
                <label htmlFor="user-role">Platform Role <span className="admin-required">*</span></label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                  className="admin-select"
                >
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
                  <option value="Admin">Administrator</option>
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
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
