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
} from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import type { ProjectType } from "@/lib/projects/types";
import type { Coordinates } from "@/components/projects/LocationMap";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
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

  // Fetch smart suggestions with Pakistan priority (Karachi > Pakistan > Worldwide)
  const fetchLocationSuggestions = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearchingLocations(false);
      setSearchError(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingLocations(true);
      setSearchError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Query 1: Pakistan priority search for the user's exact query
        const pkUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
        )}&countrycodes=pk&addressdetails=1&limit=8`;

        // Query 2: Worldwide search for the user's exact query
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

        // Deduplicate by place_id
        const seen = new Set<string>();
        const merged: LocationSuggestion[] = [];

        for (const item of [...pkData, ...globalData]) {
          const id = String(item.place_id);
          if (!seen.has(id)) {
            seen.add(id);

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

        // Smart Ranking:
        // 1. Karachi, Pakistan matches top
        // 2. Other Pakistan matches
        // 3. International matches
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
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSearchError("Unable to load suggestions. You can click on the map to pin.");
          setSuggestions([]);
          setIsDropdownOpen(true);
        }
      } finally {
        setIsSearchingLocations(false);
      }
    }, 320);
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
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  // Select suggestion from dropdown
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setLocation(item.display_name);
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates({ lat, lng });
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

  // Handle map click or marker drag: place marker & reverse geocode to fill Location input
  const handleMapClick = async (coords: Coordinates) => {
    setCoordinates(coords);
    setIsReverseGeocoding(true);
    setIsDropdownOpen(false);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
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
      // Reverse geocoding failed: retain marker & coordinates, use fallback if empty
      if (!location.trim()) {
        setLocation(`Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
      }
    } finally {
      setIsReverseGeocoding(false);
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
        newErrors.roofArea = "Roof area must be a valid number.";
      } else if (areaNum <= 0) {
        newErrors.roofArea = "Roof area must be greater than 0.";
      } else if (areaNum > 100000) {
        newErrors.roofArea = "Roof area cannot exceed 100,000 m².";
      }
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
      const parsedRoofArea = roofArea.trim() ? Number(roofArea.trim()) : 0;

      const created = addProject({
        name: name.trim(),
        location: location.trim(),
        type,
        roofArea: parsedRoofArea,
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

          {/* Location Field with Autocomplete & Map */}
          <div className="new-project-location-group">
            <div
              className="new-project-location-input-wrapper"
              ref={dropdownContainerRef}
            >
              <Input
                id="project-location"
                label="Location"
                placeholder="Search country, city, street, or address..."
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setIsDropdownOpen(true);
                }}
                error={errors.location}
                required
                autoComplete="off"
              />

              <div className="new-project-location-actions-right">
                {location && (
                  <button
                    type="button"
                    className="new-project-location-clear-btn"
                    onClick={handleClearLocation}
                    title="Clear location and pin"
                    aria-label="Clear location input and pin"
                  >
                    <X size={15} />
                  </button>
                )}

                {isSearchingLocations && (
                  <div
                    className="new-project-location-spinner"
                    aria-hidden="true"
                  >
                    <Loader2 size={15} className="solarscope-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete Suggestions Dropdown — Directly Below Location Input */}
              {isDropdownOpen && (
                <ul
                  className="new-project-autocomplete-dropdown"
                  role="listbox"
                  aria-label="Location suggestions"
                >
                  {isSearchingLocations && suggestions.length === 0 && (
                    <li className="new-project-autocomplete-status">
                      <Loader2 size={14} className="solarscope-spin" />
                      <span>Searching locations...</span>
                    </li>
                  )}

                  {searchError && (
                    <li
                      className="new-project-autocomplete-status"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <AlertCircle size={14} />
                      <span>{searchError}</span>
                    </li>
                  )}

                  {!isSearchingLocations &&
                    !searchError &&
                    suggestions.length === 0 && (
                      <li className="new-project-autocomplete-status">
                        <span>No locations found. Try a different keyword or click on the map.</span>
                      </li>
                    )}

                  {suggestions.map((item, index) => {
                    const isSelected = index === highlightedIndex;
                    const primaryName =
                      item.name || item.display_name.split(",")[0];

                    return (
                      <li
                        key={item.place_id}
                        role="option"
                        aria-selected={isSelected}
                        className={`new-project-autocomplete-item ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => handleSelectSuggestion(item)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <MapPin
                          size={16}
                          className="new-project-item-icon"
                          aria-hidden="true"
                        />
                        <div className="new-project-item-content">
                          <div className="new-project-item-title-row">
                            <span className="new-project-item-title">
                              {primaryName}
                            </span>
                            {item.isKarachi ? (
                              <span className="new-project-item-priority-badge">
                                Karachi
                              </span>
                            ) : item.isPakistan ? (
                              <span className="new-project-item-priority-badge">
                                Pakistan
                              </span>
                            ) : null}
                          </div>
                          <span className="new-project-item-subtitle">
                            {item.display_name}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
                    onClick={() => setCoordinates(null)}
                    title="Remove marker pin"
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
              label="Roof Area (m²)"
              placeholder="e.g. 250"
              type="number"
              min="1"
              step="any"
              value={roofArea}
              onChange={(e) => {
                setRoofArea(e.target.value);
                if (errors.roofArea) {
                  setErrors((prev) => ({ ...prev, roofArea: undefined }));
                }
              }}
              error={errors.roofArea}
              helperText="Optional estimate of total usable rooftop surface."
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
