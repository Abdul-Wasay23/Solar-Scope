"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Tag,
  DollarSign,
  User,
  Edit2,
} from "lucide-react";
import {
  getStoredAdminListings,
  saveStoredAdminListings,
  type AdminListing,
} from "@/lib/admin/adminStorage";
import "../../../admin.css";

export default function AdminEditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.id as string;

  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [type, setType] = useState<AdminListing["type"]>("Product");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<AdminListing["status"]>("Active");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const listings = getStoredAdminListings();
    const listing = listings.find((l) => l.id === listingId);
    if (listing) {
      setName(listing.name);
      setOwner(listing.owner);
      setType(listing.type);
      setCategory(listing.category || "");
      setPrice(listing.price || "");
      setStatus(listing.status);
      setIsLoaded(true);
    } else {
      setNotFound(true);
      setIsLoaded(true);
    }
  }, [listingId]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide a listing title.");
      return;
    }

    if (!owner.trim()) {
      setError("Please provide an owner / seller name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const listings = getStoredAdminListings();
      const updatedListings = listings.map((l) => {
        if (l.id === listingId) {
          return {
            ...l,
            name: name.trim(),
            owner: owner.trim(),
            type,
            category: category.trim() || undefined,
            price: price.trim() || undefined,
            status,
          };
        }
        return l;
      });

      saveStoredAdminListings(updatedListings);
      router.push("/admin");
    } catch {
      setError("Failed to update listing. Try again.");
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!window.confirm(`Are you sure you want to remove listing "${name}" (${listingId})?`)) {
      return;
    }

    const listings = getStoredAdminListings();
    const filtered = listings.filter((l) => l.id !== listingId);
    saveStoredAdminListings(filtered);
    router.push("/admin");
  }

  if (!isLoaded) {
    return (
      <div className="admin-page-container">
        <p className="admin-loading-text">Loading listing details...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="admin-page-container">
        <div className="admin-not-found-card">
          <h2>Marketplace Listing Not Found</h2>
          <p>No listing was found with the ID: {listingId}</p>
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
        <span className="admin-breadcrumb-muted">Marketplace</span>
        <span className="admin-breadcrumb-sep">/</span>
        <span className="admin-breadcrumb-current">Edit Listing</span>
      </nav>

      {/* Header */}
      <header className="admin-subpage-header">
        <div className="admin-subpage-heading">
          <div className="admin-tag-pill">
            <Edit2 size={14} />
            <span>LISTING ID: {listingId}</span>
          </div>
          <h1>Moderate Marketplace Listing</h1>
          <p>Review compliance, edit listing metadata, change approval status or remove listing.</p>
        </div>

        <div className="admin-subpage-header-actions">
          <button
            type="button"
            onClick={handleDelete}
            className="admin-btn-danger"
            title="Remove listing from platform"
          >
            <Trash2 size={16} />
            <span>Delete Listing</span>
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
            <h2 className="admin-form-section-title">Listing Specifications</h2>
            <div className="admin-form-grid">
              <div className="admin-form-field admin-form-field--full">
                <label htmlFor="listing-name">Listing Title <span className="admin-required">*</span></label>
                <input
                  id="listing-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-field">
                <label htmlFor="listing-owner">Seller / Merchant Name <span className="admin-required">*</span></label>
                <div className="admin-input-wrap">
                  <User size={16} className="admin-field-icon" />
                  <input
                    id="listing-owner"
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="listing-type">Offering Classification</label>
                <select
                  id="listing-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AdminListing["type"])}
                  className="admin-select"
                >
                  <option value="Product">Product (Solar Hardware / Equipment)</option>
                  <option value="Service">Service (Installation / Maintenance / Audit)</option>
                </select>
              </div>

              <div className="admin-form-field">
                <label htmlFor="listing-category">Category</label>
                <div className="admin-input-wrap">
                  <Tag size={16} className="admin-field-icon" />
                  <input
                    id="listing-category"
                    type="text"
                    placeholder="e.g. Solar panels, Inverters, Installation"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="listing-price">Price Display</label>
                <div className="admin-input-wrap">
                  <DollarSign size={16} className="admin-field-icon" />
                  <input
                    id="listing-price"
                    type="text"
                    placeholder="e.g. PKR 45,000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="admin-input with-icon"
                  />
                </div>
              </div>

              <div className="admin-form-field">
                <label htmlFor="listing-status">Marketplace Moderation Status</label>
                <select
                  id="listing-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdminListing["status"])}
                  className="admin-select"
                >
                  <option value="Active">Active (Approved and visible)</option>
                  <option value="Review">Review (Pending administrator check)</option>
                  <option value="Paused">Paused (Temporarily hidden from search)</option>
                </select>
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
