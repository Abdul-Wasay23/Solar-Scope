import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MarketplaceProvider,
  useMarketplace,
  type ListingInput,
} from "./MarketplaceContext";

const productInput: ListingInput = {
  kind: "PRODUCT",
  title: "540W Solar Panel",
  category: "Solar panels",
  description: "Bifacial module",
  price: "PKR 45,000",
  status: "DRAFT",
};

describe("MarketplaceContext", () => {
  beforeEach(() => localStorage.clear());

  it("creates, updates, persists, and deletes seller listings", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: MarketplaceProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let listingId = "";
    act(() => {
      listingId = result.current.createListing("seller-1", productInput).id;
    });
    expect(result.current.listings).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("ss_demo_marketplace_listings") || "[]")).toHaveLength(1);

    act(() => {
      result.current.updateListing("seller-1", listingId, { ...productInput, title: "Updated panel" });
    });
    expect(result.current.listings[0].title).toBe("Updated panel");

    act(() => {
      result.current.deleteListing("seller-1", listingId);
    });
    expect(result.current.listings).toHaveLength(0);
  });

  it("does not let another seller modify or delete a listing", async () => {
    const { result } = renderHook(() => useMarketplace(), {
      wrapper: MarketplaceProvider,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let listingId = "";
    act(() => {
      listingId = result.current.createListing("seller-1", productInput).id;
    });
    act(() => {
      result.current.updateListing("seller-2", listingId, { ...productInput, title: "Hijacked" });
      result.current.deleteListing("seller-2", listingId);
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.listings[0].title).toBe("540W Solar Panel");
    expect(result.current.listings[0].ownerId).toBe("seller-1");
  });
});