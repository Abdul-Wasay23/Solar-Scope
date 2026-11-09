/**
 * SolarScope — Country and City Geographic Data & Coordinate Parsing Utilities
 * Used for dynamic country/city zooming, boundary constraint, and coordinate detection.
 */

export interface CityRegion {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  bounds: [[number, number], [number, number]];
}

export interface CountryRegion {
  code: string;
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
  bounds: [[number, number], [number, number]];
  cities: CityRegion[];
}

export const SUPPORTED_COUNTRIES: CountryRegion[] = [
  {
    code: "PK",
    name: "Pakistan",
    center: { lat: 30.3753, lng: 69.3451 },
    zoom: 6,
    bounds: [
      [23.6345, 60.8728],
      [37.0841, 77.8375],
    ],
    cities: [
      {
        id: "isb",
        name: "Islamabad",
        center: { lat: 33.6844, lng: 73.0479 },
        zoom: 13,
        bounds: [
          [33.58, 72.85],
          [33.78, 73.20],
        ],
      },
      {
        id: "khi",
        name: "Karachi",
        center: { lat: 24.8607, lng: 67.0011 },
        zoom: 12,
        bounds: [
          [24.75, 66.85],
          [25.15, 67.35],
        ],
      },
      {
        id: "lhr",
        name: "Lahore",
        center: { lat: 31.5204, lng: 74.3587 },
        zoom: 12,
        bounds: [
          [31.35, 74.15],
          [31.68, 74.55],
        ],
      },
      {
        id: "rwp",
        name: "Rawalpindi",
        center: { lat: 33.5651, lng: 73.0169 },
        zoom: 13,
        bounds: [
          [33.48, 72.95],
          [33.65, 73.15],
        ],
      },
      {
        id: "fsd",
        name: "Faisalabad",
        center: { lat: 31.4504, lng: 73.1350 },
        zoom: 12,
        bounds: [
          [31.35, 73.00],
          [31.55, 73.25],
        ],
      },
      {
        id: "mux",
        name: "Multan",
        center: { lat: 30.1575, lng: 71.5249 },
        zoom: 12,
        bounds: [
          [30.08, 71.40],
          [30.25, 71.60],
        ],
      },
      {
        id: "pew",
        name: "Peshawar",
        center: { lat: 34.0151, lng: 71.5249 },
        zoom: 13,
        bounds: [
          [33.95, 71.42],
          [34.10, 71.65],
        ],
      },
      {
        id: "uet",
        name: "Quetta",
        center: { lat: 30.1798, lng: 66.9750 },
        zoom: 13,
        bounds: [
          [30.10, 66.88],
          [30.28, 67.08],
        ],
      },
      {
        id: "skt",
        name: "Sialkot",
        center: { lat: 32.4945, lng: 74.5229 },
        zoom: 13,
        bounds: [
          [32.42, 74.45],
          [32.58, 74.60],
        ],
      },
      {
        id: "hyd",
        name: "Hyderabad",
        center: { lat: 25.3960, lng: 68.3578 },
        zoom: 13,
        bounds: [
          [25.32, 68.28],
          [25.48, 68.45],
        ],
      },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom (UK)",
    center: { lat: 55.3781, lng: -3.4360 },
    zoom: 6,
    bounds: [
      [49.8, -8.5],
      [60.9, 1.8],
    ],
    cities: [
      {
        id: "lon",
        name: "London",
        center: { lat: 51.5074, lng: -0.1278 },
        zoom: 12,
        bounds: [
          [51.28, -0.51],
          [51.69, 0.33],
        ],
      },
      {
        id: "bhx",
        name: "Birmingham",
        center: { lat: 52.4862, lng: -1.8904 },
        zoom: 12,
        bounds: [
          [52.38, -2.03],
          [52.60, -1.75],
        ],
      },
      {
        id: "man",
        name: "Manchester",
        center: { lat: 53.4808, lng: -2.2426 },
        zoom: 12,
        bounds: [
          [53.40, -2.35],
          [53.55, -2.15],
        ],
      },
      {
        id: "edi",
        name: "Edinburgh",
        center: { lat: 55.9533, lng: -3.1883 },
        zoom: 12,
        bounds: [
          [55.89, -3.32],
          [56.01, -3.08],
        ],
      },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates (UAE)",
    center: { lat: 23.4241, lng: 53.8478 },
    zoom: 7,
    bounds: [
      [22.6, 51.5],
      [26.1, 56.4],
    ],
    cities: [
      {
        id: "dxb",
        name: "Dubai",
        center: { lat: 25.2048, lng: 55.2708 },
        zoom: 12,
        bounds: [
          [24.95, 54.95],
          [25.35, 55.55],
        ],
      },
      {
        id: "auh",
        name: "Abu Dhabi",
        center: { lat: 24.4539, lng: 54.3773 },
        zoom: 12,
        bounds: [
          [24.25, 54.20],
          [24.60, 54.60],
        ],
      },
      {
        id: "shj",
        name: "Sharjah",
        center: { lat: 25.3463, lng: 55.4209 },
        zoom: 12,
        bounds: [
          [25.25, 55.30],
          [25.45, 55.55],
        ],
      },
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    center: { lat: 23.8859, lng: 45.0792 },
    zoom: 6,
    bounds: [
      [16.3, 34.5],
      [32.2, 55.7],
    ],
    cities: [
      {
        id: "ruh",
        name: "Riyadh",
        center: { lat: 24.7136, lng: 46.6753 },
        zoom: 12,
        bounds: [
          [24.50, 46.50],
          [24.95, 46.90],
        ],
      },
      {
        id: "jed",
        name: "Jeddah",
        center: { lat: 21.5433, lng: 39.1728 },
        zoom: 12,
        bounds: [
          [21.30, 39.00],
          [21.80, 39.35],
        ],
      },
      {
        id: "dmm",
        name: "Dammam",
        center: { lat: 26.4207, lng: 50.0888 },
        zoom: 12,
        bounds: [
          [26.30, 49.95],
          [26.55, 50.25],
        ],
      },
    ],
  },
  {
    code: "US",
    name: "United States (US)",
    center: { lat: 37.0902, lng: -95.7129 },
    zoom: 4,
    bounds: [
      [24.4, -125.0],
      [49.4, -66.9],
    ],
    cities: [
      {
        id: "nyc",
        name: "New York",
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 11,
        bounds: [
          [40.50, -74.26],
          [40.92, -73.70],
        ],
      },
      {
        id: "lax",
        name: "Los Angeles",
        center: { lat: 34.0522, lng: -118.2437 },
        zoom: 11,
        bounds: [
          [33.70, -118.67],
          [34.34, -118.15],
        ],
      },
      {
        id: "sfo",
        name: "San Francisco",
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12,
        bounds: [
          [37.70, -122.52],
          [37.83, -122.35],
        ],
      },
    ],
  },
];

/**
 * Parses user input for latitude and longitude.
 * Supports formats such as:
 * - "33.6844, 73.0479"
 * - "33.6844 73.0479"
 * - "lat: 33.6844, lng: 73.0479"
 * - "33.6844° N, 73.0479° E"
 * Returns { lat, lng } or null if invalid.
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== "string") return null;

  const cleaned = input
    .trim()
    .replace(/[°NSEWnsew]/g, "")
    .replace(/[lLaAtT:]+/gi, "")
    .replace(/[lLoOnNgG:]+/gi, "");

  // Match two decimal or integer numbers separated by comma, space, or semicolon
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)[,\s;]+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (isNaN(lat) || isNaN(lng)) return null;

  // Validate standard geographic ranges
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }

  return null;
}
