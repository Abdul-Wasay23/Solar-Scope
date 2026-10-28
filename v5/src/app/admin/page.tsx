"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  Check,
  Edit2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getStoredAdminUsers,
  saveStoredAdminUsers,
  getStoredAdminListings,
  saveStoredAdminListings,
  type AdminUser,
  type AdminListing,
} from "@/lib/admin/adminStorage";
import "./admin.css";

export default function AdminDashboardPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<"Overview" | "Users" | "Marketplace">("Overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AdminUser["role"]>("Buyer");
  const [formError, setFormError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from persistent admin storage
  useEffect(() => {
    setUsers(getStoredAdminUsers());
    setListings(getStoredAdminListings());
    setIsLoaded(true);
  }, []);

  // Sync back to storage when state changes
  useEffect(() => {
    if (!isLoaded) return;
    saveStoredAdminUsers(users);
  }, [users, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    saveStoredAdminListings(listings);
  }, [listings, isLoaded]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role} ${user.status} ${user.location || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [search, users]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((listing) =>
      `${listing.name} ${listing.owner} ${listing.type} ${listing.status} ${listing.category || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [listings, search]);

  const sellerCount = users.filter((u) => u.role === "Seller").length;
  const buyerCount = users.filter((u) => u.role === "Buyer").length;
  const pendingUserCount = users.filter((u) => u.status === "Pending").length;

  const productCount = listings.filter((l) => l.type === "Product").length;
  const serviceCount = listings.filter((l) => l.type === "Service").length;
  const activeListingCount = listings.filter((l) => l.status === "Active").length;
  const reviewListingCount = listings.filter((l) => l.status === "Review").length;

  function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setFormError("Enter a valid name and email address.");
      return;
    }
    const nextUser: AdminUser = {
      id: `SS-${1049 + users.length}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      status: "Active",
      joined: "Just now",
    };
    setUsers((current) => [nextUser, ...current]);
    setNewName("");
    setNewEmail("");
    setNewRole("Buyer");
    setFormError("");
    setShowCreateForm(false);
  }

  function removeUser(id: string) {
    if (!window.confirm("Are you sure you want to remove this user account?")) return;
    setUsers((current) => current.filter((user) => user.id !== id));
  }

  function toggleListing(id: string) {
    setListings((current) =>
      current.map((listing) =>
        listing.id === id
          ? { ...listing, status: listing.status === "Paused" ? "Active" : "Paused" }
          : listing,
      ),
    );
  }

  function removeListing(id: string) {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    setListings((current) => current.filter((listing) => listing.id !== id));
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Users", icon: Users },
    { label: "Marketplace", icon: Boxes },
  ] as const;

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
                <span className="admin-nav-count" aria-hidden="true">{listings.length}</span>
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
            <div className="admin-user-pill">
              <span className="admin-avatar" aria-label="Administrator">AD</span>
              <span className="admin-user-name">Platform Admin</span>
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
              <h1>{activeSection === "Overview" ? "Platform overview" : activeSection}</h1>
              <p>
                {activeSection === "Overview"
                  ? "A snapshot of activity across the SolarScope marketplace."
                  : activeSection === "Users"
                    ? "Review and manage platform accounts."
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
                  <strong>{users.length}</strong>
                  <small>
                    {buyerCount} buyers · {sellerCount} sellers
                  </small>
                </article>

                <article className="admin-kpi">
                  <div className="admin-kpi-top">
                    <span>Seller accounts</span>
                    <span className="admin-kpi-icon admin-kpi-gold">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <strong>{sellerCount}</strong>
                  <small>
                    {pendingUserCount} pending account{pendingUserCount === 1 ? "" : "s"}
                  </small>
                </article>

                <article className="admin-kpi">
                  <div className="admin-kpi-top">
                    <span>Product listings</span>
                    <span className="admin-kpi-icon admin-kpi-green">
                      <Package size={18} />
                    </span>
                  </div>
                  <strong>{productCount}</strong>
                  <small>
                    {activeListingCount} active marketplace listing
                    {activeListingCount === 1 ? "" : "s"}
                  </small>
                </article>

                <article className="admin-kpi">
                  <div className="admin-kpi-top">
                    <span>Service listings</span>
                    <span className="admin-kpi-icon admin-kpi-coral">
                      <Wrench size={18} />
                    </span>
                  </div>
                  <strong>{serviceCount}</strong>
                  <small>
                    {reviewListingCount} listing{reviewListingCount === 1 ? "" : "s"} awaiting review
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
                    <div className="admin-inventory-item">
                      <span className="admin-inventory-icon admin-kpi-green">
                        <Package size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Products</strong>
                        <small>Solar equipment and accessories</small>
                      </span>
                      <b>{productCount}</b>
                    </div>
                    <div className="admin-inventory-item">
                      <span className="admin-inventory-icon admin-kpi-coral">
                        <Wrench size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Services</strong>
                        <small>Installation, maintenance and more</small>
                      </span>
                      <b>{serviceCount}</b>
                    </div>
                    <div className="admin-inventory-item">
                      <span className="admin-inventory-icon admin-kpi-blue">
                        <ShieldCheck size={17} />
                      </span>
                      <span className="admin-inventory-info">
                        <strong>Active listings</strong>
                        <small>Currently visible in the marketplace</small>
                      </span>
                      <b>{activeListingCount}</b>
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
                      {pendingUserCount + reviewListingCount}
                    </span>
                  </div>

                  <div className="admin-attention-body">
                    <button
                      type="button"
                      className="admin-attention-row"
                      onClick={() => setActiveSection("Users")}
                    >
                      <span className="attention-dot attention-amber" />
                      <span className="admin-attention-info">
                        <strong>Seller accounts</strong>
                        <small>Pending account status</small>
                      </span>
                      <b>{pendingUserCount}</b>
                    </button>

                    <button
                      type="button"
                      className="admin-attention-row"
                      onClick={() => setActiveSection("Marketplace")}
                    >
                      <span className="attention-dot attention-blue" />
                      <span className="admin-attention-info">
                        <strong>Listings</strong>
                        <small>Awaiting listing review</small>
                      </span>
                      <b>{reviewListingCount}</b>
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
                <UserTable
                  users={users.slice(0, 4)}
                  onDelete={removeUser}
                  onRoleChange={(id, role) =>
                    setUsers((current) =>
                      current.map((u) => (u.id === id ? { ...u, role } : u)),
                    )
                  }
                />
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
                    <span className="admin-table-count">{users.length}</span>
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

              {/* Inline Quick Add Form (Test & Quick workflow compatible) */}
              {showCreateForm && (
                <form className="admin-inline-form" onSubmit={createUser}>
                  <div className="admin-inline-form-fields">
                    <label>
                      <span>Name</span>
                      <input
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      <span>Role</span>
                      <select
                        value={newRole}
                        onChange={(event) =>
                          setNewRole(event.target.value as AdminUser["role"])
                        }
                      >
                        <option value="Buyer">Buyer</option>
                        <option value="Seller">Seller</option>
                        <option value="Admin">Admin</option>
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
                    <p className="admin-inline-error" role="alert">
                      {formError}
                    </p>
                  )}
                </form>
              )}

              <UserTable
                users={filteredUsers}
                onDelete={removeUser}
                onRoleChange={(id, role) =>
                  setUsers((current) =>
                    current.map((u) => (u.id === id ? { ...u, role } : u)),
                  )
                }
              />
            </section>
          )}

          {/* ── VIEW 3: MARKETPLACE ────────────────────────────────────── */}
          {activeSection === "Marketplace" && (
            <section className="admin-panel admin-data-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>
                    Listings{" "}
                    <span className="admin-table-count">{listings.length}</span>
                  </h2>
                  <p>Manage product and solar service availability</p>
                </div>
                <label className="admin-search">
                  <Search size={16} />
                  <span className="sr-only">Search listings</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search listings"
                  />
                </label>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Listing</th>
                      <th>Seller</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.map((listing) => (
                      <tr key={listing.id}>
                        <td>
                          <div className="admin-listing-cell">
                            <strong>{listing.name}</strong>
                            <small>{listing.id}</small>
                          </div>
                        </td>
                        <td>{listing.owner}</td>
                        <td>{listing.type}</td>
                        <td>
                          <span className={`admin-status status-${listing.status.toLowerCase()}`}>
                            {listing.status}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              className="admin-row-action"
                              type="button"
                              onClick={() => toggleListing(listing.id)}
                            >
                              {listing.status === "Paused" ? "Activate" : "Pause"}
                            </button>
                            <Link
                              href={`/admin/listings/${listing.id}/edit`}
                              className="admin-row-edit"
                              title="Edit listing details"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </Link>
                            <button
                              className="admin-quiet-button"
                              type="button"
                              aria-label={`Delete ${listing.name}`}
                              onClick={() => removeListing(listing.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredListings.length === 0 && (
                  <p className="admin-no-results">No matching records.</p>
                )}
              </div>
            </section>
          )}

          <footer className="admin-footer">
            <span>SolarScope Administration</span>
            <span>Marketplace and account management</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function UserTable({
  users,
  onDelete,
  onRoleChange,
}: {
  users: AdminUser[];
  onDelete: (id: string) => void;
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
                    <option value="Admin">Admin</option>
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
                      onClick={() => onDelete(user.id)}
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
