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

/**
 * Standardizes any raw phone input string into clean international E.164 format with space:
 * e.g., "3192020749" -> "+92 3192020749"
 * e.g., "03192020749" -> "+92 3192020749"
 * e.g., "+923192020749" -> "+92 3192020749"
 * e.g., "+92 3192020749" -> "+92 3192020749"
 */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumber(trimmed);
  if (!parsed.localDigits) {
    return trimmed;
  }

  return `${parsed.country.dialCode} ${parsed.localDigits}`;
}
