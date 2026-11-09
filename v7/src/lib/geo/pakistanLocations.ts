/**
 * SolarScope — Curated Pakistan & Karachi Location Index
 * Provides instant zero-latency autocomplete suggestions for popular areas,
 * societies, roads, and cities across Pakistan (especially Karachi).
 */

export interface PresetLocation {
  display_name: string;
  lat: string;
  lon: string;
  city: string;
  country: string;
  type: string;
}

export const PAKISTAN_PRESET_LOCATIONS: PresetLocation[] = [
  // Karachi - Popular Societies, Roads & Landmarks
  {
    display_name: "Rizvia Society, Nazimabad, Karachi, Sindh, Pakistan",
    lat: "24.9128",
    lon: "67.0267",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "Rizwan Society, University Road, Gulshan-e-Iqbal, Karachi, Pakistan",
    lat: "24.9312",
    lon: "67.1145",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "Rashid Minhas Road, Gulshan-e-Iqbal, Karachi, Sindh, Pakistan",
    lat: "24.9189",
    lon: "67.1062",
    city: "Karachi",
    country: "Pakistan",
    type: "highway",
  },
  {
    display_name: "Rafa-e-Aam Society, Malir, Karachi, Sindh, Pakistan",
    lat: "24.8911",
    lon: "67.1852",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "Rawalpindi, Punjab, Pakistan",
    lat: "33.5651",
    lon: "73.0169",
    city: "Rawalpindi",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Rahim Yar Khan, Punjab, Pakistan",
    lat: "28.4212",
    lon: "70.2989",
    city: "Rahim Yar Khan",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Gulshan-e-Iqbal, Karachi, Sindh, Pakistan",
    lat: "24.9207",
    lon: "67.0982",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "Gulistan-e-Jauhar, Karachi, Sindh, Pakistan",
    lat: "24.9315",
    lon: "67.1352",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "DHA Defence Phase 5, Clifton, Karachi, Sindh, Pakistan",
    lat: "24.7958",
    lon: "67.0583",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "DHA Defence Phase 6, Karachi, Sindh, Pakistan",
    lat: "24.7876",
    lon: "67.0694",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "DHA Defence Phase 8, Karachi, Sindh, Pakistan",
    lat: "24.7735",
    lon: "67.0864",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "Clifton Block 2, Karachi, Sindh, Pakistan",
    lat: "24.8197",
    lon: "67.0278",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "Clifton Block 4, Karachi, Sindh, Pakistan",
    lat: "24.8236",
    lon: "67.0312",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "PECHS Block 6, Shahrah-e-Faisal, Karachi, Sindh, Pakistan",
    lat: "24.8624",
    lon: "67.0734",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "Bahria Town Karachi, Super Highway, Sindh, Pakistan",
    lat: "25.0125",
    lon: "67.3347",
    city: "Karachi",
    country: "Pakistan",
    type: "residential",
  },
  {
    display_name: "North Nazimabad Block H, Karachi, Sindh, Pakistan",
    lat: "24.9421",
    lon: "67.0425",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "Federal B Area Block 14, Karachi, Sindh, Pakistan",
    lat: "24.9284",
    lon: "67.0682",
    city: "Karachi",
    country: "Pakistan",
    type: "suburb",
  },
  {
    display_name: "Korangi Industrial Area, Karachi, Sindh, Pakistan",
    lat: "24.8398",
    lon: "67.1235",
    city: "Karachi",
    country: "Pakistan",
    type: "industrial",
  },
  {
    display_name: "S.I.T.E. Industrial Area, Manghopir Road, Karachi, Pakistan",
    lat: "24.8967",
    lon: "67.0012",
    city: "Karachi",
    country: "Pakistan",
    type: "industrial",
  },
  {
    display_name: "Karachi, Sindh, Pakistan",
    lat: "24.8607",
    lon: "67.0011",
    city: "Karachi",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Lahore, Punjab, Pakistan",
    lat: "31.5204",
    lon: "74.3587",
    city: "Lahore",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Islamabad, Federal Capital Territory, Pakistan",
    lat: "33.6844",
    lon: "73.0479",
    city: "Islamabad",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Faisalabad, Punjab, Pakistan",
    lat: "31.4504",
    lon: "73.1350",
    city: "Faisalabad",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Multan, Punjab, Pakistan",
    lat: "30.1575",
    lon: "71.5249",
    city: "Multan",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Peshawar, Khyber Pakhtunkhwa, Pakistan",
    lat: "34.0151",
    lon: "71.5249",
    city: "Peshawar",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Quetta, Balochistan, Pakistan",
    lat: "30.1798",
    lon: "66.9750",
    city: "Quetta",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Hyderabad, Sindh, Pakistan",
    lat: "25.3960",
    lon: "68.3578",
    city: "Hyderabad",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Sialkot, Punjab, Pakistan",
    lat: "32.4945",
    lon: "74.5229",
    city: "Sialkot",
    country: "Pakistan",
    type: "city",
  },
  {
    display_name: "Gujranwala, Punjab, Pakistan",
    lat: "32.1877",
    lon: "74.1945",
    city: "Gujranwala",
    country: "Pakistan",
    type: "city",
  },
];

/**
 * Searches local Pakistan presets with instant matching on any substring or prefix.
 */
export function searchLocalPakistanLocations(query: string): PresetLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Match anywhere in display_name, prioritizing startsWith
  const startsWith = PAKISTAN_PRESET_LOCATIONS.filter((item) =>
    item.display_name.toLowerCase().startsWith(q)
  );
  const contains = PAKISTAN_PRESET_LOCATIONS.filter(
    (item) =>
      !item.display_name.toLowerCase().startsWith(q) &&
      item.display_name.toLowerCase().includes(q)
  );

  return [...startsWith, ...contains].slice(0, 8);
}

