"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Boxes,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getStoredAdminListings,
  saveStoredAdminListings,
  type AdminUser,
  type AdminListing,
} from "@/lib/admin/adminStorage";
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
  getListingImage,
} from "@/lib/marketplace/utils";
import "./admin.css";

// ── Types for Website Content ───────────────────────────────────────────────
type WebsiteContent = {
  hero?: Record<string, string>;
  stats?: Record<string, string>;
  platform?: Record<string, string>;
  howItWorks?: Record<string, string>;
  financials?: Record<string, string>;
  features?: Record<string, string>;
  contact?: Record<string, string>;
  cta?: Record<string, string>;
  [key: string]: Record<string, string> | undefined;
};

const WEBSITE_SECTIONS: { key: string; label: string; icon: string; desc: string }[] = [
  { key: "hero", label: "Hero Banner", icon: "🚀", desc: "Main headline, subtitle, CTAs & trust badges" },
  { key: "stats", label: "Workflow Highlights", icon: "📊", desc: "4-step quick roadmap indicators" },
  { key: "platform", label: "Platform Overview", icon: "🏢", desc: "Rooftop intelligence & CAD intro" },
  { key: "howItWorks", label: "How It Works", icon: "⚙️", desc: "Four-step planning and ordering pipeline" },
  { key: "financials", label: "Energy & Financials", icon: "💰", desc: "Yield, savings & payback metrics" },
  { key: "features", label: "Features Suite", icon: "🛠️", desc: "Unified tools, polygon CAD & hardware" },
  { key: "contact", label: "Contact & Desk", icon: "📞", desc: "Email, phone & engineering address" },
  { key: "cta", label: "Final Call to Action", icon: "⚡", desc: "Bottom signup & explore prompt" },
];

