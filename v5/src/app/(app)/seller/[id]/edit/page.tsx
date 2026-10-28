"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Wrench,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplace, type ListingKind, type ListingStatus } from "@/context/MarketplaceContext";
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
  optimizeListingImage,
} from "@/lib/marketplace/utils";
import "../../seller.css";

export default function EditSellerListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.id as string;

  const { user, isLoading: isAuthLoading } = useAuth();
  const { listings, isLoading: isMarketplaceLoading, updateListing, deleteListing } = useMarketplace();

  const [kind, setKind] = useState<ListingKind>("PRODUCT");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [coverageArea, setCoverageArea] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ListingStatus>("ACTIVE");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Find target listing
  const currentListing = listings.find((item) => item.id === listingId);

  useEffect(() => {
    if (currentListing && !isInitialized) {
      setKind(currentListing.kind);
      setTitle(currentListing.title);
      setCategory(currentListing.category);
      setPrice(currentListing.price);
      setCoverageArea(currentListing.coverageArea || "");
      setDescription(currentListing.description);
      setStatus(currentListing.status);
      setImageDataUrl(currentListing.imageDataUrl);
      setIsInitialized(true);
    }
  }, [currentListing, isInitialized]);

  function handleKindChange(nextKind: ListingKind) {
    setKind(nextKind);
    // If category is not in the new kind's categories, reset to first
    const targetCats = nextKind === "PRODUCT" ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES;
    if (!targetCats.includes(category)) {
      setCategory(targetCats[0]);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be signed in as a seller.");
      return;
    }

    if (!title.trim()) {
      setError("Listing title is required.");
      return;
    }

    if (!price.trim()) {
      setError("Please specify pricing details.");
      return;
    }

    if (!description.trim()) {
      setError("Listing description is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = updateListing(user.id, listingId, {
        kind,
        title: title.trim(),
        category,
        price: price.trim(),
        coverageArea: kind === "SERVICE" ? coverageArea.trim() : undefined,
        description: description.trim(),
        status,
        imageDataUrl,
      });

      if (!success) {
        throw new Error("Could not update listing. You might not have permission.");
      }

      router.push("/seller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing.");
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${title || "this listing"}"?`)) {
      return;
    }

    deleteListing(user.id, listingId);
    router.push("/seller");
  }

  if (isAuthLoading || isMarketplaceLoading) {
    return (
      <div className="seller-page-loading">
        <p>Loading listing details...</p>
      </div>
    );
  }

  if (isInitialized && !currentListing) {
    return (
      <div className="seller-subpage">
        <div className="seller-not-found-card">
          <h2>Listing not found</h2>
          <p>The listing you are trying to edit does not exist or may have been deleted.</p>
          <Link href="/seller" className="seller-btn-primary">
            <ArrowLeft size={16} /> Return to Seller Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const categoryOptions = kind === "PRODUCT" ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES;

  return (
    <div className="seller-subpage">
      {/* Breadcrumb Navigation */}
      <nav className="seller-subpage-nav" aria-label="Breadcrumbs">
        <Link href="/seller" className="seller-back-button">
          <ArrowLeft size={16} />
          <span>Back to Listings</span>
        </Link>
        <span className="seller-nav-separator">/</span>
        <span className="seller-nav-muted">{title || "Listing"}</span>
        <span className="seller-nav-separator">/</span>
        <span className="seller-nav-current">Edit</span>
      </nav>

      {/* Page Header */}
      <header className="seller-subpage-header">
        <div className="seller-subpage-header-text">
          <div className="seller-badge-tag">
            <Edit3 size={14} />
            <span>EDIT OFFERING</span>
          </div>
          <h1>Edit Listing</h1>
          <p>Update product specifications, service offerings, pricing, or marketplace status.</p>
        </div>
        <div className="seller-subpage-header-actions">
          <button
            type="button"
            onClick={handleDelete}
            className="seller-btn-danger"
            title="Delete this listing"
          >
            <Trash2 size={16} />
            <span>Delete Listing</span>
          </button>
        </div>
      </header>

      {/* Main Form Card */}
      <div className="seller-form-container">
        <form onSubmit={handleSubmit} className="seller-card-form">
          {error && (
            <div className="seller-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Listing Kind */}
          <div className="seller-form-section">
            <label className="seller-section-label">Listing Type</label>
            <div className="seller-kind-selector">
              <button
                type="button"
                className={`seller-kind-tab ${kind === "PRODUCT" ? "is-selected" : ""}`}
                onClick={() => handleKindChange("PRODUCT")}
              >
                <div className="seller-kind-tab-icon">
                  <Package size={22} />
                </div>
                <div className="seller-kind-tab-text">
                  <strong>Solar Product</strong>
                  <span>Panels, Inverters, Batteries & Hardware</span>
                </div>
              </button>

              <button
                type="button"
                className={`seller-kind-tab ${kind === "SERVICE" ? "is-selected" : ""}`}
                onClick={() => handleKindChange("SERVICE")}
              >
                <div className="seller-kind-tab-icon">
                  <Wrench size={22} />
                </div>
                <div className="seller-kind-tab-text">
                  <strong>Professional Service</strong>
                  <span>Installation, Maintenance, Audits & Cleaning</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Core Details */}
          <div className="seller-form-section">
            <h2 className="seller-section-title">Listing Information</h2>

            <div className="seller-fields-grid">
              <div className="seller-field seller-field--full">
                <label htmlFor="listing-title">
                  Listing Title <span className="seller-required">*</span>
                </label>
                <input
                  id="listing-title"
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="seller-input"
                />
              </div>

              <div className="seller-field">
                <label htmlFor="listing-category">
                  Category <span className="seller-required">*</span>
                </label>
                <select
                  id="listing-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="seller-select"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="seller-field">
                <label htmlFor="listing-price">
                  Pricing Details <span className="seller-required">*</span>
                </label>
                <input
                  id="listing-price"
                  type="text"
                  required
                  maxLength={80}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="seller-input"
                />
              </div>

              {kind === "SERVICE" && (
                <div className="seller-field seller-field--full">
                  <label htmlFor="listing-coverage">
                    Service Coverage Area <span className="seller-optional">(optional)</span>
                  </label>
                  <input
                    id="listing-coverage"
                    type="text"
                    maxLength={140}
                    value={coverageArea}
                    onChange={(e) => setCoverageArea(e.target.value)}
                    className="seller-input"
                  />
                </div>
              )}

              <div className="seller-field seller-field--full">
                <label htmlFor="listing-description">
                  Full Description <span className="seller-required">*</span>
                </label>
                <textarea
                  id="listing-description"
                  required
                  rows={4}
                  maxLength={1500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="seller-textarea"
                />
                <span className="seller-char-count">{description.length}/1500 characters</span>
              </div>
            </div>
          </div>

          {/* Section 3: Media & Image */}
          <div className="seller-form-section">
            <h2 className="seller-section-title">Listing Image & Media</h2>
            <div className="seller-image-upload-box">
              {imageDataUrl ? (
                <div className="seller-image-preview-card">
                  <div className="seller-image-preview-frame">
                    <Image
                      src={imageDataUrl}
                      alt="Listing preview"
                      fill
                      unoptimized
                      className="seller-preview-img"
                    />
                  </div>
                  <div className="seller-image-preview-meta">
                    <span className="seller-image-filename">Current Image</span>
                    <button
                      type="button"
                      onClick={() => setImageDataUrl(undefined)}
                      className="seller-remove-image-btn"
                    >
                      <X size={15} /> Remove / Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="seller-upload-dropzone">
                  <input
                    type="file"
                    accept="image/*"
                    className="seller-file-hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await optimizeListingImage(file);
                        setImageDataUrl(dataUrl);
                        setError("");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Error reading image");
                      }
                    }}
                  />
                  <div className="seller-dropzone-content">
                    <div className="seller-dropzone-icon">
                      <Upload size={24} />
                    </div>
                    <strong>Click or drag to replace image</strong>
                    <span>PNG, JPG, or WebP up to 8 MB</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Section 4: Visibility & Status */}
          <div className="seller-form-section">
            <h2 className="seller-section-title">Visibility & Status</h2>
            <div className="seller-field">
              <label htmlFor="listing-status">Publish Status</label>
              <select
                id="listing-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ListingStatus)}
                className="seller-select"
              >
                <option value="ACTIVE">Active (Publicly visible)</option>
                <option value="DRAFT">Draft (Private)</option>
                <option value="INACTIVE">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="seller-form-footer">
            <Link href="/seller" className="seller-btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="seller-btn-primary"
            >
              <CheckCircle2 size={18} />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
