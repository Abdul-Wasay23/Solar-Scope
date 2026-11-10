"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import {
  COUNTRY_DIAL_CODES,
  parsePhoneNumber,
  type CountryDialInfo,
} from "@/lib/phone";
import "./PhoneInput.css";

export { COUNTRY_DIAL_CODES, parsePhoneNumber, type CountryDialInfo };

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

