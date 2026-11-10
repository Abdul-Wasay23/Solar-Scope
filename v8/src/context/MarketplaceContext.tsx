"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ListingKind = "PRODUCT" | "SERVICE";
export type ListingStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type MarketplaceListing = {
  id: string;
  rawId?: number;
  ownerId: string;
  kind: ListingKind;
  title: string;
  category: string;
  description: string;
  price: string;
  stock?: number;
  imageDataUrl?: string;
  coverageArea?: string;
  brand?: string;
  modelNumber?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerCompany?: string;
  sellerPhone?: string;
  sellerCity?: string;
  sellerRole?: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListingInput = Omit<MarketplaceListing, "id" | "ownerId" | "createdAt" | "updatedAt">;

type MarketplaceContextValue = {
  listings: MarketplaceListing[];
  isLoading: boolean;
  createListing: (ownerId: string, input: ListingInput) => MarketplaceListing;
  updateListing: (ownerId: string, id: string, input: ListingInput) => boolean;
  deleteListing: (ownerId: string, id: string) => boolean;
  refreshListings: () => Promise<void>;
};

const STORAGE_KEY = "ss_demo_marketplace_listings";
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function readLocalListings(): MarketplaceListing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? (value as MarketplaceListing[]) : [];
  } catch {
    return [];
  }
}

function persistLocalListings(listings: MarketplaceListing[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // Ignore storage quota
  }
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDbListings = useCallback(async () => {
    if (typeof window === "undefined" || !window.location?.origin) {
      setListings(readLocalListings());
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/marketplace");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.listings)) {
          // Always use DB as source of truth — even if empty (clears stale localStorage)
          setListings(data.listings);
          persistLocalListings(data.listings);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fallback to local storage if API call fails
    }
    setListings(readLocalListings());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Show cached data immediately while fetching from DB
    const cached = readLocalListings();
    if (cached.length > 0) {
      setListings(cached);
    }
    // Always fetch fresh from DB; fetchDbListings sets isLoading(false) when done
    fetchDbListings().catch(() => setIsLoading(false));
  }, [fetchDbListings]);

  const createListing = useCallback(
    (ownerId: string, input: ListingInput): MarketplaceListing => {
      const now = new Date().toISOString();
      const tempId = `listing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newListing: MarketplaceListing = {
        ...input,
        id: tempId,
        ownerId,
        status: input.status || "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      setListings((prev) => {
        const next = [newListing, ...prev];
        persistLocalListings(next);
        return next;
      });

      // Async DB sync if browser available
      if (typeof window !== "undefined" && window.location?.origin) {
        fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId, ...input }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.listing) {
              setListings((current) => {
                const updated = current.map((item) =>
                  item.id === tempId ? data.listing : item
                );
                persistLocalListings(updated);
                return updated;
              });
            }
          })
          .catch(() => {});
      }

      return newListing;
    },
    []
  );

  const updateListing = useCallback(
    (ownerId: string, id: string, input: ListingInput): boolean => {
      let updated = false;
      setListings((current) => {
        const next = current.map((listing) => {
          if (listing.id !== id || listing.ownerId !== ownerId) return listing;
          updated = true;
          return { ...listing, ...input, ownerId, id, updatedAt: new Date().toISOString() };
        });
        if (updated) persistLocalListings(next);
        return next;
      });

      if (updated && typeof window !== "undefined" && window.location?.origin) {
        fetch("/api/marketplace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ownerId, ...input }),
        }).catch(() => {});
      }

      return updated;
    },
    []
  );

  const deleteListing = useCallback(
    (ownerId: string, id: string): boolean => {
      let deleted = false;
      setListings((current) => {
        const next = current.filter((listing) => {
          if (listing.id === id && listing.ownerId === ownerId) {
            deleted = true;
            return false;
          }
          return true;
        });
        if (deleted) persistLocalListings(next);
        return next;
      });

      if (deleted && typeof window !== "undefined" && window.location?.origin) {
        fetch(`/api/marketplace?id=${encodeURIComponent(id)}&sellerId=${encodeURIComponent(ownerId)}`, {
          method: "DELETE",
        }).catch(() => {});
      }

      return deleted;
    },
    []
  );

  const value = useMemo(
    () => ({
      listings,
      isLoading,
      createListing,
      updateListing,
      deleteListing,
      refreshListings: fetchDbListings,
    }),
    [listings, isLoading, createListing, updateListing, deleteListing, fetchDbListings]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error("useMarketplace must be used within a MarketplaceProvider");
  return context;
}
