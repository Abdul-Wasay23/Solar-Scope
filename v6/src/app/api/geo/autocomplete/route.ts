import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface GeoSuggestion {
  id: string;
  name: string;
  displayName: string;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lon: number;
  type: string;
  isKarachi: boolean;
  isPakistan: boolean;
}

// In-memory cache with 1-hour TTL for instant response on frequent queries
interface CacheEntry {
  timestamp: number;
  data: GeoSuggestion[];
}

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cleanAddressPart(part?: string): string {
  if (!part) return "";
  return part.trim();
}

function buildCleanDisplayName(name: string, p: any): string {
  const parts: string[] = [];
  if (name) parts.push(name);

  const street = cleanAddressPart(p.street || p.road || p.pedestrian || p.suburb);
  if (street && !name.toLowerCase().includes(street.toLowerCase())) {
    parts.push(street);
  }

  const district = cleanAddressPart(p.district || p.neighbourhood || p.quarter || p.city_district);
  if (district && !parts.some((x) => x.toLowerCase().includes(district.toLowerCase()))) {
    parts.push(district);
  }

  const city = cleanAddressPart(p.city || p.town || p.municipality || p.county);
  if (city && !parts.some((x) => x.toLowerCase().includes(city.toLowerCase()))) {
    parts.push(city);
  }

  const state = cleanAddressPart(p.state || p.province || p.region);
  if (state && !parts.some((x) => x.toLowerCase().includes(state.toLowerCase()))) {
    parts.push(state);
  }

  const country = cleanAddressPart(p.country);
  if (country && !parts.some((x) => x.toLowerCase().includes(country.toLowerCase()))) {
    parts.push(country);
  }

  return parts.join(", ");
}

/**
 * Calculates search priority score according to user requirements:
 * 1. Exact matches.
 * 2. Names beginning with the typed query.
 * 3. Partial name matches.
 * 4. Relevant street and locality matches.
 * 5. Broader city/region matches.
 * Plus strong Karachi/Pakistan ranking bonus without hardcoded lists.
 */
function scoreSuggestion(item: GeoSuggestion, qLower: string): number {
  let score = 0;
  const nameLower = (item.name || "").toLowerCase();
  const displayLower = (item.displayName || "").toLowerCase();
  const localityLower = (item.locality || "").toLowerCase();
  const cityLower = (item.city || "").toLowerCase();

  // 1. Exact match on name
  if (nameLower === qLower) {
    score += 1200;
  }
  // 2. Name begins with query
  else if (nameLower.startsWith(qLower)) {
    score += 800 - Math.min(nameLower.length - qLower.length, 200);
  }
  // Word in name begins with query (e.g. "Cooperative Housing Society" when typing "coop")
  else if (nameLower.split(/\s+/).some((w) => w.startsWith(qLower))) {
    score += 650;
  }
  // 3. Partial name match
  else if (nameLower.includes(qLower)) {
    score += 450;
  }
  // 4. Locality / street begins with query
  else if (localityLower.startsWith(qLower)) {
    score += 400;
  }
  // Locality contains query
  else if (localityLower.includes(qLower)) {
    score += 300;
  }
  // 5. Broader city/region match
  else if (cityLower.startsWith(qLower)) {
    score += 250;
  } else if (displayLower.includes(qLower)) {
    score += 150;
  }

  // Karachi relevance priority (Section C):
  // Gives strong priority to Karachi locations when searching
  if (item.isKarachi) {
    score += 300;
  } else if (item.isPakistan) {
    score += 120;
  }

  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    const qLower = query.toLowerCase();

    // Check cache
    const cached = CACHE.get(qLower);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, results: cached.data });
    }

    // 1. Query Photon API (Komoot OpenStreetMap index with lat/lon biasing towards Karachi: 24.8607, 67.0011)
    // Photon provides sub-second typahead autocomplete, word prefix matching, and high granularity down to street/house level.
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&lang=en&lat=24.8607&lon=67.0011&limit=25`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    let features: any[] = [];

    try {
      const res = await fetch(photonUrl, {
        signal: controller.signal,
        headers: {
          "Accept-Language": "en",
          "User-Agent": "SolarScope-LocationAutocomplete/2.0",
        },
      });

      if (res.ok) {
        const json = await res.json();
        features = json.features || [];
      }
    } catch {
      // Fallback below
    } finally {
      clearTimeout(timeout);
    }

    // 2. If Photon returned fewer than 3 results, supplement with OSM Nominatim
    if (features.length < 3) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=8`;

        const nomRes = await fetch(nomUrl, {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "SolarScope-LocationAutocomplete/2.0",
          },
        });

        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData)) {
            for (const item of nomData) {
              features.push({
                geometry: {
                  coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
                },
                properties: {
                  name: item.name || item.display_name?.split(",")[0] || "",
                  street: item.address?.road || item.address?.pedestrian,
                  district: item.address?.neighbourhood || item.address?.suburb,
                  city: item.address?.city || item.address?.town,
                  state: item.address?.state,
                  country: item.address?.country,
                  countrycode: item.address?.country_code,
                  osm_value: item.type || item.class,
                },
              });
            }
          }
        }
      } catch {
        // Silently continue with existing features
      }
    }

    const seenKeys = new Set<string>();
    const suggestions: GeoSuggestion[] = [];

    for (const feat of features) {
      const p = feat.properties || {};
      const coords = feat.geometry?.coordinates || [];
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);

      if (isNaN(lat) || isNaN(lon)) continue;

      const rawName = p.name || p.street || p.city || p.district || "";
      if (!rawName) continue;

      const fullDisplay = buildCleanDisplayName(rawName, p);
      const dedupeKey = `${rawName.toLowerCase()}|${Math.round(lat * 1000)}|${Math.round(lon * 1000)}`;

      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const allText = `${rawName} ${fullDisplay} ${p.city || ""} ${p.district || ""} ${p.country || ""}`.toLowerCase();
      const isKarachi = allText.includes("karachi");
      const isPakistan = allText.includes("pakistan") || (p.countrycode || "").toLowerCase() === "pk";

      suggestions.push({
        id: `geo-${suggestions.length}-${lat.toFixed(5)}-${lon.toFixed(5)}`,
        name: rawName,
        displayName: fullDisplay,
        locality: p.district || p.suburb || p.street || undefined,
        city: p.city || p.town || (isKarachi ? "Karachi" : undefined),
        state: p.state || undefined,
        country: p.country || (isPakistan ? "Pakistan" : undefined),
        lat,
        lon,
        type: p.osm_value || p.type || "locality",
        isKarachi,
        isPakistan,
      });
    }

    // Rank results according to user criteria
    suggestions.sort((a, b) => {
      const scoreA = scoreSuggestion(a, qLower);
      const scoreB = scoreSuggestion(b, qLower);
      return scoreB - scoreA;
    });

    const topResults = suggestions.slice(0, 10);

    // Save to cache
    CACHE.set(qLower, {
      timestamp: Date.now(),
      data: topResults,
    });

    // Cache management: keep cache under 1500 keys
    if (CACHE.size > 1500) {
      const firstKey = CACHE.keys().next().value;
      if (firstKey) CACHE.delete(firstKey);
    }

    return NextResponse.json({
      success: true,
      query,
      results: topResults,
    });
  } catch (err: unknown) {
    console.error("Geo autocomplete error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch autocomplete suggestions", results: [] },
      { status: 500 }
    );
  }
}
