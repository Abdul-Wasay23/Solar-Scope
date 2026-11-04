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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Table as TableIcon,
  LayoutGrid,
  MapPin,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useMarketplace,
  type MarketplaceListing,
} from "@/context/MarketplaceContext";
import { getListingImage } from "@/lib/marketplace/utils";
import "./seller.css";

type FilterTab = "ALL" | "PRODUCTS" | "SERVICES" | "ACTIVE" | "INACTIVE";
type SortOption = "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "NAME_ASC";
type ViewMode = "TABLE" | "GRID";

interface SellerProfileData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  city: string;
}

export default function SellerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { listings, isLoading, updateListing, deleteListing, refreshListings } = useMarketplace();
  const router = useRouter();

  // Profile data from database
  const [profile, setProfile] = useState<SellerProfileData>({
    fullName: user?.fullName || "davidweb",
    email: user?.email || "davidweb.302@gmail.com",
    phone: user?.phone || "+92 300 1234567",
    company: user?.company || "SolarScope Engineering Solutions",
    title: user?.title || "Senior PV Systems Designer",
    city: user?.city || "Karachi, Pakistan",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Filters, search, view mode, sorting, pagination
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Deletion modal state
  const [listingToDelete, setListingToDelete] = useState<MarketplaceListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!isAuthLoading && user?.role !== "SELLER") {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, router, user?.role]);

  // Fetch actual seller profile from database
  useEffect(() => {
    const identifier = user?.id
      ? `userId=${encodeURIComponent(user.id)}`
      : user?.email
        ? `email=${encodeURIComponent(user.email)}`
        : null;

    if (!identifier) {
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    fetch(`/api/user/profile?${identifier}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          const u = data.user;
          setProfile({
            fullName: u.fullName || user?.fullName || "davidweb",
            email: u.email || user?.email || "davidweb.302@gmail.com",
            phone: u.phone || user?.phone || "+92 300 1234567",
            company: u.company || user?.company || "SolarScope Engineering Solutions",
            title: u.title || user?.title || "Senior PV Systems Designer",
            city: u.city || user?.city || "Karachi, Pakistan",
          });
        }
      })
      .catch((err) => console.error("Failed to load seller DB profile:", err))
      .finally(() => setIsProfileLoading(false));
  }, [user?.id, user?.email, user?.fullName, user?.phone, user?.company, user?.title, user?.city]);

  // Listings owned by the current seller (checks ID or email, or all if seller in demo)
  const ownedListings = useMemo(
    () =>
      listings.filter(
        (listing) =>
          String(listing.ownerId) === String(user?.id) ||
          (user?.email && listing.sellerEmail?.toLowerCase() === user?.email.toLowerCase()) ||
          (!listing.ownerId && user?.role === "SELLER")
      ),
    [listings, user?.id, user?.email, user?.role],
  );

  // KPI Calculations
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

  const totalOrders = 0; // Baseline orders supported by current schema

  // Filtered and Sorted listings
  const processedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = ownedListings.filter((listing) => {
      // 1. Tab filter
      if (filterTab === "PRODUCTS" && listing.kind !== "PRODUCT") return false;
      if (filterTab === "SERVICES" && listing.kind !== "SERVICE") return false;
      if (filterTab === "ACTIVE" && listing.status !== "ACTIVE") return false;
      if (filterTab === "INACTIVE" && listing.status === "ACTIVE") return false;

      // 2. Search filter
      if (q) {
        const matchesTitle = listing.title?.toLowerCase().includes(q);
        const matchesCategory = listing.category?.toLowerCase().includes(q);
        const matchesDesc = listing.description?.toLowerCase().includes(q);
        const matchesPrice = listing.price?.toLowerCase().includes(q);
        const matchesCoverage = listing.coverageArea?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesDesc && !matchesPrice && !matchesCoverage) {
          return false;
        }
      }

      return true;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "PRICE_ASC") {
        const pA = parseFloat(String(a.price).replace(/[^0-9.]/g, "")) || 0;
        const pB = parseFloat(String(b.price).replace(/[^0-9.]/g, "")) || 0;
        return pA - pB;
      }
      if (sortBy === "PRICE_DESC") {
        const pA = parseFloat(String(a.price).replace(/[^0-9.]/g, "")) || 0;
        const pB = parseFloat(String(b.price).replace(/[^0-9.]/g, "")) || 0;
        return pB - pA;
      }
      if (sortBy === "NAME_ASC") {
        return (a.title || "").localeCompare(b.title || "");
      }
      // NEWEST
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [ownedListings, filterTab, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedListings.length / itemsPerPage));
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedListings.slice(start, start + itemsPerPage);
  }, [processedListings, currentPage, itemsPerPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, sortBy]);

  // Actions
  function toggleStatus(listing: MarketplaceListing) {
    if (!user) return;
    const nextStatus = listing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateListing(user.id, listing.id, {
      kind: listing.kind,
      title: listing.title,
      category: listing.category,
      brand: listing.brand,
      description: listing.description,
      price: listing.price,
      stock: listing.stock,
      imageDataUrl: listing.imageDataUrl,
      coverageArea: listing.coverageArea,
      status: nextStatus,
    });
  }

  async function handleConfirmDelete() {
    if (!user || !listingToDelete) return;
    setIsDeleting(true);
    try {
      deleteListing(user.id, listingToDelete.id);
      setListingToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshListings();
    } finally {
      setIsRefreshing(false);
    }
  }

  function formatPricePKR(priceStr: string) {
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return priceStr || "PKR 0";
    return `PKR ${num.toLocaleString("en-PK")}`;
  }

  function formatDate(isoStr: string) {
    if (!isoStr) return "Just now";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  }

  const initials = (profile.fullName || "SW")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "SW";

  if (isAuthLoading || user?.role !== "SELLER") {
    return null;
  }

  return (
    <div className="seller-page">
      {/* ── Section F: Seller Identity & Verified Profile Summary ── */}
      <section className="seller-profile-hero" aria-label="Seller identity summary">
        <div className="seller-profile-hero-main">
          <div className="seller-avatar-wrapper">
            <div className="seller-avatar-circle">{initials}</div>
            <div className="seller-avatar-verified-badge" title="Verified Seller">
              <ShieldCheck size={16} />
            </div>
          </div>

          <div className="seller-profile-info">
            <div className="seller-profile-title-row">
              <h1 className="seller-profile-name">{profile.fullName}</h1>
              <span className="seller-cert-badge">
                <ShieldCheck size={13} />
                <span>Certified PV Designer</span>
              </span>
            </div>

            <div className="seller-profile-role-row">
              <span className="seller-role-tag">{profile.title}</span>
              <span className="seller-meta-separator">•</span>
              <span className="seller-company-tag">
                <Building2 size={13} />
                <span>{profile.company}</span>
              </span>
            </div>

            <div className="seller-profile-details-strip">
              <span className="seller-detail-item">
                <Mail size={13} />
                <span>{profile.email}</span>
              </span>
              <span className="seller-detail-item">
                <MapPin size={13} />
                <span>{profile.city}</span>
              </span>
              <span className="seller-detail-item">
                <Phone size={13} />
                <span>{profile.phone}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="seller-profile-hero-actions">
          <Link href="/settings/profile" className="seller-hero-btn seller-hero-btn--secondary">
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </Link>
          <Link href="/seller/new" className="seller-hero-btn seller-hero-btn--primary">
            <Plus size={16} />
            <span>Add New Listing</span>
          </Link>
        </div>
      </section>

      {/* ── Section A: Dashboard Overview & Statistics ── */}
      <section className="seller-kpi-grid" aria-label="Storefront KPI statistics">
        <div className="seller-kpi-card seller-kpi-card--primary">
          <div className="seller-kpi-icon-box seller-kpi-icon-box--blue">
            <Layers size={22} />
          </div>
          <div className="seller-kpi-body">
            <span className="seller-kpi-label">Total Listings</span>
            <strong className="seller-kpi-value">{ownedListings.length}</strong>
            <span className="seller-kpi-subtext">Catalog hardware & services</span>
          </div>
        </div>

        <div className="seller-kpi-card">
          <div className="seller-kpi-icon-box seller-kpi-icon-box--gold">
            <Package size={22} />
          </div>
          <div className="seller-kpi-body">
            <span className="seller-kpi-label">Total Products</span>
            <strong className="seller-kpi-value">{productCount}</strong>
            <span className="seller-kpi-subtext">Panels, Inverters, Hardware</span>
          </div>
        </div>

        <div className="seller-kpi-card">
          <div className="seller-kpi-icon-box seller-kpi-icon-box--cyan">
            <Wrench size={22} />
          </div>
          <div className="seller-kpi-body">
            <span className="seller-kpi-label">Total Services</span>
            <strong className="seller-kpi-value">{serviceCount}</strong>
            <span className="seller-kpi-subtext">Installation, EPC, Maintenance</span>
          </div>
        </div>

        <div className="seller-kpi-card">
          <div className="seller-kpi-icon-box seller-kpi-icon-box--green">
            <CheckCircle2 size={22} />
          </div>
          <div className="seller-kpi-body">
            <span className="seller-kpi-label">Active Listings</span>
            <strong className="seller-kpi-value">{activeCount}</strong>
            <span className="seller-kpi-subtext">{inactiveCount} Inactive / Draft</span>
          </div>
        </div>

        <div className="seller-kpi-card">
          <div className="seller-kpi-icon-box seller-kpi-icon-box--orders">
            <ShoppingBag size={22} />
          </div>
          <div className="seller-kpi-body">
            <span className="seller-kpi-label">Total Orders</span>
            <strong className="seller-kpi-value">{totalOrders}</strong>
            <span className="seller-kpi-subtext">Direct quotes & inquiries</span>
          </div>
        </div>
      </section>

      {/* ── Section E: Controls, Search, Filter Tabs & View Mode ── */}
      <section className="seller-toolbar-panel" aria-label="Catalog filters and tools">
        <div className="seller-search-box">
          <Search size={17} className="seller-search-icon" />
          <input
            type="text"
            className="seller-search-field"
            placeholder="Search by product name, category, price, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="seller-clear-search"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="seller-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "ALL"}
            className={`seller-tab-btn ${filterTab === "ALL" ? "is-active" : ""}`}
            onClick={() => setFilterTab("ALL")}
          >
            <span>All</span>
            <span className="seller-pill-badge">{ownedListings.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "PRODUCTS"}
            className={`seller-tab-btn ${filterTab === "PRODUCTS" ? "is-active" : ""}`}
            onClick={() => setFilterTab("PRODUCTS")}
          >
            <Package size={14} />
            <span>Products</span>
            <span className="seller-pill-badge">{productCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "SERVICES"}
            className={`seller-tab-btn ${filterTab === "SERVICES" ? "is-active" : ""}`}
            onClick={() => setFilterTab("SERVICES")}
          >
            <Wrench size={14} />
            <span>Services</span>
            <span className="seller-pill-badge">{serviceCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "ACTIVE"}
            className={`seller-tab-btn ${filterTab === "ACTIVE" ? "is-active" : ""}`}
            onClick={() => setFilterTab("ACTIVE")}
          >
            <CheckCircle2 size={14} />
            <span>Active</span>
            <span className="seller-pill-badge seller-pill-badge--green">{activeCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "INACTIVE"}
            className={`seller-tab-btn ${filterTab === "INACTIVE" ? "is-active" : ""}`}
            onClick={() => setFilterTab("INACTIVE")}
          >
            <Archive size={14} />
            <span>Inactive</span>
            <span className="seller-pill-badge">{inactiveCount}</span>
          </button>
        </div>

        {/* Sorting & Layout toggles */}
        <div className="seller-view-controls">
          <div className="seller-sort-wrapper">
            <ArrowUpDown size={14} />
            <select
              className="seller-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort listings"
            >
              <option value="NEWEST">Newest Added</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="NAME_ASC">Name: A to Z</option>
            </select>
          </div>

          <div className="seller-view-toggle-group">
            <button
              type="button"
              className={`seller-view-toggle-btn ${viewMode === "TABLE" ? "is-active" : ""}`}
              onClick={() => setViewMode("TABLE")}
              title="Table View"
              aria-label="Table View"
            >
              <TableIcon size={16} />
            </button>
            <button
              type="button"
              className={`seller-view-toggle-btn ${viewMode === "GRID" ? "is-active" : ""}`}
              onClick={() => setViewMode("GRID")}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            type="button"
            className="seller-refresh-icon-btn"
            onClick={handleRefresh}
            title="Refresh from Database"
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? "spin-animation" : ""} />
          </button>
        </div>
      </section>

      {/* ── Section E: Table & Grid Presentation ── */}
      {isLoading ? (
        <div className="seller-state-card seller-loading-state">
          <RefreshCw size={28} className="spin-animation" />
          <p>Loading database listings...</p>
        </div>
      ) : processedListings.length === 0 ? (
        <div className="seller-state-card seller-empty-state">
          <div className="seller-empty-icon-wrap">
            <Store size={48} />
          </div>
          <h3>{searchQuery ? "No matching offerings found" : "No listings published yet"}</h3>
          <p>
            {searchQuery
              ? `No offerings match "${searchQuery}". Clear your search query or reset tab filters.`
              : "Expand your solar business by listing tier-1 PV panels, hybrid inverters, or turnkey engineering services."}
          </p>
          {searchQuery ? (
            <button
              type="button"
              className="seller-action-btn seller-action-btn--secondary"
              onClick={() => {
                setSearchQuery("");
                setFilterTab("ALL");
              }}
            >
              Reset Filters
            </button>
          ) : (
            <Link href="/seller/new" className="seller-action-btn seller-action-btn--primary">
              <Plus size={16} />
              <span>Add Your First Listing</span>
            </Link>
          )}
        </div>
      ) : viewMode === "TABLE" ? (
        /* Professional Database-Backed Table */
        <div className="seller-table-card">
          <div className="seller-table-responsive">
            <table className="seller-data-table">
              <thead>
                <tr>
                  <th style={{ width: "72px" }}>Image</th>
                  <th>{filterTab === "SERVICES" ? "Service Name" : "Offering Name"}</th>
                  <th>Category</th>
                  <th>Price</th>
                  {filterTab === "SERVICES" ? (
                    <th>Coverage Area</th>
                  ) : filterTab === "PRODUCTS" ? (
                    <th>Stock</th>
                  ) : (
                    <th>Stock / Area</th>
                  )}
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedListings.map((item) => {
                  const isProduct = item.kind === "PRODUCT";
                  const isActive = item.status === "ACTIVE";

                  return (
                    <tr key={item.id} className={!isActive ? "seller-row-inactive" : ""}>
                      {/* 1. Image */}
                      <td>
                        <div className="seller-tbl-thumb-wrap">
                          <Image
                            src={getListingImage(item)}
                            alt={item.title}
                            width={48}
                            height={48}
                            unoptimized={Boolean(item.imageDataUrl)}
                            className="seller-tbl-thumb"
                          />
                        </div>
                      </td>

                      {/* 2. Title & Type Tag */}
                      <td>
                        <div className="seller-tbl-name-cell">
                          <div className="seller-tbl-title-row">
                            <span className="seller-tbl-title" title={item.title}>
                              {item.title}
                            </span>
                            <span
                              className={`seller-tbl-type-badge ${
                                isProduct ? "type-badge--prod" : "type-badge--serv"
                              }`}
                            >
                              {isProduct ? "Product" : "Service"}
                            </span>
                          </div>
                          {item.brand && (
                            <span className="seller-tbl-subbrand">{item.brand}</span>
                          )}
                          {!item.brand && item.description && (
                            <span className="seller-tbl-subbrand">
                              {item.description.slice(0, 48)}
                              {item.description.length > 48 ? "..." : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Category */}
                      <td>
                        <span className="seller-tbl-category-badge">{item.category}</span>
                      </td>

                      {/* 4. Price */}
                      <td>
                        <strong className="seller-tbl-price">{formatPricePKR(item.price)}</strong>
                      </td>

                      {/* 5. Stock (for Product) or Area (for Service) */}
                      <td>
                        {isProduct ? (
                          <span
                            className={`seller-stock-pill ${
                              (item.stock ?? 10) > 0 ? "stock-in" : "stock-out"
                            }`}
                          >
                            {item.stock !== undefined ? `${item.stock} in stock` : "In Stock"}
                          </span>
                        ) : (
                          <span className="seller-area-pill" title={item.coverageArea}>
                            <MapPin size={11} />
                            <span>{item.coverageArea || "Karachi & Nationwide"}</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Status (Clickable Toggle) */}
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          className={`seller-status-chip ${
                            isActive ? "status-chip--active" : "status-chip--inactive"
                          }`}
                          title={`Click to ${isActive ? "deactivate" : "activate"}`}
                        >
                          <span className="status-dot" />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* 7. Created Date */}
                      <td>
                        <span className="seller-tbl-date">{formatDate(item.createdAt)}</span>
                      </td>

                      {/* 8. Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="seller-tbl-actions">
                          <button
                            type="button"
                            onClick={() => toggleStatus(item)}
                            className="seller-tbl-btn seller-tbl-btn--toggle"
                            title={isActive ? "Set to Inactive" : "Activate Listing"}
                          >
                            <Archive size={14} />
                          </button>
                          <Link
                            href={`/seller/${item.id}/edit`}
                            className="seller-tbl-btn seller-tbl-btn--edit"
                            title="Edit Listing"
                          >
                            <Edit3 size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setListingToDelete(item)}
                            className="seller-tbl-btn seller-tbl-btn--delete"
                            title="Delete Listing"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="seller-pagination-bar">
            <span className="seller-pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, processedListings.length)} of{" "}
              {processedListings.length} offerings
            </span>

            <div className="seller-pagination-nav">
              <button
                type="button"
                className="seller-page-nav-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="seller-page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="seller-page-nav-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grid Presentation */
        <div className="seller-cards-section">
          <div className="seller-grid" role="list">
            {paginatedListings.map((listing) => {
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
                      <span
                        className={`seller-type-pill ${
                          isProduct ? "seller-type--product" : "seller-type--service"
                        }`}
                      >
                        {isProduct ? <Package size={12} /> : <Wrench size={12} />}
                        {isProduct ? "Product" : "Service"}
                      </span>
                      <span
                        className={`seller-status-pill ${
                          isActive ? "seller-status--active" : "seller-status--inactive"
                        }`}
                      >
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

                    <p className="seller-card-desc">{listing.description}</p>

                    <div className="seller-card-pricing-row">
                      <div className="seller-card-price-group">
                        <span className="seller-card-price-label">Pricing</span>
                        <strong className="seller-card-price-value">
                          {formatPricePKR(listing.price)}
                        </strong>
                      </div>
                      {isProduct && listing.stock !== undefined && (
                        <span className="seller-stock-pill stock-in">
                          {listing.stock} in stock
                        </span>
                      )}
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
                        onClick={() => setListingToDelete(listing)}
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

          {/* Pagination Controls for Grid View */}
          <div className="seller-pagination-bar" style={{ marginTop: "24px" }}>
            <span className="seller-pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, processedListings.length)} of{" "}
              {processedListings.length} offerings
            </span>

            <div className="seller-pagination-nav">
              <button
                type="button"
                className="seller-page-nav-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="seller-page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="seller-page-nav-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Themed Modal ── */}
      {listingToDelete && (
        <div className="seller-modal-backdrop" role="dialog" aria-modal="true">
          <div className="seller-modal-card">
            <div className="seller-modal-icon-wrap">
              <Trash2 size={24} />
            </div>

            <div className="seller-modal-body">
              <h3 className="seller-modal-title">Delete Offering</h3>
              <p className="seller-modal-desc">
                Are you sure you want to permanently delete{" "}
                <strong>&quot;{listingToDelete.title}&quot;</strong>? This action will remove the
                record from PostgreSQL database and cancel any active marketplace visibility.
              </p>
            </div>

            <div className="seller-modal-actions">
              <button
                type="button"
                className="seller-modal-btn seller-modal-btn--cancel"
                onClick={() => setListingToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="seller-modal-btn seller-modal-btn--confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
