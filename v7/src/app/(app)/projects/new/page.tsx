"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Plus,
  MapPin,
  Loader2,
  Info,
  X,
  RotateCcw,
  Navigation,
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import type { ProjectType } from "@/lib/projects/types";
import type { Coordinates } from "@/components/projects/LocationMap";
import {
  SUPPORTED_COUNTRIES,
  parseCoordinates,
  CountryRegion,
  CityRegion,
} from "@/lib/geo/regions";
import { searchLocalPakistanLocations } from "@/lib/geo/pakistanLocations";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LocationAutocomplete from "@/components/projects/LocationAutocomplete";
import "./new-project.css";

// Dynamic import with SSR disabled for Leaflet map component
const LocationMap = dynamic(
  () => import("@/components/projects/LocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="solarscope-map-wrapper">
        <div className="solarscope-map-loading-overlay">
          <Loader2 size={24} className="solarscope-spin" />
          <span>Loading interactive map...</span>
        </div>
      </div>
    ),
  }
);

const PROJECT_TYPE_OPTIONS = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
];

export interface LocationSuggestion {
  place_id: number | string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  address?: Record<string, string>;
  isPakistan?: boolean;
  isKarachi?: boolean;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { addProject } = useProjects();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<ProjectType>("Residential");
  const [roofArea, setRoofArea] = useState("");

