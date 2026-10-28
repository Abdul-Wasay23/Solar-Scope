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
  ownerId: string;
  kind: ListingKind;
  title: string;
  category: string;
  description: string;
  price: string;
  imageDataUrl?: string;
  coverageArea?: string;
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
};

const STORAGE_KEY = "ss_demo_marketplace_listings";
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function readListings(): MarketplaceListing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persistListings(listings: MarketplaceListing[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // Keep the workspace usable if browser storage is unavailable.
  }
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setListings(readListings());
    setIsLoading(false);
  }, []);

  const createListing = useCallback((ownerId: string, input: ListingInput) => {
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      ...input,
      id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    setListings((current) => {
      const next = [listing, ...current];
      persistListings(next);
      return next;
    });
    return listing;
  }, []);

  const updateListing = useCallback((ownerId: string, id: string, input: ListingInput) => {
    let updated = false;
    setListings((current) => {
      const next = current.map((listing) => {
        if (listing.id !== id || listing.ownerId !== ownerId) return listing;
        updated = true;
        return { ...listing, ...input, ownerId, id, updatedAt: new Date().toISOString() };
      });
      persistListings(next);
      return next;
    });
    return updated;
  }, []);

  const deleteListing = useCallback((ownerId: string, id: string) => {
    let deleted = false;
    setListings((current) => {
      const next = current.filter((listing) => {
        if (listing.id === id && listing.ownerId === ownerId) {
          deleted = true;
          return false;
        }
        return true;
      });
      persistListings(next);
      return next;
    });
    return deleted;
  }, []);

  const value = useMemo(
    () => ({ listings, isLoading, createListing, updateListing, deleteListing }),
    [listings, isLoading, createListing, updateListing, deleteListing],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error("useMarketplace must be used within a MarketplaceProvider");
  return context;
}