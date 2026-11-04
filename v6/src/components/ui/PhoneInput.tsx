"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import "./PhoneInput.css";

export interface CountryDialInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  digitCount: number;
  placeholder: string;
}

export const COUNTRY_DIAL_CODES: CountryDialInfo[] = [
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", digitCount: 10, placeholder: "300 1234567" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", digitCount: 9, placeholder: "50 123 4567" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", digitCount: 9, placeholder: "50 123 4567" },
  { code: "US", name: "United States / Canada", dialCode: "+1", flag: "🇺🇸", digitCount: 10, placeholder: "202 555 0123" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", digitCount: 10, placeholder: "7911 123456" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", digitCount: 8, placeholder: "3312 3456" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", digitCount: 8, placeholder: "9123 4567" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", digitCount: 8, placeholder: "9123 4567" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", digitCount: 8, placeholder: "3600 1234" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", digitCount: 10, placeholder: "501 234 5678" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", digitCount: 11, placeholder: "151 23456789" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", digitCount: 9, placeholder: "412 345 678" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", digitCount: 11, placeholder: "138 0000 0000" },
];

/**
 * Splits a full raw phone string (e.g. "+92 300 1234567" or "+923001234567") into dialCode and local digits.
 */
export function parsePhoneNumber(raw: string): { country: CountryDialInfo; localDigits: string } {
  const cleaned = (raw || "").trim();
  for (const c of COUNTRY_DIAL_CODES) {
    if (cleaned.startsWith(c.dialCode)) {
      const remaining = cleaned.slice(c.dialCode.length).replace(/\D/g, "");
      return { country: c, localDigits: remaining.slice(0, c.digitCount) };
    }
  }
  // Default to Pakistan
  const pk = COUNTRY_DIAL_CODES[0];
  const digitsOnly = cleaned.replace(/\D/g, "");
  // If user entered 03001234567, strip leading 0 for PK
  const local = digitsOnly.startsWith("92")
    ? digitsOnly.slice(2)
    : digitsOnly.startsWith("0")
    ? digitsOnly.slice(1)
    : digitsOnly;
  return { country: pk, localDigits: local.slice(0, pk.digitCount) };
}

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string, isValid: boolean) => void;
  id?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  id,
  disabled = false,
  hasError = false,
}: PhoneInputProps) {
  const parsed = useMemo(() => parsePhoneNumber(value), [value]);

  const [selectedCountry, setSelectedCountry] = useState<CountryDialInfo>(parsed.country);
  const [localNumber, setLocalNumber] = useState<string>(parsed.localDigits);

  // Sync internal state if external value changes significantly
  useEffect(() => {
    const p = parsePhoneNumber(value);
    setSelectedCountry(p.country);
    setLocalNumber(p.localDigits);
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRY_DIAL_CODES.find((c) => c.code === e.target.value) || COUNTRY_DIAL_CODES[0];
    setSelectedCountry(found);
    const trimmedDigits = localNumber.slice(0, found.digitCount);
    setLocalNumber(trimmedDigits);

    const full = trimmedDigits ? `${found.dialCode} ${trimmedDigits}` : "";
    const valid = trimmedDigits.length === found.digitCount;
    onChange(full, valid);
  };

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits
    let digits = e.target.value.replace(/\D/g, "");

    // If typing Pakistani 0300..., strip leading 0
    if (selectedCountry.code === "PK" && digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // Strict cap: banda number enter karte jaaen wo apne digits main fit ho aur extra exceed na ho
    const capped = digits.slice(0, selectedCountry.digitCount);
    setLocalNumber(capped);

    const full = capped ? `${selectedCountry.dialCode} ${capped}` : "";
    const valid = capped.length === selectedCountry.digitCount;
    onChange(full, valid);
  };

  return (
    <div className={`solarscope-phone-input-wrap ${hasError ? "has-error" : ""} ${disabled ? "is-disabled" : ""}`}>
      {/* Country Code Picker Dropdown */}
      <div className="phone-country-select-box">
        <span className="phone-country-flag">{selectedCountry.flag}</span>
        <span className="phone-country-dialcode">{selectedCountry.dialCode}</span>
        <ChevronDown size={13} className="phone-country-chevron" />
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          disabled={disabled}
          className="phone-country-native-select"
          aria-label="Select Country Code"
        >
          {COUNTRY_DIAL_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.dialCode})
            </option>
          ))}
        </select>
      </div>

      <div className="phone-number-field-box">
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={localNumber}
          onChange={handleDigitsChange}
          placeholder={selectedCountry.placeholder}
          maxLength={selectedCountry.digitCount}
          disabled={disabled}
          className="phone-number-native-input"
        />
      </div>
    </div>
  );
}