export default function AdminDashboardPage() {
  const { logout, user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Role Protection Guard: Only users with role === 'ADMIN' can access the admin dashboard
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/login?next=/admin");
      } else if (authUser?.role !== "ADMIN") {
        const fallback = authUser?.role === "SELLER" ? "/seller" : "/dashboard";
        router.replace(fallback);
      }
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  const [activeSection, setActiveSection] = useState<
    "Overview" | "Users" | "Marketplace" | "Manage Website" | "Settings"
  >("Overview");

  // Admin Profile (synced with top bar pill)
  const [adminProfile, setAdminProfile] = useState({
    fullName: authUser?.fullName || "Platform Admin",
    email: authUser?.email || "admin@example.test",
  });

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"Buyer" | "Seller">("Buyer");
  const [newPassword, setNewPassword] = useState("");
  const [showQuickAddPw, setShowQuickAddPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    type: "user" | "listing";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Settings State
  const [settingsName, setSettingsName] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsCurrentPw, setSettingsCurrentPw] = useState("");
  const [settingsNewPw, setSettingsNewPw] = useState("");
  const [settingsConfirmPw, setSettingsConfirmPw] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Manage Website State
  const [selectedWebSection, setSelectedWebSection] = useState("hero");
  const [siteContent, setSiteContent] = useState<WebsiteContent>({});
  const [webContentLoading, setWebContentLoading] = useState(false);
  const [webSaving, setWebSaving] = useState(false);
  const [webSuccess, setWebSuccess] = useState("");
  const [webError, setWebError] = useState("");

  // Marketplace Database & Task 05 State
  const [dbListings, setDbListings] = useState<any[]>([]);
  const [marketplaceTab, setMarketplaceTab] = useState<"PRODUCTS" | "SERVICES">("PRODUCTS");
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Products filters
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("ALL");
  const [prodSeller, setProdSeller] = useState("ALL");
  const [prodStatus, setProdStatus] = useState("ALL");
  const [prodPriceRange, setProdPriceRange] = useState("ALL");
  const [prodPage, setProdPage] = useState(1);

  // Services filters
  const [servSearch, setServSearch] = useState("");
  const [servCategory, setServCategory] = useState("ALL");
  const [servSeller, setServSeller] = useState("ALL");
  const [servStatus, setServStatus] = useState("ALL");
  const [servLocation, setServLocation] = useState("ALL");
  const [servPage, setServPage] = useState(1);

  const mpPageSize = 8;

  const [inspectedSeller, setInspectedSeller] = useState<{
    id?: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    title?: string;
    city?: string;
  } | null>(null);

  // ── Load Marketplace listings from PostgreSQL ─────────────────────────────
  async function loadDbListings() {
    setMarketplaceLoading(true);
    try {
      const res = await fetch("/api/marketplace");
      const data = await res.json();
      if (data.success && Array.isArray(data.listings)) {
        setDbListings(data.listings);
      }
    } catch (err) {
      console.error("Failed to load db listings:", err);
    } finally {
      setMarketplaceLoading(false);
    }
  }

  async function toggleDbListingStatus(listing: any) {
    if (isTogglingStatus) return;
    setIsTogglingStatus(true);
    const nextStatus = listing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setDbListings((current) =>
      current.map((item) =>
        item.id === listing.id ? { ...item, status: nextStatus } : item
      )
    );
    try {
      await fetch("/api/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listing.id, status: nextStatus }),
      });
    } catch (err) {
      console.error("Failed to toggle listing status:", err);
      await loadDbListings();
    } finally {
      setIsTogglingStatus(false);
    }
  }

  // ── Load Admin Profile on Mount ──────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.fullName) {
          setAdminProfile({
            fullName: data.fullName,
            email: data.email || "admin@example.test",
          });
          setSettingsName(data.fullName);
          setSettingsEmail(data.email || "");
        }
      })
      .catch(console.error);
  }, []);

  // ── Load users from database ─────────────────────────────────────────────
  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch (err) {
      console.error("Error fetching admin users:", err);
    } finally {
      setUsersLoading(false);
    }
  }

  // ── Load site content for Manage Website ─────────────────────────────────
  async function loadSiteContent() {
    setWebContentLoading(true);
    try {
      const res = await fetch("/api/admin/site-content");
      if (res.ok) {
        const data = await res.json();
        setSiteContent(data.content || {});
      }
    } catch (err) {
      console.error("Error fetching site content:", err);
    } finally {
      setWebContentLoading(false);
    }
  }

  useEffect(() => {
    setListings(getStoredAdminListings());
    setIsLoaded(true);
    loadUsers();
    loadSiteContent();
    loadDbListings();
  }, []);

  // Persist listings to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    saveStoredAdminListings(listings);
  }, [listings, isLoaded]);

  // Sync settings inputs when Settings section is selected
  useEffect(() => {
    if (activeSection === "Settings") {
      setSettingsName(adminProfile.fullName);
      setSettingsEmail(adminProfile.email);
      setSettingsCurrentPw("");
      setSettingsNewPw("");
      setSettingsConfirmPw("");
      setSettingsError("");
      setSettingsSuccess("");
    }
    if (activeSection === "Manage Website") {
      loadSiteContent();
      setWebSuccess("");
      setWebError("");
    }
    if (activeSection === "Marketplace") {
      loadDbListings();
    }
  }, [activeSection, adminProfile]);

  // ── Task 05: Derived Products & Services from Database ──────────────────
  const allDbProducts = useMemo(() => dbListings.filter((l) => l.kind === "PRODUCT"), [dbListings]);
  const allDbServices = useMemo(() => dbListings.filter((l) => l.kind === "SERVICE"), [dbListings]);

  // Unique sellers for filter dropdowns
  const uniqueSellers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    dbListings.forEach((item) => {
      const key = (item.sellerEmail || item.sellerName || item.ownerId || "").toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          id: item.ownerId,
          name: item.sellerName || item.sellerCompany || "Solar Provider",
          email: item.sellerEmail || "",
        });
      }
    });
    return Array.from(map.values());
  }, [dbListings]);

  // Unique Product Categories
  const uniqueProdCategories = useMemo(() => {
    const set = new Set<string>();
    allDbProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    PRODUCT_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [allDbProducts]);

  // Unique Service Categories
  const uniqueServCategories = useMemo(() => {
    const set = new Set<string>();
    allDbServices.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    SERVICE_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [allDbServices]);

  // Unique Service Locations
  const uniqueServLocations = useMemo(() => {
    const set = new Set<string>();
    allDbServices.forEach((s) => {
      if (s.coverageArea) set.add(s.coverageArea);
    });
    if (set.size === 0) {
      set.add("Karachi & Sindh");
      set.add("Lahore & Punjab");
      set.add("Islamabad & KPK");
      set.add("Nationwide");
    }
    return Array.from(set);
  }, [allDbServices]);

  // Filtered Products (Requirement D)
  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return allDbProducts.filter((item) => {
      if (prodCategory !== "ALL" && item.category !== prodCategory) return false;
      if (prodSeller !== "ALL") {
        const itemKey = (item.sellerEmail || item.sellerName || item.ownerId || "").toLowerCase();
        if (itemKey !== prodSeller.toLowerCase()) return false;
      }
      if (prodStatus !== "ALL" && item.status !== prodStatus) return false;
      if (prodPriceRange !== "ALL") {
        const priceNum = parseFloat(String(item.price || "0").replace(/[^0-9.]/g, "")) || 0;
        if (prodPriceRange === "UNDER_50K" && priceNum >= 50000) return false;
        if (prodPriceRange === "50K_200K" && (priceNum < 50000 || priceNum > 200000)) return false;
        if (prodPriceRange === "200K_500K" && (priceNum < 200000 || priceNum > 500000)) return false;
        if (prodPriceRange === "ABOVE_500K" && priceNum <= 500000) return false;
      }
      if (q) {
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCategory = (item.category || "").toLowerCase().includes(q);
        const matchSeller = (item.sellerName || "").toLowerCase().includes(q);
        const matchBrand = (item.brand || "").toLowerCase().includes(q);
        const matchEmail = (item.sellerEmail || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchSeller && !matchBrand && !matchEmail && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [allDbProducts, prodSearch, prodCategory, prodSeller, prodStatus, prodPriceRange]);

  const totalProdPages = Math.max(1, Math.ceil(filteredProducts.length / mpPageSize));
  const paginatedProducts = useMemo(() => {
    const start = (prodPage - 1) * mpPageSize;
    return filteredProducts.slice(start, start + mpPageSize);
  }, [filteredProducts, prodPage, mpPageSize]);

  // Filtered Services (Requirement D)
  const filteredServices = useMemo(() => {
    const q = servSearch.trim().toLowerCase();
    return allDbServices.filter((item) => {
      if (servCategory !== "ALL" && item.category !== servCategory) return false;
      if (servSeller !== "ALL") {
        const itemKey = (item.sellerEmail || item.sellerName || item.ownerId || "").toLowerCase();
        if (itemKey !== servSeller.toLowerCase()) return false;
      }
      if (servStatus !== "ALL" && item.status !== servStatus) return false;
      if (servLocation !== "ALL") {
        const area = (item.coverageArea || "").toLowerCase();
        if (!area.includes(servLocation.toLowerCase())) return false;
      }
      if (q) {
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCategory = (item.category || "").toLowerCase().includes(q);
        const matchSeller = (item.sellerName || "").toLowerCase().includes(q);
        const matchEmail = (item.sellerEmail || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchArea = (item.coverageArea || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchSeller && !matchEmail && !matchDesc && !matchArea) {
          return false;
        }
      }
      return true;
    });
  }, [allDbServices, servSearch, servCategory, servSeller, servStatus, servLocation]);

  const totalServPages = Math.max(1, Math.ceil(filteredServices.length / mpPageSize));
  const paginatedServices = useMemo(() => {
    const start = (servPage - 1) * mpPageSize;
    return filteredServices.slice(start, start + mpPageSize);
  }, [filteredServices, servPage, mpPageSize]);

  // ── Database-driven Marketplace Counts (PostgreSQL Dynamic Data) ──────────
  const dbProductCount = allDbProducts.length;
  const dbServiceCount = allDbServices.length;
  const dbActiveProductCount = allDbProducts.filter((p) => p.status === "ACTIVE").length;
  const dbActiveServiceCount = allDbServices.filter((s) => s.status === "ACTIVE").length;
  const dbActiveListingCount = dbListings.filter((l) => l.status === "ACTIVE").length;
  const dbInactiveProductCount = allDbProducts.filter((p) => p.status !== "ACTIVE").length;
  const dbInactiveServiceCount = allDbServices.filter((s) => s.status !== "ACTIVE").length;
  const dbNeedsAttentionListingsCount = dbListings.filter(
    (l) => l.status !== "ACTIVE"
  ).length;

  // ── Derived counts ───────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role} ${user.status} ${user.location ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [search, users]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((listing) =>
      `${listing.name} ${listing.owner} ${listing.type} ${listing.status} ${listing.category ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [listings, search]);

  const nonAdminUsers = users.filter((u) => u.role !== "Admin");
  const sellerCount = nonAdminUsers.filter((u) => u.role === "Seller").length;
  const buyerCount = nonAdminUsers.filter((u) => u.role === "Buyer").length;
  const pendingUserCount = nonAdminUsers.filter((u) => u.status === "Pending").length;

  // Database-backed aliases for overview cards & backward compatibility
  const productCount = dbProductCount;
  const serviceCount = dbServiceCount;
  const activeListingCount = dbActiveListingCount;
  const reviewListingCount = dbNeedsAttentionListingsCount;

  // ── User Creation ────────────────────────────────────────────────────────
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setFormError("Enter a valid name and email address.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          password: newPassword.trim() || undefined,
          status: "Active",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Failed to create user.");
        return;
      }

      await loadUsers();
      setNewName("");
      setNewEmail("");
      setNewRole("Buyer");
      setNewPassword("");
      setFormError("");
      setShowCreateForm(false);
      setFormSuccess("User created successfully in database.");
      setTimeout(() => setFormSuccess(""), 4000);
    } catch {
      setFormError("Network error. Could not reach server.");
    }
  }

  // ── Modal Delete Execution ───────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteModal) return;
    const { type, id } = deleteModal;

    if (type === "user") {
      const numericId = id.replace("SS-", "");
      try {
        const res = await fetch(`/api/admin/users/${numericId}`, { method: "DELETE" });
        if (res.ok) {
          setUsers((current) => current.filter((u) => u.id !== id));
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.message || "Failed to delete user.");
        }
      } catch {
        alert("Network error while deleting user.");
      }
    } else if (type === "listing") {
      setListings((current) => current.filter((l) => l.id !== id));
      setDbListings((current) => current.filter((l) => l.id !== id));
      try {
        await fetch(`/api/marketplace?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete marketplace listing", err);
      }
    }

    setDeleteModal(null);
  }

  // ── Role change ──────────────────────────────────────────────────────────
  async function changeUserRole(id: string, role: AdminUser["role"]) {
    const numericId = id.replace("SS-", "");
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      await fetch(`/api/admin/users/${numericId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch {
      await loadUsers();
    }
  }

  // ── Listing toggle ───────────────────────────────────────────────────────
  function toggleListing(id: string) {
    setListings((current) =>
      current.map((listing) =>
        listing.id === id
          ? { ...listing, status: listing.status === "Paused" ? "Active" : "Paused" }
          : listing,
      ),
    );
  }

  // ── Settings Save ────────────────────────────────────────────────────────
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");

    if (settingsNewPw && settingsNewPw !== settingsConfirmPw) {
      setSettingsError("New passwords do not match.");
      return;
    }
    if (settingsNewPw && settingsNewPw.length < 6) {
      setSettingsError("New password must be at least 6 characters.");
      return;
    }

    setSettingsLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (settingsName.trim()) payload.fullName = settingsName.trim();
      if (settingsEmail.trim()) payload.email = settingsEmail.trim();
      if (settingsNewPw) {
        payload.newPassword = settingsNewPw;
        payload.currentPassword = settingsCurrentPw;
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setSettingsError(data.message || "Failed to update settings.");
      } else {
        // Immediately update topbar profile pill!
        const updatedName = settingsName.trim() || adminProfile.fullName;
        const updatedEmail = settingsEmail.trim() || adminProfile.email;
        setAdminProfile({
          fullName: updatedName,
          email: updatedEmail,
        });

        // Also update localStorage user so it persists across other pages
        try {
          const stored = localStorage.getItem("ss_auth_user");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.fullName = updatedName;
            parsed.email = updatedEmail;
            localStorage.setItem("ss_auth_user", JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }

        setSettingsSuccess("Profile and settings updated successfully!");
        setSettingsCurrentPw("");
        setSettingsNewPw("");
        setSettingsConfirmPw("");
        setTimeout(() => setSettingsSuccess(""), 4000);
      }
    } catch {
      setSettingsError("Network error. Could not save settings.");
    } finally {
      setSettingsLoading(false);
    }
  }

  // ── Website Content Section Save ─────────────────────────────────────────
  async function saveWebsiteSection(sectionKey: string, sectionData: Record<string, string>) {
    setWebSaving(true);
    setWebSuccess("");
    setWebError("");

    try {
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey,
          content: sectionData,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setWebError(data.message || "Failed to save section content.");
      } else {
        setWebSuccess(`Section "${sectionKey}" saved successfully! Live website updated.`);
        setTimeout(() => setWebSuccess(""), 4000);
      }
    } catch {
      setWebError("Network error. Could not save website content.");
    } finally {
      setWebSaving(false);
    }
  }

  function updateSectionField(sectionKey: string, fieldKey: string, value: string) {
    setSiteContent((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [fieldKey]: value,
      },
    }));
  }

  // Compute initials for the topbar user avatar
  const avatarInitials = useMemo(() => {
    const parts = (adminProfile.fullName || "PA").trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || "PA").slice(0, 2).toUpperCase();
  }, [adminProfile.fullName]);

  // Nav Items
  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Users", icon: Users },
    { label: "Marketplace", icon: Boxes },
    { label: "Manage Website", icon: Globe },
    { label: "Settings", icon: Settings },
  ] as const;

  // Prevent unauthorized view flash for non-admin users
  if (authLoading || !isAuthenticated || authUser?.role !== "ADMIN") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#0F2C59",
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, sans-serif",
          gap: "16px",
        }}
      >
        <ShieldCheck size={48} color="#FFB800" />
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          {authLoading ? "Verifying administrative access…" : "Checking Permissions…"}
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "0.9rem", margin: 0 }}>
          {authUser && authUser.role !== "ADMIN"
            ? "Administrative privileges required. Redirecting to your workspace…"
            : "Please wait while we verify your session…"}
        </p>
      </div>
    );
  }

  return (
    <div className="admin-demo-shell">
      {/* ── Sidebar Navigation ────────────────────────────────────────── */}
      <aside className={`admin-demo-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar-top">
          <Link className="admin-demo-brand" href="/">
            <span className="admin-brand-icon">
              <Sun size={22} />
            </span>
            <span className="admin-brand-text">
              Solar<strong>Scope</strong>
            </span>
          </Link>
          <button
            type="button"
            className="admin-mobile-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-nav-caption">PLATFORM</div>

        <nav className="admin-demo-nav" aria-label="Admin sections">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={`admin-nav-item ${activeSection === label ? "is-active" : ""}`}
              onClick={() => {
                setActiveSection(label);
                setMobileNavOpen(false);
                setSearch("");
                setShowCreateForm(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Marketplace" && (
                <span className="admin-nav-count" aria-hidden="true">{dbListings.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-note">
            <ShieldCheck size={18} />
            <span>Admin Workspace</span>
          </div>
          <span className="admin-sidebar-sub">SolarScope platform operations</span>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="admin-demo-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu size={19} />
            </button>
            <div className="admin-breadcrumb">
              SolarScope <span>/</span> Admin <span>/</span>{" "}
              <strong>{activeSection}</strong>
            </div>
          </div>

          <div className="admin-top-actions">
            {/* Dynamic Admin Profile Pill */}
            <div className="admin-user-pill">
              <span className="admin-avatar" aria-label={adminProfile.fullName}>
                {avatarInitials}
              </span>
              <span className="admin-user-name">{adminProfile.fullName}</span>
            </div>
            <button
              type="button"
              className="admin-logout-button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut size={15} /> <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="admin-content">
          {/* Section Heading Banner */}
          <section className="admin-page-heading">
            <div>
              <div className="admin-overline">
                PLATFORM OPERATIONS <span>·</span> ADMINISTRATION
              </div>
              <h1>
                {activeSection === "Overview"
                  ? "Platform overview"
                  : activeSection === "Settings"
                    ? "Account settings"
                    : activeSection === "Manage Website"
                      ? "Manage Website Content"
                      : activeSection}
              </h1>
              <p>
                {activeSection === "Overview"
                  ? "A snapshot of activity across the SolarScope marketplace."
                  : activeSection === "Users"
                    ? "Review and manage platform accounts."
                    : activeSection === "Settings"
                      ? "Update your profile, email and password."
                      : activeSection === "Manage Website"
                        ? "Customize live landing page headlines, copy, badges, and contact details."
                        : "Review product and service listings."}
              </p>
            </div>

            {activeSection === "Users" && (
              <div className="admin-heading-actions">
                <Link href="/admin/users/new" className="admin-create-button admin-create-link">
                  <UserPlus size={16} />
                  <span>Dedicated Add Page</span>
                </Link>
                <button
                  className="admin-create-button"
                  type="button"
                  onClick={() => {
                    setShowCreateForm((prev) => !prev);
                    setFormError("");
                    setFormSuccess("");
                  }}
                >
                  <Plus size={16} />
                  <span>Add user</span>
                </button>
              </div>
            )}
          </section>

          {/* ── VIEW 1: OVERVIEW ───────────────────────────────────────── */}
          {activeSection === "Overview" && (
            <>
              {/* KPI Metrics */}
              <section className="admin-kpi-grid" aria-label="Platform metrics">
                <article className="admin-kpi">
                  <div className="admin-kpi-top">
                    <span>Total users</span>
                    <span className="admin-kpi-icon admin-kpi-blue">
                      <Users size={18} />
                    </span>
                  </div>
                  <strong>{usersLoading ? "—" : nonAdminUsers.length}</strong>
                  <small>
                    {usersLoading ? "Loading…" : `${buyerCount} buyers · ${sellerCount} sellers`}
                  </small>
                </article>

                <article className="admin-kpi">
                  <div className="admin-kpi-top">
                    <span>Seller accounts</span>
                    <span className="admin-kpi-icon admin-kpi-gold">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <strong>{usersLoading ? "—" : sellerCount}</strong>
                  <small>
                    {usersLoading
                      ? "Loading…"
                      : `${pendingUserCount} pending account${pendingUserCount === 1 ? "" : "s"}`}
                  </small>
                </article>

                <article
                  className="admin-kpi is-clickable"
                  onClick={() => {
                    setActiveSection("Marketplace");
                    setMarketplaceTab("PRODUCTS");
                  }}
                  title="Click to view Products catalog in Marketplace"
                  style={{ cursor: "pointer" }}
                >
                  <div className="admin-kpi-top">
                    <span>Product listings</span>
                    <span className="admin-kpi-icon admin-kpi-green">
                      <Package size={18} />
                    </span>
                  </div>
                  <strong>{marketplaceLoading ? "…" : dbProductCount}</strong>
                  <small>
                    {marketplaceLoading
                      ? "Loading…"
                      : `${dbActiveProductCount} active marketplace listing${dbActiveProductCount === 1 ? "" : "s"}`}
                  </small>
                </article>

                <article
                  className="admin-kpi is-clickable"
                  onClick={() => {
                    setActiveSection("Marketplace");
                    setMarketplaceTab("SERVICES");
                  }}
                  title="Click to view Services catalog in Marketplace"
                  style={{ cursor: "pointer" }}
                >
                  <div className="admin-kpi-top">
                    <span>Service listings</span>
                    <span className="admin-kpi-icon admin-kpi-coral">
                      <Wrench size={18} />
                    </span>
                  </div>
                  <strong>{marketplaceLoading ? "…" : dbServiceCount}</strong>
                  <small>
                    {marketplaceLoading
                      ? "Loading…"
                      : dbInactiveServiceCount > 0
                      ? `${dbInactiveServiceCount} listing${dbInactiveServiceCount === 1 ? "" : "s"} awaiting review`
                      : `${dbActiveServiceCount} active marketplace listing${dbActiveServiceCount === 1 ? "" : "s"}`}
                  </small>
                </article>
              </section>

              {/* Overview Split Grid */}
              <section className="admin-overview-grid">
                {/* Inventory Breakdown */}
                <article className="admin-panel admin-chart-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h2>Marketplace inventory</h2>
                      <p>Current product and service listing totals</p>
                    </div>
                  </div>
                  <div className="admin-inventory-list">
                    <div
                      className="admin-inventory-item"
                      onClick={() => {
                        setActiveSection("Marketplace");
                        setMarketplaceTab("PRODUCTS");
                      }}
                      style={{ cursor: "pointer" }}
                      title="View Products in Marketplace"
                    >
                      <span className="admin-inventory-icon admin-kpi-green">
                        <Package size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Products</strong>
                        <small>Solar equipment and accessories</small>
                      </span>
                      <b>{marketplaceLoading ? "…" : dbProductCount}</b>
                    </div>
                    <div
                      className="admin-inventory-item"
                      onClick={() => {
                        setActiveSection("Marketplace");
                        setMarketplaceTab("SERVICES");
                      }}
                      style={{ cursor: "pointer" }}
                      title="View Services in Marketplace"
                    >
                      <span className="admin-inventory-icon admin-kpi-coral">
                        <Wrench size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Services</strong>
                        <small>Installation, maintenance and more</small>
                      </span>
                      <b>{marketplaceLoading ? "…" : dbServiceCount}</b>
                    </div>
                    <div
                      className="admin-inventory-item"
                      onClick={() => {
                        setActiveSection("Marketplace");
                      }}
                      style={{ cursor: "pointer" }}
                      title="View Active Listings in Marketplace"
                    >
                      <span className="admin-inventory-icon admin-kpi-blue">
                        <ShieldCheck size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Active listings</strong>
                        <small>Currently visible in the marketplace</small>
                      </span>
                      <b>{marketplaceLoading ? "…" : dbActiveListingCount}</b>
                    </div>
                  </div>
                </article>

                {/* Attention Panel */}
                <article className="admin-panel admin-attention-panel">
                  <div className="admin-panel-head">
                    <div>
                      <h2>Needs attention</h2>
                      <p>Current records requiring review</p>
                    </div>
                    <span className="admin-attention-count">
                      {usersLoading || marketplaceLoading
                        ? "…"
                        : pendingUserCount + dbNeedsAttentionListingsCount}
                    </span>
                  </div>

                  <div className="admin-attention-body">
                    <button
                      type="button"
                      className="admin-attention-row"
                      onClick={() => setActiveSection("Users")}
                      title="Review Pending Seller Accounts"
                    >
                      <span className="attention-dot attention-amber" />
                      <span className="admin-attention-info">
                        <strong>Seller accounts</strong>
                        <small>Pending account status</small>
                      </span>
                      <b>{usersLoading ? "…" : pendingUserCount}</b>
                    </button>

                    <button
                      type="button"
                      className="admin-attention-row"
                      onClick={() => setActiveSection("Marketplace")}
                      title="Review Listings Requiring Attention"
                    >
                      <span className="attention-dot attention-blue" />
                      <span className="admin-attention-info">
                        <strong>Listings</strong>
                        <small>Awaiting listing review</small>
                      </span>
                      <b>{marketplaceLoading ? "…" : dbNeedsAttentionListingsCount}</b>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="admin-review-link"
                    onClick={() => setActiveSection("Marketplace")}
                  >
                    <span>Review marketplace</span>
                    <ArrowUpRight size={14} />
                  </button>
                </article>
              </section>

              {/* Recent Users Table */}
              <section className="admin-panel admin-recent-panel">
                <div className="admin-panel-head">
                  <div>
                    <h2>Recent users</h2>
                    <p>Latest accounts registered on the platform</p>
                  </div>
                  <button
                    type="button"
                    className="admin-view-all"
                    onClick={() => setActiveSection("Users")}
                  >
                    <span>View all</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                {usersLoading ? (
                  <p className="admin-no-results">Loading users…</p>
                ) : (
                  <UserTable
                    users={nonAdminUsers.slice(0, 5)}
                    onDelete={(id, name, email) =>
                      setDeleteModal({
                        type: "user",
                        id,
                        title: name,
                        subtitle: email,
                      })
                    }
                    onRoleChange={changeUserRole}
                  />
                )}
              </section>
            </>
          )}

          {/* ── VIEW 2: USERS ─────────────────────────────────────────── */}
          {activeSection === "Users" && (
            <section className="admin-panel admin-data-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>
                    All users{" "}
                    <span className="admin-table-count">{nonAdminUsers.length}</span>
                  </h2>
                  <p>Manage buyer and seller accounts</p>
                </div>
                <label className="admin-search">
                  <Search size={16} />
                  <span className="sr-only">Search users</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search users"
                  />
                </label>
              </div>

              {/* Success banner */}
              {formSuccess && (
                <p className="admin-inline-success" role="status">{formSuccess}</p>
              )}

              {/* Inline Quick Add Form with Eye Icon */}
              {showCreateForm && (
                <form className="admin-inline-form" onSubmit={createUser}>
                  <div className="admin-inline-form-fields">
                    <label>
                      <span>Name</span>
                      <input
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        placeholder="email@example.com"
                        required
                      />
                    </label>
                    <label>
                      <span>Password</span>
                      <div className="admin-input-pw-wrap">
                        <input
                          type={showQuickAddPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="Min 6 chars (optional)"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="admin-input-pw-toggle"
                          onClick={() => setShowQuickAddPw((v) => !v)}
                          aria-label={showQuickAddPw ? "Hide password" : "Show password"}
                        >
                          {showQuickAddPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>
                    <label>
                      <span>Role</span>
                      <select
                        value={newRole}
                        onChange={(event) =>
                          setNewRole(event.target.value as "Buyer" | "Seller")
                        }
                      >
                        <option value="Buyer">Buyer</option>
                        <option value="Seller">Seller</option>
                      </select>
                    </label>
                  </div>
                  <div className="admin-inline-form-actions">
                    <button className="admin-create-button" type="submit">
                      <Check size={15} /> Create
                    </button>
                    <button
                      className="admin-quiet-button"
                      type="button"
                      aria-label="Close create user form"
                      onClick={() => setShowCreateForm(false)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  {formError && (
                    <p className="admin-inline-error" role="alert">{formError}</p>
                  )}
                </form>
              )}

              {usersLoading ? (
                <p className="admin-no-results">Loading users from database…</p>
              ) : (
                <UserTable
                  users={filteredUsers.filter((u) => u.role !== "Admin")}
                  onDelete={(id, name, email) =>
                    setDeleteModal({
                      type: "user",
                      id,
                      title: name,
                      subtitle: email,
                    })
                  }
                  onRoleChange={changeUserRole}
                />
              )}
            </section>
          )}

          {/* ── VIEW 3: MARKETPLACE MANAGEMENT (TASK 05 DYNAMIC DATABASE INTEGRATION) ── */}
          {activeSection === "Marketplace" && (
            <section className="admin-panel admin-data-panel">
              <div className="admin-panel-head" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2>
                    Marketplace Management{" "}
                    <span className="admin-table-count">
                      {marketplaceTab === "PRODUCTS" ? filteredProducts.length : filteredServices.length}
                    </span>
                  </h2>
                  <p>Database-backed equipment inventory and certified solar installation services</p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="admin-mp-refresh-btn"
                    onClick={() => loadDbListings()}
                    disabled={marketplaceLoading}
                    title="Refresh from Database"
                  >
                    <RefreshCw size={14} className={marketplaceLoading ? "spin-animation" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* ── A. Marketplace Structure: Independent Segmented Switcher ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", margin: "14px 0" }}>
                <div className="admin-mp-segmented-nav" role="tablist" aria-label="Marketplace section tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={marketplaceTab === "PRODUCTS"}
                    className={`admin-mp-nav-btn ${marketplaceTab === "PRODUCTS" ? "is-active" : ""}`}
                    onClick={() => {
                      setMarketplaceTab("PRODUCTS");
                      setProdPage(1);
                    }}
                  >
                    <Package size={16} />
                    <span>Hardware Products</span>
                    <span className="admin-mp-count-badge">{allDbProducts.length}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={marketplaceTab === "SERVICES"}
                    className={`admin-mp-nav-btn ${marketplaceTab === "SERVICES" ? "is-active" : ""}`}
                    onClick={() => {
                      setMarketplaceTab("SERVICES");
                      setServPage(1);
                    }}
                  >
                    <Wrench size={16} />
                    <span>Installation Services</span>
                    <span className="admin-mp-count-badge">{allDbServices.length}</span>
                  </button>
                </div>
              </div>

              {/* ── B & D. PRODUCTS SECTION & TABLE ── */}
              {marketplaceTab === "PRODUCTS" && (
                <div className="admin-mp-container">
                  {/* Products Filters Toolbar (Requirement D) */}
                  <div className="admin-mp-filter-toolbar">
                    <div className="admin-mp-filter-group">
                      {/* Search */}
                      <label className="admin-search" style={{ maxWidth: "260px" }}>
                        <Search size={15} />
                        <span className="sr-only">Search products</span>
                        <input
                          value={prodSearch}
                          onChange={(e) => {
                            setProdSearch(e.target.value);
                            setProdPage(1);
                          }}
                          placeholder="Search product, brand..."
                        />
                      </label>

                      {/* Category Filter */}
                      <select
                        className="admin-mp-select"
                        value={prodCategory}
                        onChange={(e) => {
                          setProdCategory(e.target.value);
                          setProdPage(1);
                        }}
                        aria-label="Filter by category"
                      >
                        <option value="ALL">All Categories</option>
                        {uniqueProdCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {/* Seller Filter */}
                      <select
                        className="admin-mp-select"
                        value={prodSeller}
                        onChange={(e) => {
                          setProdSeller(e.target.value);
                          setProdPage(1);
                        }}
                        aria-label="Filter by seller"
                      >
                        <option value="ALL">All Registered Sellers</option>
                        {uniqueSellers.map((seller) => (
                          <option key={seller.email || seller.id} value={seller.email || seller.name}>
                            {seller.name} {seller.email ? `(${seller.email})` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Status Filter */}
                      <select
                        className="admin-mp-select"
                        value={prodStatus}
                        onChange={(e) => {
                          setProdStatus(e.target.value);
                          setProdPage(1);
                        }}
                        aria-label="Filter by status"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active Only</option>
                        <option value="INACTIVE">Inactive / Draft</option>
                      </select>

                      {/* Price Range Filter */}
                      <select
                        className="admin-mp-select"
                        value={prodPriceRange}
                        onChange={(e) => {
                          setProdPriceRange(e.target.value);
                          setProdPage(1);
                        }}
                        aria-label="Filter by price range"
                      >
                        <option value="ALL">All Price Ranges</option>
                        <option value="UNDER_50K">Under PKR 50,000</option>
                        <option value="50K_200K">PKR 50,000 - 200,000</option>
                        <option value="200K_500K">PKR 200,000 - 500,000</option>
                        <option value="ABOVE_500K">Above PKR 500,000</option>
                      </select>
                    </div>

                    {(prodSearch || prodCategory !== "ALL" || prodSeller !== "ALL" || prodStatus !== "ALL" || prodPriceRange !== "ALL") && (
                      <button
                        type="button"
                        className="admin-quiet-button"
                        style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600 }}
                        onClick={() => {
                          setProdSearch("");
                          setProdCategory("ALL");
                          setProdSeller("ALL");
                          setProdStatus("ALL");
                          setProdPriceRange("ALL");
                          setProdPage(1);
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Products Table (Requirement B) */}
                  <div className="admin-table-wrap">
                    {marketplaceLoading ? (
                      <p className="admin-no-results">Loading products from PostgreSQL database…</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="admin-no-results">No products matched the filter criteria.</p>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ width: "60px" }}>Product Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Seller Name & Email</th>
                            <th>Status</th>
                            <th>Created Date</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProducts.map((prod) => {
                            const isActive = prod.status === "ACTIVE";
                            const sellerObj = {
                              id: prod.ownerId,
                              name: prod.sellerName || prod.sellerCompany || "Registered Seller",
                              email: prod.sellerEmail || "seller@solarscope.pk",
                              phone: prod.sellerPhone || "+92 300 1234567",
                              company: prod.sellerCompany || "SolarScope Engineering Solutions",
                              title: prod.sellerRole || "Senior PV Systems Designer",
                              city: prod.sellerCity || "Karachi, Pakistan",
                            };

                            const thumbSrc = prod.imageDataUrl || getListingImage(prod);
                            const priceNum = parseFloat(String(prod.price || "0").replace(/[^0-9.]/g, "")) || 0;
                            const stockNum = prod.stock !== undefined ? Number(prod.stock) : 10;

                            return (
                              <tr key={prod.id}>
                                {/* 1. Product Image */}
                                <td>
                                  <div className="admin-tbl-thumb-wrap">
                                    <img
                                      src={thumbSrc}
                                      alt={prod.title}
                                      className="admin-tbl-thumb-img"
                                    />
                                  </div>
                                </td>

                                {/* 2. Product Name & Brand */}
                                <td>
                                  <div className="admin-tbl-name-cell">
                                    <strong title={prod.title}>{prod.title}</strong>
                                    <small>{prod.brand ? `${prod.brand} • ` : ""}ID: {prod.id}</small>
                                  </div>
                                </td>

                                {/* 3. Category */}
                                <td>
                                  <span className="admin-mp-category-pill">{prod.category}</span>
                                </td>

                                {/* 4. Price */}
                                <td>
                                  <span className="admin-mp-price-text">PKR {priceNum.toLocaleString("en-PK")}</span>
                                </td>

                                {/* 5. Stock */}
                                <td>
                                  <span
                                    className={`admin-mp-stock-pill ${
                                      stockNum > 0 ? "admin-mp-stock--in" : "admin-mp-stock--out"
                                    }`}
                                  >
                                    {stockNum > 0 ? `${stockNum} units` : "Out of Stock"}
                                  </span>
                                </td>

                                {/* 6 & 7. Seller Name & Email */}
                                <td>
                                  <div className="admin-seller-link-cell">
                                    <button
                                      type="button"
                                      className="admin-seller-link-btn"
                                      onClick={() => setInspectedSeller(sellerObj)}
                                      title="Inspect Seller Profile"
                                    >
                                      {sellerObj.name}
                                    </button>
                                    <span className="admin-seller-email-sub">{sellerObj.email}</span>
                                  </div>
                                </td>

                                {/* 8. Status (Click to Toggle) */}
                                <td>
                                  <button
                                    type="button"
                                    className={`admin-status-toggle-chip ${
                                      isActive ? "admin-status--active" : "admin-status--inactive"
                                    }`}
                                    onClick={() => toggleDbListingStatus(prod)}
                                    title={`Click to ${isActive ? "deactivate" : "activate"}`}
                                  >
                                    <span className="admin-status-dot" />
                                    <span>{isActive ? "Active" : "Inactive"}</span>
                                  </button>
                                </td>

                                {/* 9. Created Date */}
                                <td>
                                  <span style={{ fontSize: "12px", color: "#64748B", whiteSpace: "nowrap" }}>
                                    {prod.createdAt
                                      ? new Date(prod.createdAt).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "Recent"}
                                  </span>
                                </td>

                                {/* 10. Actions */}
                                <td style={{ textAlign: "right" }}>
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      className="admin-row-action"
                                      onClick={() => setInspectedSeller(sellerObj)}
                                      title="View Seller Profile & Catalog"
                                    >
                                      View Seller
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-row-action"
                                      onClick={() => toggleDbListingStatus(prod)}
                                      title={isActive ? "Deactivate listing" : "Activate listing"}
                                    >
                                      {isActive ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      className="admin-quiet-button"
                                      type="button"
                                      aria-label={`Delete ${prod.title}`}
                                      title="Delete listing from database"
                                      onClick={() =>
                                        setDeleteModal({
                                          type: "listing",
                                          id: prod.id,
                                          title: prod.title,
                                          subtitle: `Product • Seller: ${sellerObj.name}`,
                                        })
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Products Pagination */}
                  {filteredProducts.length > mpPageSize && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", flexWrap: "wrap", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>
                        Showing {(prodPage - 1) * mpPageSize + 1} to{" "}
                        {Math.min(prodPage * mpPageSize, filteredProducts.length)} of {filteredProducts.length} products
                      </span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="admin-quiet-button"
                          disabled={prodPage <= 1}
                          onClick={() => setProdPage((p) => Math.max(1, p - 1))}
                          style={{ padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F2C59" }}>
                          Page {prodPage} of {totalProdPages}
                        </span>
                        <button
                          type="button"
                          className="admin-quiet-button"
                          disabled={prodPage >= totalProdPages}
                          onClick={() => setProdPage((p) => Math.min(totalProdPages, p + 1))}
                          style={{ padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── C & D. SERVICES SECTION & TABLE ── */}
              {marketplaceTab === "SERVICES" && (
                <div className="admin-mp-container">
                  {/* Services Filters Toolbar (Requirement D) */}
                  <div className="admin-mp-filter-toolbar">
                    <div className="admin-mp-filter-group">
                      {/* Search */}
                      <label className="admin-search" style={{ maxWidth: "260px" }}>
                        <Search size={15} />
                        <span className="sr-only">Search services</span>
                        <input
                          value={servSearch}
                          onChange={(e) => {
                            setServSearch(e.target.value);
                            setServPage(1);
                          }}
                          placeholder="Search service, area..."
                        />
                      </label>

                      {/* Category Filter */}
                      <select
                        className="admin-mp-select"
                        value={servCategory}
                        onChange={(e) => {
                          setServCategory(e.target.value);
                          setServPage(1);
                        }}
                        aria-label="Filter by service type"
                      >
                        <option value="ALL">All Service Types</option>
                        {uniqueServCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {/* Seller Filter */}
                      <select
                        className="admin-mp-select"
                        value={servSeller}
                        onChange={(e) => {
                          setServSeller(e.target.value);
                          setServPage(1);
                        }}
                        aria-label="Filter by seller"
                      >
                        <option value="ALL">All Registered Providers</option>
                        {uniqueSellers.map((seller) => (
                          <option key={seller.email || seller.id} value={seller.email || seller.name}>
                            {seller.name} {seller.email ? `(${seller.email})` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Status Filter */}
                      <select
                        className="admin-mp-select"
                        value={servStatus}
                        onChange={(e) => {
                          setServStatus(e.target.value);
                          setServPage(1);
                        }}
                        aria-label="Filter by status"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active Only</option>
                        <option value="INACTIVE">Inactive / Draft</option>
                      </select>

                      {/* Location Filter */}
                      <select
                        className="admin-mp-select"
                        value={servLocation}
                        onChange={(e) => {
                          setServLocation(e.target.value);
                          setServPage(1);
                        }}
                        aria-label="Filter by coverage area"
                      >
                        <option value="ALL">All Service Locations</option>
                        {uniqueServLocations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(servSearch || servCategory !== "ALL" || servSeller !== "ALL" || servStatus !== "ALL" || servLocation !== "ALL") && (
                      <button
                        type="button"
                        className="admin-quiet-button"
                        style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600 }}
                        onClick={() => {
                          setServSearch("");
                          setServCategory("ALL");
                          setServSeller("ALL");
                          setServStatus("ALL");
                          setServLocation("ALL");
                          setServPage(1);
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Services Table (Requirement C) */}
                  <div className="admin-table-wrap">
                    {marketplaceLoading ? (
                      <p className="admin-no-results">Loading services from PostgreSQL database…</p>
                    ) : filteredServices.length === 0 ? (
                      <p className="admin-no-results">No services matched the filter criteria.</p>
                    ) : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ width: "60px" }}>Service Image</th>
                            <th>Service Name</th>
                            <th>Category</th>
                            <th>Base Fee</th>
                            <th>Service Location</th>
                            <th>Seller Name & Email</th>
                            <th>Status</th>
                            <th>Created Date</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedServices.map((serv) => {
                            const isActive = serv.status === "ACTIVE";
                            const sellerObj = {
                              id: serv.ownerId,
                              name: serv.sellerName || serv.sellerCompany || "Registered Seller",
                              email: serv.sellerEmail || "seller@solarscope.pk",
                              phone: serv.sellerPhone || "+92 300 1234567",
                              company: serv.sellerCompany || "SolarScope Engineering Solutions",
                              title: serv.sellerRole || "Senior PV Systems Designer",
                              city: serv.sellerCity || "Karachi, Pakistan",
                            };

                            const thumbSrc = serv.imageDataUrl || getListingImage(serv);
                            const priceNum = parseFloat(String(serv.price || "0").replace(/[^0-9.]/g, "")) || 0;

                            return (
                              <tr key={serv.id}>
                                {/* 1. Service Image */}
                                <td>
                                  <div className="admin-tbl-thumb-wrap">
                                    <img
                                      src={thumbSrc}
                                      alt={serv.title}
                                      className="admin-tbl-thumb-img"
                                    />
                                  </div>
                                </td>

                                {/* 2. Service Name & Snippet */}
                                <td>
                                  <div className="admin-tbl-name-cell">
                                    <strong title={serv.title}>{serv.title}</strong>
                                    <small>{serv.description ? serv.description.slice(0, 48) : "Turnkey Engineering Service"}</small>
                                  </div>
                                </td>

                                {/* 3. Category */}
                                <td>
                                  <span className="admin-mp-category-pill">{serv.category}</span>
                                </td>

                                {/* 4. Base Fee */}
                                <td>
                                  <span className="admin-mp-price-text">PKR {priceNum.toLocaleString("en-PK")}</span>
                                </td>

                                {/* 5. Service Location */}
                                <td>
                                  <span className="admin-mp-location-pill">
                                    <MapPin size={11} />
                                    <span>{serv.coverageArea || "Karachi & Nationwide"}</span>
                                  </span>
                                </td>

                                {/* 6 & 7. Seller Name & Email */}
                                <td>
                                  <div className="admin-seller-link-cell">
                                    <button
                                      type="button"
                                      className="admin-seller-link-btn"
                                      onClick={() => setInspectedSeller(sellerObj)}
                                      title="Inspect Seller Profile"
                                    >
                                      {sellerObj.name}
                                    </button>
                                    <span className="admin-seller-email-sub">{sellerObj.email}</span>
                                  </div>
                                </td>

                                {/* 8. Status (Click to Toggle) */}
                                <td>
                                  <button
                                    type="button"
                                    className={`admin-status-toggle-chip ${
                                      isActive ? "admin-status--active" : "admin-status--inactive"
                                    }`}
                                    onClick={() => toggleDbListingStatus(serv)}
                                    title={`Click to ${isActive ? "deactivate" : "activate"}`}
                                  >
                                    <span className="admin-status-dot" />
                                    <span>{isActive ? "Active" : "Inactive"}</span>
                                  </button>
                                </td>

                                {/* 9. Created Date */}
                                <td>
                                  <span style={{ fontSize: "12px", color: "#64748B", whiteSpace: "nowrap" }}>
                                    {serv.createdAt
                                      ? new Date(serv.createdAt).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "Recent"}
                                  </span>
                                </td>

                                {/* 10. Actions */}
                                <td style={{ textAlign: "right" }}>
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      className="admin-row-action"
                                      onClick={() => setInspectedSeller(sellerObj)}
                                      title="View Seller Profile & Catalog"
                                    >
                                      View Seller
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-row-action"
                                      onClick={() => toggleDbListingStatus(serv)}
                                      title={isActive ? "Deactivate service" : "Activate service"}
                                    >
                                      {isActive ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      className="admin-quiet-button"
                                      type="button"
                                      aria-label={`Delete ${serv.title}`}
                                      title="Delete service from database"
                                      onClick={() =>
                                        setDeleteModal({
                                          type: "listing",
                                          id: serv.id,
                                          title: serv.title,
                                          subtitle: `Service • Provider: ${sellerObj.name}`,
                                        })
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Services Pagination */}
                  {filteredServices.length > mpPageSize && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", flexWrap: "wrap", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#64748B" }}>
                        Showing {(servPage - 1) * mpPageSize + 1} to{" "}
                        {Math.min(servPage * mpPageSize, filteredServices.length)} of {filteredServices.length} services
                      </span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="admin-quiet-button"
                          disabled={servPage <= 1}
                          onClick={() => setServPage((p) => Math.max(1, p - 1))}
                          style={{ padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0F2C59" }}>
                          Page {servPage} of {totalServPages}
                        </span>
                        <button
                          type="button"
                          className="admin-quiet-button"
                          disabled={servPage >= totalServPages}
                          onClick={() => setServPage((p) => Math.min(totalServPages, p + 1))}
                          style={{ padding: "4px 10px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── VIEW 4: MANAGE WEBSITE ─────────────────────────────────── */}
          {activeSection === "Manage Website" && (
            <section className="admin-panel admin-data-panel">
              {webSuccess && (
                <p className="admin-inline-success" role="status">
                  <Check size={16} />
                  <span>{webSuccess}</span>
                </p>
              )}
              {webError && (
                <p className="admin-inline-error" role="alert">{webError}</p>
              )}

              <div className="admin-website-layout">
                {/* Left Side: Section Selection */}
                <aside className="admin-website-sidebar">
                  <div className="admin-website-sidebar-title">Landing Page Sections</div>
                  {WEBSITE_SECTIONS.map((sec) => (
                    <button
                      key={sec.key}
                      type="button"
                      className={`admin-website-nav-btn ${selectedWebSection === sec.key ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedWebSection(sec.key);
                        setWebSuccess("");
                        setWebError("");
                      }}
                    >
                      <div className="admin-website-nav-left">
                        <span>{sec.icon}</span>
                        <span>{sec.label}</span>
                      </div>
                      <ChevronRight size={14} />
                    </button>
                  ))}

                  <div className="admin-website-notice">
                    <strong>Note:</strong> Solar Marketplace section content is managed directly under the <strong>Marketplace</strong> tab to preserve certified product catalogs.
                  </div>
                </aside>

                {/* Right Side: Section Fields Editor */}
                <div className="admin-website-editor-card">
                  {webContentLoading ? (
                    <p className="admin-no-results">Loading website content…</p>
                  ) : (
                    <SectionEditor
                      sectionKey={selectedWebSection}
                      content={siteContent[selectedWebSection] || {}}
                      onChange={(field, value) => updateSectionField(selectedWebSection, field, value)}
                      onSave={() => saveWebsiteSection(selectedWebSection, siteContent[selectedWebSection] || {})}
                      isSaving={webSaving}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── VIEW 5: SETTINGS ───────────────────────────────────────── */}
          {activeSection === "Settings" && (
            <section className="admin-panel admin-data-panel">
              <form
                className="admin-settings-form"
                onSubmit={saveSettings}
                autoComplete="off"
                noValidate
              >
                {/* Profile Section */}
                <div className="admin-settings-group">
                  <div className="admin-settings-group-header">
                    <User size={18} />
                    <div>
                      <h3>Profile information</h3>
                      <p>Update your display name and email address</p>
                    </div>
                  </div>

                  <div className="admin-settings-fields">
                    <label className="admin-settings-label">
                      <span>Full name</span>
                      <div className="admin-settings-input-wrap">
                        <User size={16} className="admin-settings-input-icon" />
                        <input
                          type="text"
                          className="admin-settings-input"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          placeholder="Your full name"
                        />
                      </div>
                    </label>

                    <label className="admin-settings-label">
                      <span>Email address</span>
                      <div className="admin-settings-input-wrap">
                        <Mail size={16} className="admin-settings-input-icon" />
                        <input
                          type="email"
                          className="admin-settings-input"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          placeholder="admin@example.com"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Password Section */}
                <div className="admin-settings-group">
                  <div className="admin-settings-group-header">
                    <Lock size={18} />
                    <div>
                      <h3>Change password</h3>
                      <p>Leave blank to keep your current password</p>
                    </div>
                  </div>

                  <div className="admin-settings-fields">
                    <label className="admin-settings-label">
                      <span>Current password</span>
                      <div className="admin-settings-input-wrap">
                        <Lock size={16} className="admin-settings-input-icon" />
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          className="admin-settings-input"
                          name="cur_pw_secret"
                          value={settingsCurrentPw}
                          onChange={(e) => setSettingsCurrentPw(e.target.value)}
                          placeholder="Enter current password to authorize change"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="admin-settings-eye"
                          onClick={() => setShowCurrentPw((v) => !v)}
                          aria-label={showCurrentPw ? "Hide password" : "Show password"}
                        >
                          {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>

                    <label className="admin-settings-label">
                      <span>New password</span>
                      <div className="admin-settings-input-wrap">
                        <Lock size={16} className="admin-settings-input-icon" />
                        <input
                          type={showNewPw ? "text" : "password"}
                          className="admin-settings-input"
                          name="new_pw_secret"
                          value={settingsNewPw}
                          onChange={(e) => setSettingsNewPw(e.target.value)}
                          placeholder="At least 6 characters"
                          autoComplete="new-password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="admin-settings-eye"
                          onClick={() => setShowNewPw((v) => !v)}
                          aria-label={showNewPw ? "Hide password" : "Show password"}
                        >
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>

                    <label className="admin-settings-label">
                      <span>Confirm new password</span>
                      <div className="admin-settings-input-wrap">
                        <Lock size={16} className="admin-settings-input-icon" />
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          className="admin-settings-input"
                          name="confirm_pw_secret"
                          value={settingsConfirmPw}
                          onChange={(e) => setSettingsConfirmPw(e.target.value)}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="admin-settings-eye"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          aria-label={showConfirmPw ? "Hide password" : "Show password"}
                        >
                          {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Feedback */}
                {settingsError && (
                  <p className="admin-inline-error" role="alert">{settingsError}</p>
                )}
                {settingsSuccess && (
                  <p className="admin-inline-success" role="status">{settingsSuccess}</p>
                )}

                {/* Save Button */}
                <div className="admin-settings-actions">
                  <button
                    type="submit"
                    className="admin-create-button"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <footer className="admin-footer">
            <span>SolarScope Administration</span>
            <span>Marketplace and account management</span>
          </footer>
        </div>
      </main>

      {/* ── Seller Inspection Modal (Task 05 Requirement E: Complete Profile & Listings) ── */}
      {inspectedSeller && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setInspectedSeller(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-modal-card"
            style={{ maxWidth: "860px", width: "95%", maxHeight: "90vh", overflowY: "auto", background: "#FFFFFF", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Hero Card (SolarScope Brand Gradient) */}
            <div className="admin-seller-hero-card">
              <div className="admin-seller-hero-info">
                <div className="admin-seller-hero-avatar">
                  {inspectedSeller.name ? inspectedSeller.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <h3 className="admin-seller-hero-name">{inspectedSeller.name}</h3>
                    <span className="admin-seller-hero-badge">
                      <ShieldCheck size={13} />
                      <span>Certified PV Designer</span>
                    </span>
                  </div>
                  <div className="admin-seller-hero-role">
                    <span>{inspectedSeller.title || "Senior PV Systems Designer"}</span>
                    <span style={{ margin: "0 6px", opacity: 0.6 }}>•</span>
                    <span>{inspectedSeller.company || "SolarScope Engineering Solutions"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="admin-quiet-button"
                onClick={() => setInspectedSeller(null)}
                style={{ color: "#FFFFFF", background: "rgba(255,255,255,0.15)", borderRadius: "6px", padding: "6px" }}
                aria-label="Close seller inspection modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Organized Seller Profile Details (Requirement E) */}
            <div className="admin-seller-details-grid">
              <div className="admin-seller-detail-block">
                <small>Full Name</small>
                <span>{inspectedSeller.name}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Email Address</small>
                <span>{inspectedSeller.email}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Contact / Phone</small>
                <span>{inspectedSeller.phone || "+92 300 1234567"}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Engineering Firm</small>
                <span>{inspectedSeller.company || "SolarScope Engineering Solutions"}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Professional Role</small>
                <span>{inspectedSeller.title || "Senior PV Systems Designer"}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Base Location</small>
                <span>{inspectedSeller.city || "Karachi, Pakistan"}</span>
              </div>
              <div className="admin-seller-detail-block">
                <small>Account Status</small>
                <span style={{ color: "#16A34A", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={14} /> Verified Seller
                </span>
              </div>
            </div>

            {/* Seller Catalog Sections (Requirement E: 2 Separate Sections) */}
            {(() => {
              const sellerEmailLower = (inspectedSeller.email || "").toLowerCase();
              const sellerNameLower = (inspectedSeller.name || "").toLowerCase();

              const sellerItems = dbListings.filter((item) => {
                const itemEmail = (item.sellerEmail || "").toLowerCase();
                const itemName = (item.sellerName || "").toLowerCase();
                const itemOwner = String(item.ownerId || "");
                return (
                  (sellerEmailLower && itemEmail === sellerEmailLower) ||
                  (sellerNameLower && itemName === sellerNameLower) ||
                  (inspectedSeller.id && itemOwner === String(inspectedSeller.id))
                );
              });

              const sellerProds = sellerItems.filter((i) => i.kind === "PRODUCT");
              const sellerServs = sellerItems.filter((i) => i.kind === "SERVICE");

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                  {/* 1. All Products Listed by This Seller */}
                  <div>
                    <h4 className="admin-seller-section-heading">
                      <Package size={18} style={{ color: "#D97706" }} />
                      <span>Hardware Products Catalog ({sellerProds.length})</span>
                    </h4>

                    {sellerProds.length === 0 ? (
                      <p style={{ color: "#64748B", fontSize: "13px", margin: 0, fontStyle: "italic" }}>
                        No physical hardware products currently listed by this seller.
                      </p>
                    ) : (
                      <div className="admin-seller-cards-grid">
                        {sellerProds.map((prod) => {
                          const thumb = prod.imageDataUrl || getListingImage(prod);
                          const isActive = prod.status === "ACTIVE";
                          const pNum = parseFloat(String(prod.price || "0").replace(/[^0-9.]/g, "")) || 0;

                          return (
                            <div key={prod.id} className="admin-seller-item-card">
                              <img src={thumb} alt={prod.title} className="admin-seller-item-thumb" />
                              <div className="admin-seller-item-body">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                                  <span className="admin-mp-category-pill" style={{ fontSize: "11px" }}>{prod.category}</span>
                                  <button
                                    type="button"
                                    className={`admin-status-toggle-chip ${isActive ? "admin-status--active" : "admin-status--inactive"}`}
                                    onClick={() => toggleDbListingStatus(prod)}
                                    title="Click to toggle status"
                                    style={{ fontSize: "11px", padding: "2px 8px" }}
                                  >
                                    <span className="admin-status-dot" />
                                    <span>{isActive ? "Active" : "Inactive"}</span>
                                  </button>
                                </div>
                                <strong title={prod.title}>{prod.title}</strong>
                                {prod.brand && <small>{prod.brand}</small>}
                                {prod.description && <p>{prod.description}</p>}
                                <div className="admin-seller-item-footer">
                                  <span className="admin-seller-item-price">PKR {pNum.toLocaleString("en-PK")}</span>
                                  <span className="admin-mp-stock-pill admin-mp-stock--in">
                                    {prod.stock !== undefined ? `${prod.stock} in stock` : "In Stock"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. All Services Listed by This Seller */}
                  <div>
                    <h4 className="admin-seller-section-heading">
                      <Wrench size={18} style={{ color: "#0284C7" }} />
                      <span>Installation & EPC Services Catalog ({sellerServs.length})</span>
                    </h4>

                    {sellerServs.length === 0 ? (
                      <p style={{ color: "#64748B", fontSize: "13px", margin: 0, fontStyle: "italic" }}>
                        No installation or maintenance services currently listed by this seller.
                      </p>
                    ) : (
                      <div className="admin-seller-cards-grid">
                        {sellerServs.map((serv) => {
                          const thumb = serv.imageDataUrl || getListingImage(serv);
                          const isActive = serv.status === "ACTIVE";
                          const pNum = parseFloat(String(serv.price || "0").replace(/[^0-9.]/g, "")) || 0;

                          return (
                            <div key={serv.id} className="admin-seller-item-card">
                              <img src={thumb} alt={serv.title} className="admin-seller-item-thumb" />
                              <div className="admin-seller-item-body">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                                  <span className="admin-mp-category-pill" style={{ fontSize: "11px" }}>{serv.category}</span>
                                  <button
                                    type="button"
                                    className={`admin-status-toggle-chip ${isActive ? "admin-status--active" : "admin-status--inactive"}`}
                                    onClick={() => toggleDbListingStatus(serv)}
                                    title="Click to toggle status"
                                    style={{ fontSize: "11px", padding: "2px 8px" }}
                                  >
                                    <span className="admin-status-dot" />
                                    <span>{isActive ? "Active" : "Inactive"}</span>
                                  </button>
                                </div>
                                <strong title={serv.title}>{serv.title}</strong>
                                {serv.description && <p>{serv.description}</p>}
                                <div className="admin-seller-item-footer">
                                  <span className="admin-seller-item-price">PKR {pNum.toLocaleString("en-PK")}</span>
                                  <span className="admin-mp-location-pill" style={{ fontSize: "11px" }}>
                                    <MapPin size={10} />
                                    <span>{serv.coverageArea || "Nationwide"}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="admin-modal-actions" style={{ marginTop: "28px", borderTop: "1px solid #E2E8F0", paddingTop: "16px" }}>
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setInspectedSeller(null)}
                style={{ background: "#0F2C59", color: "#FFFFFF", fontWeight: 700 }}
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteModal && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setDeleteModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-head">
              <div className="admin-modal-icon-danger">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 id="delete-dialog-title">
                  Confirm {deleteModal.type === "user" ? "User Account" : "Listing"} Deletion
                </h3>
              </div>
            </div>

            <div className="admin-modal-body">
              <p>Are you sure you want to permanently delete this {deleteModal.type}?</p>
              <div className="admin-modal-target-box">
                <div>{deleteModal.title}</div>
                {deleteModal.subtitle && (
                  <small style={{ color: "#64748B", fontWeight: 400 }}>{deleteModal.subtitle}</small>
                )}
              </div>
              <span className="admin-modal-warning">
                Warning: This action cannot be reversed. All linked associations will be removed.
              </span>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-modal-btn-delete"
                onClick={confirmDelete}
              >
                <Trash2 size={15} />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section Editor Component for Manage Website ─────────────────────────────
function SectionEditor({
  sectionKey,
  content,
  onChange,
  onSave,
  isSaving,
}: {
  sectionKey: string;
  content: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const sectionMeta = WEBSITE_SECTIONS.find((s) => s.key === sectionKey);

  return (
    <div>
      <div className="admin-editor-header">
        <div>
          <h3>{sectionMeta?.label || sectionKey}</h3>
          <p>{sectionMeta?.desc || "Edit content for this landing page section."}</p>
        </div>
        <button
          type="button"
          className="admin-create-button"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save size={15} />
          <span>{isSaving ? "Saving…" : "Save section changes"}</span>
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        {/* HERO BANNER FIELDS */}
        {sectionKey === "hero" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Top Pill / Badge Text</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Next-Generation Solar Intelligence Platform"
              />
            </div>
            <div className="admin-editor-field">
              <label>Headline (Main Title)</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Design. Estimate."
              />
            </div>
            <div className="admin-editor-field">
              <label>Headline Accent (Golden Text)</label>
              <input
                value={content.highlight ?? ""}
                onChange={(e) => onChange("highlight", e.target.value)}
                placeholder="Power Your Future."
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle / Description</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={3}
                placeholder="Plan rooftop solar layouts..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Primary Button Text</label>
              <input
                value={content.primaryCtaText ?? ""}
                onChange={(e) => onChange("primaryCtaText", e.target.value)}
                placeholder="Start Free Project"
              />
            </div>
            <div className="admin-editor-field">
              <label>Secondary Button Text</label>
              <input
                value={content.secondaryCtaText ?? ""}
                onChange={(e) => onChange("secondaryCtaText", e.target.value)}
                placeholder="Explore Platform"
              />
            </div>
            <div className="admin-editor-field">
              <label>Trust Badge 1</label>
              <input
                value={content.trustBadge1 ?? ""}
                onChange={(e) => onChange("trustBadge1", e.target.value)}
                placeholder="Satellite Rooftop CAD"
              />
            </div>
            <div className="admin-editor-field">
              <label>Trust Badge 2</label>
              <input
                value={content.trustBadge2 ?? ""}
                onChange={(e) => onChange("trustBadge2", e.target.value)}
                placeholder="Preliminary Yield Estimates"
              />
            </div>
          </div>
        )}

        {/* STATS / HIGHLIGHTS */}
        {sectionKey === "stats" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field">
              <label>Step 01 Label</label>
              <input
                value={content.step1 ?? ""}
                onChange={(e) => onChange("step1", e.target.value)}
                placeholder="Locate a rooftop"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 02 Label</label>
              <input
                value={content.step2 ?? ""}
                onChange={(e) => onChange("step2", e.target.value)}
                placeholder="Plan a panel layout"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 03 Label</label>
              <input
                value={content.step3 ?? ""}
                onChange={(e) => onChange("step3", e.target.value)}
                placeholder="Review energy estimates"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 04 Label</label>
              <input
                value={content.step4 ?? ""}
                onChange={(e) => onChange("step4", e.target.value)}
                placeholder="Prepare a feasibility report"
              />
            </div>
          </div>
        )}

        {/* PLATFORM OVERVIEW */}
        {sectionKey === "platform" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Section Pill</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Rooftop Intelligence"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Section Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Interactive Rooftop CAD & Solar Layout Engine"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Description Subtitle</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={3}
                placeholder="Trace roof boundaries..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Button Text</label>
              <input
                value={content.ctaText ?? ""}
                onChange={(e) => onChange("ctaText", e.target.value)}
                placeholder="Launch Solar Workspace"
              />
            </div>
          </div>
        )}

        {/* HOW IT WORKS */}
        {sectionKey === "howItWorks" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Section Pill</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Simplified Workflow"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Section Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="How SolarScope Works"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle</label>
              <input
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                placeholder="From a location pin to a preliminary report..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 1 Title</label>
              <input
                value={content.step1Title ?? ""}
                onChange={(e) => onChange("step1Title", e.target.value)}
                placeholder="Map Your Rooftop"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 2 Title</label>
              <input
                value={content.step2Title ?? ""}
                onChange={(e) => onChange("step2Title", e.target.value)}
                placeholder="Configure Panel Array"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 3 Title</label>
              <input
                value={content.step3Title ?? ""}
                onChange={(e) => onChange("step3Title", e.target.value)}
                placeholder="Analyze Yield & ROI"
              />
            </div>
            <div className="admin-editor-field">
              <label>Step 4 Title</label>
              <input
                value={content.step4Title ?? ""}
                onChange={(e) => onChange("step4Title", e.target.value)}
                placeholder="Source Hardware & Install"
              />
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {sectionKey === "financials" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Section Pill</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Financial Intelligence"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Section Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Comprehensive Energy & Financial Feasibility Modeling"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={2}
                placeholder="Engineered metrics before you invest..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Metric 1 Value & Label</label>
              <input
                value={content.stat1Val ?? ""}
                onChange={(e) => onChange("stat1Val", e.target.value)}
                placeholder="51.2 kWh"
              />
              <input
                style={{ marginTop: "6px" }}
                value={content.stat1Lbl ?? ""}
                onChange={(e) => onChange("stat1Lbl", e.target.value)}
                placeholder="Avg Daily Generation Yield"
              />
            </div>
            <div className="admin-editor-field">
              <label>Metric 2 Value & Label</label>
              <input
                value={content.stat2Val ?? ""}
                onChange={(e) => onChange("stat2Val", e.target.value)}
                placeholder="12.5 Hrs"
              />
              <input
                style={{ marginTop: "6px" }}
                value={content.stat2Lbl ?? ""}
                onChange={(e) => onChange("stat2Lbl", e.target.value)}
                placeholder="Battery Outage Backup"
              />
            </div>
            <div className="admin-editor-field">
              <label>Metric 3 Value & Label</label>
              <input
                value={content.stat3Val ?? ""}
                onChange={(e) => onChange("stat3Val", e.target.value)}
                placeholder="84%"
              />
              <input
                style={{ marginTop: "6px" }}
                value={content.stat3Lbl ?? ""}
                onChange={(e) => onChange("stat3Lbl", e.target.value)}
                placeholder="Grid Tariff Bill Reduction"
              />
            </div>
            <div className="admin-editor-field">
              <label>Metric 4 Value & Label</label>
              <input
                value={content.stat4Val ?? ""}
                onChange={(e) => onChange("stat4Val", e.target.value)}
                placeholder="3.4 Yrs"
              />
              <input
                style={{ marginTop: "6px" }}
                value={content.stat4Lbl ?? ""}
                onChange={(e) => onChange("stat4Lbl", e.target.value)}
                placeholder="System Capital Payback"
              />
            </div>
          </div>
        )}

        {/* FEATURES */}
        {sectionKey === "features" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Section Pill</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Unified Suite"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Section Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Everything You Need In One Workspace"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={3}
                placeholder="SolarScope merges industrial-grade CAD software..."
              />
            </div>
          </div>
        )}

        {/* CONTACT */}
        {sectionKey === "contact" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Section Pill</label>
              <input
                value={content.pillText ?? ""}
                onChange={(e) => onChange("pillText", e.target.value)}
                placeholder="Get In Touch"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Section Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Speak With A Solar Engineer"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={2}
                placeholder="Whether you are evaluating a rooftop..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Contact Email</label>
              <input
                value={content.email ?? ""}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="support@solarscope.io"
              />
            </div>
            <div className="admin-editor-field">
              <label>Contact Phone</label>
              <input
                value={content.phone ?? ""}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="+92-51-8849200"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Office Location</label>
              <input
                value={content.location ?? ""}
                onChange={(e) => onChange("location", e.target.value)}
                placeholder="Blue Area, Islamabad, Pakistan"
              />
            </div>
          </div>
        )}

        {/* FINAL CTA */}
        {sectionKey === "cta" && (
          <div className="admin-editor-grid">
            <div className="admin-editor-field col-span-2">
              <label>Heading</label>
              <input
                value={content.headline ?? ""}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="Ready to Transition to Clean Solar Energy?"
              />
            </div>
            <div className="admin-editor-field col-span-2">
              <label>Subtitle</label>
              <textarea
                value={content.subtitle ?? ""}
                onChange={(e) => onChange("subtitle", e.target.value)}
                rows={2}
                placeholder="Explore a solar layout and review the assumptions..."
              />
            </div>
            <div className="admin-editor-field">
              <label>Primary Button Text</label>
              <input
                value={content.btn1Text ?? ""}
                onChange={(e) => onChange("btn1Text", e.target.value)}
                placeholder="Create Free Account"
              />
            </div>
            <div className="admin-editor-field">
              <label>Secondary Button Text</label>
              <input
                value={content.btn2Text ?? ""}
                onChange={(e) => onChange("btn2Text", e.target.value)}
                placeholder="Sign In to Workspace"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── User Table Component ───────────────────────────────────────────────────
function UserTable({
  users,
  onDelete,
  onRoleChange,
}: {
  users: AdminUser[];
  onDelete: (id: string, name: string, email: string) => void;
  onRoleChange: (id: string, role: AdminUser["role"]) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const initials = user.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <tr key={user.id}>
                <td>
                  <div className="admin-user-cell">
                    <span className="admin-user-avatar">{initials}</span>
                    <div className="admin-user-info">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    className="admin-role-select"
                    aria-label={`Role for ${user.name}`}
                    value={user.role}
                    onChange={(event) =>
                      onRoleChange(user.id, event.target.value as AdminUser["role"])
                    }
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Seller">Seller</option>
                  </select>
                </td>
                <td>
                  <span className={`admin-status status-${user.status.toLowerCase()}`}>
                    <i />
                    {user.status}
                  </span>
                </td>
                <td>
                  <span className="admin-joined-text">{user.joined}</span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="admin-row-edit"
                      title={`Edit user ${user.name}`}
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </Link>
                    <button
                      className="admin-quiet-button"
                      type="button"
                      aria-label={`Delete ${user.name}`}
                      onClick={() => onDelete(user.id, user.name, user.email)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="admin-no-results">No matching records.</p>
      )}
    </div>
  );
}