  // Map & Geocoding state
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // New location-selection improvements: Coordinates, Country, City, Bounds
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [mapMaxBounds, setMapMaxBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [viewCenter, setViewCenter] = useState<Coordinates | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    location?: string;
    roofArea?: string;
    general?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for debouncing, aborting, and click-outside
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  // Find active country and available cities
  const selectedCountry: CountryRegion | undefined = SUPPORTED_COUNTRIES.find(
    (c) => c.code === selectedCountryCode
  );

  const availableCities: CityRegion[] = selectedCountry?.cities ?? [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch smart suggestions with Pakistan priority
  const fetchLocationSuggestions = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearchingLocations(false);
      setSearchError(null);
      return;
    }

    // 1. Instant local Pakistan / Karachi matches (zero latency on typing 'r', 'riz', etc.)
    const localMatches = searchLocalPakistanLocations(trimmed).map((loc, idx) => ({
      place_id: `local-pk-${idx}-${loc.display_name}`,
      display_name: loc.display_name,
      lat: loc.lat,
      lon: loc.lon,
      type: loc.type,
      isKarachi: loc.city.toLowerCase() === "karachi",
      isPakistan: true,
      address: {
        city: loc.city,
        country: loc.country,
        country_code: "pk",
      },
    }));

    if (localMatches.length > 0) {
      setSuggestions(localMatches);
      setIsDropdownOpen(true);
      setHighlightedIndex(-1);
    }

    // If only 1 char, local matches are sufficient
    if (trimmed.length < 2) {
      setIsSearchingLocations(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingLocations(true);
      setSearchError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const pkUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
        )}&countrycodes=pk&addressdetails=1&limit=8`;

        const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
        )}&addressdetails=1&limit=8`;

        const [pkRes, globalRes] = await Promise.allSettled([
          fetch(pkUrl, {
            signal: controller.signal,
            headers: { "Accept-Language": "en" },
          }),
          fetch(globalUrl, {
            signal: controller.signal,
            headers: { "Accept-Language": "en" },
          }),
        ]);

        const pkData: LocationSuggestion[] =
          pkRes.status === "fulfilled" && pkRes.value.ok
            ? await pkRes.value.json()
            : [];
        const globalData: LocationSuggestion[] =
          globalRes.status === "fulfilled" && globalRes.value.ok
            ? await globalRes.value.json()
            : [];

        const seen = new Set<string>();
        const merged: LocationSuggestion[] = [];

        for (const item of localMatches) {
          seen.add(item.display_name.toLowerCase());
          merged.push(item);
        }

        for (const item of [...pkData, ...globalData]) {
          const key = (item.display_name || "").toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);

            const textLower = (
              item.display_name +
              " " +
              JSON.stringify(item.address || {})
            ).toLowerCase();

            const isKarachi = textLower.includes("karachi");
            const isPakistan =
              textLower.includes("pakistan") ||
              item.address?.country_code === "pk";

            merged.push({
              ...item,
              isKarachi,
              isPakistan,
            });
          }
        }

        merged.sort((a, b) => {
          if (a.isKarachi && !b.isKarachi) return -1;
          if (!a.isKarachi && b.isKarachi) return 1;
          if (a.isPakistan && !b.isPakistan) return -1;
          if (!a.isPakistan && b.isPakistan) return 1;
          return 0;
        });

        setSuggestions(merged.slice(0, 8));
        setIsDropdownOpen(true);
        setHighlightedIndex(-1);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name !== "AbortError") {
          if (localMatches.length === 0) {
            setSearchError("Unable to load suggestions. You can click on the map to pin.");
            setSuggestions([]);
            setIsDropdownOpen(true);
          }
        }
      } finally {
        setIsSearchingLocations(false);
      }
    }, 250);
  }, []);

  // Handle location input text change
  const handleLocationChange = (value: string) => {
    setLocation(value);
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
    fetchLocationSuggestions(value);
  };

  // Clear location and reset pin
  const handleClearLocation = () => {
    setLocation("");
    setCoordinates(null);
    setLatInput("");
    setLngInput("");
    setCoordError(null);
    setSuggestions([]);
    setIsDropdownOpen(false);
    setSelectedCityId("");
  };

  // Select suggestion from dropdown
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setLocation(item.display_name);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates({ lat, lng });
      setLatInput(lat.toFixed(5));
      setLngInput(lng.toFixed(5));
      setCoordError(null);
    }
    setIsDropdownOpen(false);
    setSuggestions([]);
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  };

  // Keyboard navigation for autocomplete dropdown
  const handleLocationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  // Reverse geocoding helper to update location string from coordinates
  const triggerReverseGeocoding = async (coords: Coordinates) => {
    setIsReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setLocation(data.display_name);
          if (errors.location) {
            setErrors((prev) => ({ ...prev, location: undefined }));
          }
        }
      }
    } catch {
      if (!location.trim()) {
        setLocation(`Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // 1. Handle Map Click or Marker Drag
  const handleMapClick = async (coords: Coordinates) => {
    setCoordinates(coords);
    setLatInput(coords.lat.toFixed(5));
    setLngInput(coords.lng.toFixed(5));
    setCoordError(null);
    setIsDropdownOpen(false);
    await triggerReverseGeocoding(coords);
  };

  // Keydown guard for coordinate inputs: only allow digits, single dot, initial minus, and nav keys
  const handleCoordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter", "Home", "End"].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Allow comma or space for pasted/typed coordinate pairs
    if (e.key === "," || e.key === " ") {
      return;
    }
    // Allow '-' only at first character position
    if (e.key === "-") {
      if (e.currentTarget.selectionStart === 0 && !e.currentTarget.value.includes("-")) {
        return;
      }
      e.preventDefault();
      return;
    }
    // Allow '.' only once
    if (e.key === ".") {
      if (!e.currentTarget.value.includes(".")) {
        return;
      }
      e.preventDefault();
      return;
    }
    // Disallow all other non-digits (e.g. letters, special symbols)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // 2. Direct Latitude & Longitude Input & Paste Detection
  const handleCoordInputChange = (
    rawValue: string,
    field: "lat" | "lng"
  ) => {
    setCoordError(null);

    // Check if the user pasted a combined "lat, lng" string into either input
    const parsedPair = parseCoordinates(rawValue);
    if (parsedPair) {
      setLatInput(parsedPair.lat.toFixed(5));
      setLngInput(parsedPair.lng.toFixed(5));
      setCoordinates(parsedPair);
      triggerReverseGeocoding(parsedPair);
      return;
    }

    // Sanitize single coordinate input: allow only digits, minus at start, and single dot
    const cleanValue = rawValue
      .replace(/[^0-9.-]/g, "")
      .replace(/(?!^)-/g, "")
      .replace(/(\..*?)\..*/g, "$1");

    if (field === "lat") {
      setLatInput(cleanValue);
      if (cleanValue === "" || cleanValue === "-") {
        return;
      }
      const parsedLat = parseFloat(cleanValue);
      const parsedLng = parseFloat(lngInput);

      if (isNaN(parsedLat)) {
        setCoordError("Latitude must be a valid number.");
        return;
      }
      if (parsedLat < -90 || parsedLat > 90) {
        setCoordError("Latitude must be between -90 and 90.");
        return;
      }
      if (!isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        const newCoords = { lat: parsedLat, lng: parsedLng };
        setCoordinates(newCoords);
        triggerReverseGeocoding(newCoords);
      }
    } else {
      setLngInput(cleanValue);
      if (cleanValue === "" || cleanValue === "-") {
        return;
      }
      const parsedLng = parseFloat(cleanValue);
      const parsedLat = parseFloat(latInput);

      if (isNaN(parsedLng)) {
        setCoordError("Longitude must be a valid number.");
        return;
      }
      if (parsedLng < -180 || parsedLng > 180) {
        setCoordError("Longitude must be between -180 and 180.");
        return;
      }
      if (!isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        const newCoords = { lat: parsedLat, lng: parsedLng };
        setCoordinates(newCoords);
        triggerReverseGeocoding(newCoords);
      }
    }
  };

  // 3. Country-Based Map Selection
  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    setSelectedCityId("");

    if (!code) {
      // Reset country bounds restrictions
      setMapBounds(null);
      setMapMaxBounds(null);
      return;
    }

    const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
    if (country) {
      // Zoom and restrict view to country boundary
      setMapBounds(country.bounds);
      setMapMaxBounds(country.bounds);
      setViewCenter(country.center);

      // If user hasn't typed an address yet, help by setting country context
      if (!location.trim()) {
        setLocation(country.name);
      }
    }
  };

  // 4. City-Based Map Selection
  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);

    if (!cityId) return;

    const city = availableCities.find((c) => c.id === cityId);
    if (city) {
      // Restrict map to city bounds, move view, place marker
      setMapBounds(city.bounds);
      setMapMaxBounds(city.bounds);
      setCoordinates(city.center);
      setLatInput(city.center.lat.toFixed(5));
      setLngInput(city.center.lng.toFixed(5));
      setCoordError(null);

      // Auto-update location text
      const countryName = selectedCountry?.name || "";
      const formattedLoc = countryName
        ? `${city.name}, ${countryName}`
        : city.name;
      setLocation(formattedLoc);

      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: undefined }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      location?: string;
      roofArea?: string;
    } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = "Project name is required.";
    } else if (trimmedName.length < 3) {
      newErrors.name = "Project name must be at least 3 characters.";
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      newErrors.location = "Location is required.";
    } else if (trimmedLocation.length < 2) {
      newErrors.location = "Location must be at least 2 characters.";
    }

    const trimmedRoofArea = roofArea.trim();
    if (trimmedRoofArea !== "") {
      const areaNum = Number(trimmedRoofArea);
      if (isNaN(areaNum) || !Number.isFinite(areaNum)) {
        newErrors.roofArea = "Roof area must be a valid number in square feet.";
      } else if (areaNum <= 0) {
        newErrors.roofArea = "Roof area must be greater than 0.";
      } else if (areaNum > 1000000) {
        newErrors.roofArea = "Roof area cannot exceed 1,000,000 sq ft.";
      }
    }

    if (coordError) {
      newErrors.location = coordError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const sqFt = roofArea.trim() ? Number(roofArea.trim()) : 0;
      // Convert Square Feet to Square Meters (1 m² ≈ 10.7639 sq ft)
      const convertedM2 = sqFt > 0 ? Math.round((sqFt / 10.7639) * 10) / 10 : 0;

      const created = addProject({
        name: name.trim(),
        location: location.trim(),
        type,
        roofArea: convertedM2,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        status: "DRAFT",
      });

      router.push(`/projects/${created.id}`);
    } catch {
      setErrors((prev) => ({
        ...prev,
        general: "Failed to create project. Please try again.",
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-project-page">
      <Link
        href="/projects"
        className="new-project-back-link"
        aria-label="Back to projects listing"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to Projects</span>
      </Link>

      <div className="new-project-header">
        <h1 className="new-project-title">Create New Project</h1>
        <p className="new-project-subtitle">
          Start a new solar planning project by entering basic site details.
        </p>
      </div>

      <div className="new-project-card">
        {errors.general && (
          <div className="new-project-general-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="new-project-form" noValidate>
          {/* Project Name */}
          <Input
            id="project-name"
            label="Project Name"
            placeholder="e.g. DHA Villa Solar Installation"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            required
            helperText="A descriptive title for your solar planning project."
          />

          {/* Location Field with Global & Karachi-prioritized Autocomplete */}
          <div className="new-project-location-group">
            <LocationAutocomplete
              id="project-location"
              label="Location"
              placeholder="Search country, city, street, or address..."
              value={location}
              onChange={(val) => {
                setLocation(val);
                if (errors.location) {
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }
              }}
              onSelectLocation={(data) => {
                setLocation(data.displayName);
                if (!isNaN(data.lat) && !isNaN(data.lng)) {
                  setCoordinates({ lat: data.lat, lng: data.lng });
                  setLatInput(data.lat.toFixed(5));
                  setLngInput(data.lng.toFixed(5));
                  setCoordError(null);
                }
                if (errors.location) {
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }
              }}
              onClear={handleClearLocation}
              error={errors.location}
              required
            />

            <div className="new-project-form-row new-project-form-row--two-col">
              <Select
                id="project-country"
                label="Filter map by country boundary"
                options={SUPPORTED_COUNTRIES.map(({ code, name }) => ({
                  value: code,
                  label: name,
                }))}
                placeholder="Select a country"
                value={selectedCountryCode}
                onChange={(event) => handleCountryChange(event.target.value)}
              />

              <Select
                id="project-city"
                label="Zoom map into selected city"
                options={availableCities.map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
                placeholder={selectedCountry ? "Select a city" : "Select a country first"}
                value={selectedCityId}
                onChange={(event) => handleCityChange(event.target.value)}
                disabled={!selectedCountry}
              />
            </div>

            {/* Direct Latitude & Longitude Input Bar */}
            <div className="new-project-coords-bar">
              <div className="new-project-coords-header">
                <span className="new-project-coords-title">
                  <Navigation size={13} aria-hidden="true" />
                  <span>Direct Coordinates (Latitude & Longitude)</span>
                </span>
                <span className="new-project-coords-hint">
                  Enter values or paste &ldquo;lat, lng&rdquo; to jump directly.
                </span>
              </div>

              <div className="new-project-coords-inputs">
                <div className="new-project-coord-input-wrap">
                  <span className="coord-prefix">Lat:</span>
                  <input
                    type="text"
                    id="input-latitude"
                    className="new-project-coord-input"
                    placeholder="e.g. 24.8607"
                    value={latInput}
                    onKeyDown={handleCoordKeyDown}
                    onChange={(e) => handleCoordInputChange(e.target.value, "lat")}
                    aria-label="Latitude coordinate"
                  />
                </div>

                <div className="new-project-coord-input-wrap">
                  <span className="coord-prefix">Lng:</span>
                  <input
                    type="text"
                    id="input-longitude"
                    className="new-project-coord-input"
                    placeholder="e.g. 67.0011"
                    value={lngInput}
                    onKeyDown={handleCoordKeyDown}
                    onChange={(e) => handleCoordInputChange(e.target.value, "lng")}
                    aria-label="Longitude coordinate"
                  />
                </div>
              </div>

              {coordError && (
                <div className="new-project-coord-error" role="alert">
                  <AlertCircle size={13} />
                  <span>{coordError}</span>
                </div>
              )}
            </div>

            {/* Map Section & Instructions */}
            <div className="new-project-map-section">
              <div className="new-project-map-header">
                <p className="new-project-map-instruction">
                  <Info
                    size={14}
                    aria-hidden="true"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <span>
                    Search for an address or click on the map to pin your
                    location.
                  </span>
                </p>

                {coordinates && (
                  <button
                    type="button"
                    className="new-project-map-reset-btn"
                    onClick={handleClearLocation}
                    title="Remove marker pin and coordinates"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Pin</span>
                  </button>
                )}
              </div>

              <LocationMap
                coordinates={coordinates}
                onMapClick={handleMapClick}
                isGeocoding={isReverseGeocoding}
                interactive={true}
                viewCenter={viewCenter}
                bounds={mapBounds}
                maxBounds={mapMaxBounds}
              />
            </div>
          </div>

          {/* Project Type & Roof Area */}
          <div className="new-project-form-row new-project-form-row--two-col">
            <Select
              id="project-type"
              label="Project Type"
              options={PROJECT_TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
              required
              helperText="Residential or Commercial installation."
            />

            <Input
              id="project-roof-area"
              label="Roof Area (sq ft)"
              placeholder="e.g. 1500"
              type="number"
              min="10"
              step="any"
              value={roofArea}
              onChange={(e) => {
                setRoofArea(e.target.value);
                if (errors.roofArea) {
                  setErrors((prev) => ({ ...prev, roofArea: undefined }));
                }
              }}
              error={errors.roofArea}
              helperText={
                roofArea && Number(roofArea) > 0
                  ? `≈ ${(Number(roofArea) / 10.7639).toFixed(1)} m² (automatically converted for engineering calculations)`
                  : "Enter roof size in square feet (e.g. 1000 to 3000 sq ft)."
              }
            />
          </div>

          {/* Actions */}
          <div className="new-project-actions">
            <Link href="/projects" className="new-project-cancel-btn">
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <Plus
                size={16}
                aria-hidden="true"
                style={{ marginRight: "6px" }}
              />
              {isSubmitting ? "Creating Project..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
