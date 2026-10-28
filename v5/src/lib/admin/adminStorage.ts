export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Buyer" | "Seller" | "Admin";
  status: "Active" | "Pending" | "Suspended";
  joined: string;
  phone?: string;
  location?: string;
};

export type AdminListing = {
  id: string;
  name: string;
  owner: string;
  type: "Product" | "Service";
  category?: string;
  price?: string;
  status: "Active" | "Review" | "Paused";
  dateAdded?: string;
};

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  { id: "SS-1048", name: "Ayesha Khan", email: "ayesha.khan@example.com", role: "Seller", status: "Active", joined: "Today", phone: "+92 300 1234567", location: "Lahore" },
  { id: "SS-1047", name: "Hamza Ali", email: "hamza.ali@example.com", role: "Buyer", status: "Active", joined: "Today", phone: "+92 321 7654321", location: "Islamabad" },
  { id: "SS-1046", name: "Mariam Shah", email: "mariam.shah@example.com", role: "Seller", status: "Pending", joined: "Yesterday", phone: "+92 333 9876543", location: "Karachi" },
  { id: "SS-1045", name: "Usman Raza", email: "usman.raza@example.com", role: "Buyer", status: "Active", joined: "Yesterday", phone: "+92 301 5554321", location: "Rawalpindi" },
  { id: "SS-1044", name: "Zara Ahmed", email: "zara.ahmed@example.com", role: "Seller", status: "Active", joined: "Oct 25, 2026", phone: "+92 345 8889990", location: "Faisalabad" },
];

export const INITIAL_ADMIN_LISTINGS: AdminListing[] = [
  { id: "L-3021", name: "540W Mono PERC Solar Panel Tier-1", owner: "Ayesha Khan", type: "Product", category: "Solar panels", price: "PKR 34,500", status: "Active", dateAdded: "Oct 28, 2026" },
  { id: "L-3020", name: "Turnkey Residential Solar Installation", owner: "Mariam Shah", type: "Service", category: "Installation", price: "Quote required", status: "Review", dateAdded: "Oct 27, 2026" },
  { id: "L-3019", name: "6kW Hybrid On-Grid Inverter with Battery Support", owner: "Solar Home PK", type: "Product", category: "Inverters", price: "PKR 245,000", status: "Active", dateAdded: "Oct 26, 2026" },
  { id: "L-3018", name: "Annual Rooftop PV Cleaning & Testing Service", owner: "Ayesha Khan", type: "Service", category: "Maintenance", price: "PKR 12,000", status: "Paused", dateAdded: "Oct 24, 2026" },
];

const USERS_KEY = "ss_admin_preview_users";
const LISTINGS_KEY = "ss_admin_preview_listings";

export function getStoredAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return INITIAL_ADMIN_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return INITIAL_ADMIN_USERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_USERS;
  } catch {
    return INITIAL_ADMIN_USERS;
  }
}

export function saveStoredAdminUsers(users: AdminUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // Storage fallback
  }
}

export function getStoredAdminListings(): AdminListing[] {
  if (typeof window === "undefined") return INITIAL_ADMIN_LISTINGS;
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    if (!raw) return INITIAL_ADMIN_LISTINGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ADMIN_LISTINGS;
  } catch {
    return INITIAL_ADMIN_LISTINGS;
  }
}

export function saveStoredAdminListings(listings: AdminListing[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  } catch {
    // Storage fallback
  }
}
