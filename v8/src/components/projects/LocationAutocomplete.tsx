"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { MapPin, Search, Loader2, X, Globe, Building2, Check } from "lucide-react";
import type { GeoSuggestion } from "@/app/api/geo/autocomplete/route";
import "./LocationAutocomplete.css";

export interface SelectedLocationData {
  displayName: string;
  lat: number;
  lng: number;
  name?: string;
  city?: string;
  country?: string;
}

export interface LocationAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (data: SelectedLocationData) => void;
  onClear?: () => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  autoFocus?: boolean;
}

/**
 * Highlights characters in text that match the search query.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;

  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);

  if (idx === -1) {
    // Check if any word starts with query
    const words = text.split(/(\s+)/);
    return (
      <>
        {words.map((word, i) => {
          if (word.toLowerCase().startsWith(q)) {
            return (
              <span key={i}>
                <mark className="loc-auto-highlight">{word.slice(0, q.length)}</mark>
                {word.slice(q.length)}
              </span>
            );
          }
          return <span key={i}>{word}</span>;
        })}
      </>
    );
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <mark className="loc-auto-highlight">{match}</mark>
      {after}
    </>
  );
}

export default function LocationAutocomplete({
  id = "location-autocomplete",
  label = "Location",
  value,
  onChange,
  onSelectLocation,
  onClear,
  placeholder = "Search country, city, street, neighborhood, or landmark...",
  error,
  required = false,
  disabled = false,
  helperText,
  autoFocus = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback((searchQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            setSuggestions(data.results);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 180); // Fast 180ms debounce for responsive typing experience
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    fetchSuggestions(val);
  };

  const handleSelect = (item: GeoSuggestion) => {
    onChange(item.displayName);
    onSelectLocation({
      displayName: item.displayName,
      lat: item.lat,
      lng: item.lon,
      name: item.name,
      city: item.city,
      country: item.country,
    });
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setHasSearched(false);
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div className="loc-auto-container" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="loc-auto-label">
          {label} {required && <span className="loc-auto-required">*</span>}
        </label>
      )}

      <div className={`loc-auto-input-wrapper ${error ? "has-error" : ""} ${isOpen ? "is-open" : ""}`}>
        <span className="loc-auto-search-icon" aria-hidden="true">
          <MapPin size={18} />
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoFocus={autoFocus}
          className="loc-auto-input"
        />

        <div className="loc-auto-actions-right">
          {isLoading && (
            <span className="loc-auto-spinner" title="Searching locations..." aria-label="Searching locations">
              <Loader2 size={16} className="loc-auto-spin" />
            </span>
          )}

          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="loc-auto-clear-btn"
              title="Clear location"
              aria-label="Clear location input"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="loc-auto-error-text" role="alert">{error}</p>}
      {helperText && !error && <p className="loc-auto-helper-text">{helperText}</p>}

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div id={`${id}-suggestions`} className="loc-auto-dropdown" role="listbox">
          {isLoading && suggestions.length === 0 && (
            <div className="loc-auto-dropdown-status">
              <Loader2 size={16} className="loc-auto-spin" />
              <span>Searching worldwide &amp; local addresses…</span>
            </div>
          )}

          {!isLoading && suggestions.length === 0 && hasSearched && value.trim().length > 0 && (
            <div className="loc-auto-dropdown-status loc-auto-dropdown-empty">
              <span>No matching locations found for &ldquo;<strong>{value.trim()}</strong>&rdquo;.</span>
              <small>Try a different locality or street name, or click directly on the interactive map.</small>
            </div>
          )}

          {suggestions.length > 0 && (
            <ul className="loc-auto-list">
              {suggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={item.id}
                    id={`${id}-opt-${idx}`}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`loc-auto-item ${isHighlighted ? "is-highlighted" : ""}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <div className="loc-auto-item-icon">
                      {item.isKarachi ? (
                        <Building2 size={16} className="loc-icon-karachi" />
                      ) : (
                        <MapPin size={16} className="loc-icon-pin" />
                      )}
                    </div>

                    <div className="loc-auto-item-content">
                      <div className="loc-auto-item-primary">
                        <span className="loc-auto-item-title">
                          <HighlightMatch text={item.name} query={value} />
                        </span>
                        {item.isKarachi && (
                          <span className="loc-badge-karachi">Karachi</span>
                        )}
                        {!item.isKarachi && item.isPakistan && (
                          <span className="loc-badge-pk">Pakistan</span>
                        )}
                      </div>

                      <div className="loc-auto-item-secondary">
                        <HighlightMatch text={item.displayName} query={value} />
                      </div>
                    </div>

                    <div className="loc-auto-item-coords">
                      <span>{item.lat.toFixed(4)}, {item.lon.toFixed(4)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
