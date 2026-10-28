"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Wrench,
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  Layers,
  Archive,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useMarketplace,
  type MarketplaceListing,
} from "@/context/MarketplaceContext";
import { getListingImage } from "@/lib/marketplace/utils";
import "./seller.css";

type FilterTab = "ALL" | "PRODUCTS" | "SERVICES" | "ACTIVE" | "INACTIVE";

export default function SellerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { listings, isLoading, updateListing, deleteListing } = useMarketplace();
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isAuthLoading && user?.role !== "SELLER") {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, router, user?.role]);

  // Listings owned by the current seller
  const ownedListings = useMemo(
    () => listings.filter((listing) => listing.ownerId === user?.id),
    [listings, user?.id],
  );

  const productCount = useMemo(
    () => ownedListings.filter((l) => l.kind === "PRODUCT").length,
    [ownedListings],
  );

  const serviceCount = useMemo(
    () => ownedListings.filter((l) => l.kind === "SERVICE").length,
    [ownedListings],
  );

  const activeCount = useMemo(
    () => ownedListings.filter((l) => l.status === "ACTIVE").length,
    [ownedListings],
  );

  const inactiveCount = useMemo(
    () => ownedListings.filter((l) => l.status !== "ACTIVE").length,
    [ownedListings],
  );

  // Filtered listings
  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ownedListings.filter((listing) => {
      // 1. Tab filter
      if (filterTab === "PRODUCTS" && listing.kind !== "PRODUCT") return false;
      if (filterTab === "SERVICES" && listing.kind !== "SERVICE") return false;
      if (filterTab === "ACTIVE" && listing.status !== "ACTIVE") return false;
      if (filterTab === "INACTIVE" && listing.status === "ACTIVE") return false;

      // 2. Search filter
      if (q) {
        const matchesTitle = listing.title.toLowerCase().includes(q);
        const matchesCategory = listing.category.toLowerCase().includes(q);
        const matchesDesc = listing.description.toLowerCase().includes(q);
        const matchesPrice = listing.price.toLowerCase().includes(q);
        const matchesCoverage = listing.coverageArea?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesDesc && !matchesPrice && !matchesCoverage) {
          return false;
        }
      }

      return true;
    });
  }, [ownedListings, filterTab, searchQuery]);

  function toggleStatus(listing: MarketplaceListing) {
    if (!user) return;
    const nextStatus = listing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateListing(user.id, listing.id, {
      kind: listing.kind,
      title: listing.title,
      category: listing.category,
      description: listing.description,
      price: listing.price,
      imageDataUrl: listing.imageDataUrl,
      coverageArea: listing.coverageArea,
      status: nextStatus,
    });
  }

  function removeListing(listing: MarketplaceListing) {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete "${listing.title}"? This cannot be undone.`)) {
      return;
    }
    deleteListing(user.id, listing.id);
  }

  if (isAuthLoading || user?.role !== "SELLER") {
    return null;
  }

  return (
    <div className="seller-page">
      {/* 1. Header Section */}
      <header className="seller-header">
        <div className="seller-header-info">
          <div className="seller-badge-tag">
            <Store size={14} />
            <span>SELLER STUDIO</span>
          </div>
          <h1 className="seller-title">Seller Dashboard</h1>
          <p className="seller-subtitle">
            Manage your solar product catalog, installation services, pricing, and marketplace presence.
          </p>
        </div>

        <div className="seller-header-actions">
          <Link href="/seller/new" className="seller-create-btn">
            <Plus size={18} />
            <span>Add New Listing</span>
          </Link>
        </div>
      </header>

      {/* 2. Key Statistics Bar */}
      <section className="seller-stats-grid" aria-label="Storefront statistics">
        <div className="seller-stat-card">
          <div className="seller-stat-icon-wrapper seller-stat-icon-wrapper--all">
            <Layers size={22} />
          </div>
          <div className="seller-stat-details">
            <span className="seller-stat-label">Total Listings</span>
            <span className="seller-stat-value">{ownedListings.length}</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon-wrapper seller-stat-icon-wrapper--product">
            <Package size={22} />
          </div>
          <div className="seller-stat-details">
            <span className="seller-stat-label">Solar Products</span>
            <span className="seller-stat-value">{productCount}</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon-wrapper seller-stat-icon-wrapper--service">
            <Wrench size={22} />
          </div>
          <div className="seller-stat-details">
            <span className="seller-stat-label">Services Offered</span>
            <span className="seller-stat-value">{serviceCount}</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-icon-wrapper seller-stat-icon-wrapper--active">
            <CheckCircle2 size={22} />
          </div>
          <div className="seller-stat-details">
            <span className="seller-stat-label">Active on Marketplace</span>
            <span className="seller-stat-value">{activeCount}</span>
          </div>
        </div>
      </section>

      {/* 3. Toolbar & Tabs */}
      <section className="seller-toolbar" aria-label="Search and filter offerings">
        <div className="seller-search-wrapper">
          <Search size={18} className="seller-search-icon" />
          <input
            type="text"
            className="seller-search-input"
            placeholder="Search by title, equipment category, price, coverage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="seller-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="seller-filter-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "ALL"}
            className={`seller-filter-tab ${filterTab === "ALL" ? "is-active" : ""}`}
            onClick={() => setFilterTab("ALL")}
          >
            <span>All</span>
            <span className="seller-tab-count">{ownedListings.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "PRODUCTS"}
            className={`seller-filter-tab ${filterTab === "PRODUCTS" ? "is-active" : ""}`}
            onClick={() => setFilterTab("PRODUCTS")}
          >
            <span>Products</span>
            <span className="seller-tab-count">{productCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "SERVICES"}
            className={`seller-filter-tab ${filterTab === "SERVICES" ? "is-active" : ""}`}
            onClick={() => setFilterTab("SERVICES")}
          >
            <span>Services</span>
            <span className="seller-tab-count">{serviceCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "ACTIVE"}
            className={`seller-filter-tab ${filterTab === "ACTIVE" ? "is-active" : ""}`}
            onClick={() => setFilterTab("ACTIVE")}
          >
            <span>Active</span>
            <span className="seller-tab-count">{activeCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "INACTIVE"}
            className={`seller-filter-tab ${filterTab === "INACTIVE" ? "is-active" : ""}`}
            onClick={() => setFilterTab("INACTIVE")}
          >
            <span>Draft / Inactive</span>
            <span className="seller-tab-count">{inactiveCount}</span>
          </button>
        </div>
      </section>

      {/* 4. Listings Grid */}
      {isLoading ? (
        <div className="seller-loading-state">
          <p>Loading your offerings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="seller-empty-card">
          <div className="seller-empty-icon">
            <Store size={42} />
          </div>
          <h3>{searchQuery ? "No matching listings found" : "No listings yet"}</h3>
          <p>
            {searchQuery
              ? `No offerings matched "${searchQuery}". Try adjusting your search term or clear filters.`
              : "Start by publishing your first solar equipment product or service offering."}
          </p>
          {searchQuery ? (
            <button
              type="button"
              className="seller-btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setFilterTab("ALL");
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link href="/seller/new" className="seller-create-btn">
              <Plus size={16} /> Create First Listing
            </Link>
          )}
        </div>
      ) : (
        <div className="seller-grid" role="list">
          {filteredListings.map((listing) => {
            const isProduct = listing.kind === "PRODUCT";
            const isActive = listing.status === "ACTIVE";

            return (
              <article key={listing.id} className="seller-card" role="listitem">
                <div className="seller-card-media">
                  <Image
                    src={getListingImage(listing)}
                    alt={listing.title}
                    fill
                    unoptimized={Boolean(listing.imageDataUrl)}
                    className="seller-card-thumb"
                  />
                  <div className="seller-card-badges">
                    <span className={`seller-type-pill ${isProduct ? "seller-type--product" : "seller-type--service"}`}>
                      {isProduct ? <Package size={12} /> : <Wrench size={12} />}
                      {isProduct ? "Product" : "Service"}
                    </span>
                    <span className={`seller-status-pill ${isActive ? "seller-status--active" : "seller-status--inactive"}`}>
                      {listing.status}
                    </span>
                  </div>
                </div>

                <div className="seller-card-content">
                  <div className="seller-card-meta">
                    <span className="seller-card-category">{listing.category}</span>
                    {listing.coverageArea && (
                      <span className="seller-card-coverage" title={listing.coverageArea}>
                        · {listing.coverageArea}
                      </span>
                    )}
                  </div>

                  <h3 className="seller-card-title" title={listing.title}>
                    {listing.title}
                  </h3>

                  <p className="seller-card-desc">
                    {listing.description}
                  </p>

                  <div className="seller-card-pricing-row">
                    <span className="seller-card-price-label">Pricing</span>
                    <strong className="seller-card-price-value">{listing.price}</strong>
                  </div>

                  <div className="seller-card-actions-bar">
                    <button
                      type="button"
                      onClick={() => toggleStatus(listing)}
                      className="seller-card-btn seller-card-btn--toggle"
                      title={isActive ? "Set to Inactive" : "Activate listing"}
                    >
                      <Archive size={14} />
                      <span>{isActive ? "Deactivate" : "Activate"}</span>
                    </button>

                    <Link
                      href={`/seller/${listing.id}/edit`}
                      className="seller-card-btn seller-card-btn--edit"
                      title="Edit this listing"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeListing(listing)}
                      className="seller-card-btn seller-card-btn--danger"
                      title="Delete listing"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
