/**
 * SolarScope — Module 4: Address Search & Geocoding Service
 *
 * Provides rate-limited, cached geocoding via OpenStreetMap Nominatim:
 * - Forward search by address, area, landmark, or city
 * - Reverse geocoding for geographic coordinates
 * - In-memory cache to prevent redundant external API hits
 * - Pakistan & Karachi priority ranking
 * - Full compliance with OpenStreetMap Nominatim usage policy
 */

import type { LatLngPoint } from "@/lib/solar/types";

export interface GeocodingResult {
  placeId: string | number;
  displayName: string;
  name?: string;
  lat: number;
  lng: number;
  type?: string;
  isPakistan?: boolean;
  isKarachi?: boolean;
}

// In-memory cache for search queries and reverse lookups
const searchCache = new Map<string, GeocodingResult[]>();
const reverseCache = new Map<string, string>();

let lastRequestTimestamp = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // Nominatim policy: max 1 req / second

/**
 * Throttle requests to respect public OSM rate limits
 */
async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTimestamp = Date.now();
}

/**
 * Forward geocode a location query string.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  await throttleNominatim();

  try {
    // 1. Pakistan priority search
    const pkUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=pk&addressdetails=1&limit=6`;

    // 2. Global fallback search
    const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&addressdetails=1&limit=6`;

    const [pkRes, globalRes] = await Promise.allSettled([
      fetch(pkUrl, {
        signal,
        headers: { "Accept-Language": "en" },
      }),
      fetch(globalUrl, {
        signal,
        headers: { "Accept-Language": "en" },
      }),
    ]);

    const pkData: any[] =
      pkRes.status === "fulfilled" && pkRes.value.ok ? await pkRes.value.json() : [];
    const globalData: any[] =
      globalRes.status === "fulfilled" && globalRes.value.ok
        ? await globalRes.value.json()
        : [];

    const mergedMap = new Map<string, GeocodingResult>();

    for (const item of [...pkData, ...globalData]) {
      const id = String(item.place_id);
      if (!mergedMap.has(id)) {
        const textLower = (
          item.display_name +
          " " +
          JSON.stringify(item.address || {})
        ).toLowerCase();

        const isKarachi = textLower.includes("karachi");
        const isPakistan =
          textLower.includes("pakistan") || item.address?.country_code === "pk";

        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        if (!isNaN(lat) && !isNaN(lng)) {
          mergedMap.set(id, {
            placeId: item.place_id,
            displayName: item.display_name,
            name: item.name || item.display_name.split(",")[0].trim(),
            lat,
            lng,
            type: item.type,
            isPakistan,
            isKarachi,
          });
        }
      }
    }

    const results = Array.from(mergedMap.values());

    // Rank: Karachi > Pakistan > Global
    results.sort((a, b) => {
      if (a.isKarachi && !b.isKarachi) return -1;
      if (!a.isKarachi && b.isKarachi) return 1;
      if (a.isPakistan && !b.isPakistan) return -1;
      if (!a.isPakistan && b.isPakistan) return 1;
      return 0;
    });

    const topResults = results.slice(0, 8);
    searchCache.set(cacheKey, topResults);
    return topResults;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw err;
    }
    return [];
  }
}

/**
 * Reverse geocode geographic coordinates to a readable address string.
 */
export async function reverseGeocode(
  point: LatLngPoint,
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!;
  }

  await throttleNominatim();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal,
      headers: { "Accept-Language": "en" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        reverseCache.set(cacheKey, data.display_name);
        return data.display_name;
      }
    }
    return null;
  } catch (err: any) {
    if (err.name === "AbortError") throw err;
    return null;
  }
}
