// Flight itinerary normalization + validation utilities.
// Used by AddTripSheet's scan flow to normalize parsed legs and block save
// when required values are missing or inconsistent.

import type { FlightInfo } from "@/components/AddTripSheet";

// Compact IATA → { city, airport } map for the airports our patient base
// most commonly travels through. We only use this to:
//  - resolve "RUH" → "Riyadh / King Khalid Intl"
//  - detect when scanner mixed up city vs airport name
//  - canonicalize the displayed value
export const IATA: Record<string, { city: string; airport: string; country?: string }> = {
  // Saudi Arabia
  RUH: { city: "Riyadh", airport: "King Khalid International", country: "Saudi Arabia" },
  JED: { city: "Jeddah", airport: "King Abdulaziz International", country: "Saudi Arabia" },
  DMM: { city: "Dammam", airport: "King Fahd International", country: "Saudi Arabia" },
  MED: { city: "Medina", airport: "Prince Mohammad Bin Abdulaziz", country: "Saudi Arabia" },
  AHB: { city: "Abha", airport: "Abha International", country: "Saudi Arabia" },
  TIF: { city: "Taif", airport: "Taif Regional", country: "Saudi Arabia" },
  TUU: { city: "Tabuk", airport: "Tabuk Regional", country: "Saudi Arabia" },
  YNB: { city: "Yanbu", airport: "Yanbu", country: "Saudi Arabia" },
  // GCC
  DXB: { city: "Dubai", airport: "Dubai International", country: "UAE" },
  AUH: { city: "Abu Dhabi", airport: "Zayed International", country: "UAE" },
  SHJ: { city: "Sharjah", airport: "Sharjah International", country: "UAE" },
  DOH: { city: "Doha", airport: "Hamad International", country: "Qatar" },
  BAH: { city: "Manama", airport: "Bahrain International", country: "Bahrain" },
  KWI: { city: "Kuwait City", airport: "Kuwait International", country: "Kuwait" },
  MCT: { city: "Muscat", airport: "Muscat International", country: "Oman" },
  // Levant + Egypt
  CAI: { city: "Cairo", airport: "Cairo International", country: "Egypt" },
  AMM: { city: "Amman", airport: "Queen Alia International", country: "Jordan" },
  BEY: { city: "Beirut", airport: "Rafic Hariri International", country: "Lebanon" },
  // Türkiye
  IST: { city: "Istanbul", airport: "Istanbul Airport", country: "Türkiye" },
  SAW: { city: "Istanbul", airport: "Sabiha Gökçen", country: "Türkiye" },
  ESB: { city: "Ankara", airport: "Esenboğa", country: "Türkiye" },
  AYT: { city: "Antalya", airport: "Antalya Airport", country: "Türkiye" },
  // Europe
  FRA: { city: "Frankfurt", airport: "Frankfurt am Main", country: "Germany" },
  MUC: { city: "Munich", airport: "Munich Airport", country: "Germany" },
  BER: { city: "Berlin", airport: "Berlin Brandenburg", country: "Germany" },
  HAM: { city: "Hamburg", airport: "Hamburg Airport", country: "Germany" },
  DUS: { city: "Düsseldorf", airport: "Düsseldorf Airport", country: "Germany" },
  CGN: { city: "Cologne", airport: "Cologne Bonn", country: "Germany" },
  CDG: { city: "Paris", airport: "Charles de Gaulle", country: "France" },
  ORY: { city: "Paris", airport: "Orly", country: "France" },
  LHR: { city: "London", airport: "Heathrow", country: "UK" },
  LGW: { city: "London", airport: "Gatwick", country: "UK" },
  MAN: { city: "Manchester", airport: "Manchester Airport", country: "UK" },
  AMS: { city: "Amsterdam", airport: "Schiphol", country: "Netherlands" },
  ZRH: { city: "Zurich", airport: "Zurich Airport", country: "Switzerland" },
  GVA: { city: "Geneva", airport: "Geneva Airport", country: "Switzerland" },
  VIE: { city: "Vienna", airport: "Vienna International", country: "Austria" },
  FCO: { city: "Rome", airport: "Fiumicino", country: "Italy" },
  MXP: { city: "Milan", airport: "Malpensa", country: "Italy" },
  MAD: { city: "Madrid", airport: "Madrid-Barajas", country: "Spain" },
  BCN: { city: "Barcelona", airport: "El Prat", country: "Spain" },
  // North America
  JFK: { city: "New York", airport: "John F. Kennedy", country: "USA" },
  EWR: { city: "Newark", airport: "Newark Liberty", country: "USA" },
  BOS: { city: "Boston", airport: "Logan International", country: "USA" },
  IAD: { city: "Washington", airport: "Dulles International", country: "USA" },
  ORD: { city: "Chicago", airport: "O'Hare", country: "USA" },
  LAX: { city: "Los Angeles", airport: "Los Angeles International", country: "USA" },
  // Asia
  BKK: { city: "Bangkok", airport: "Suvarnabhumi", country: "Thailand" },
  KUL: { city: "Kuala Lumpur", airport: "Kuala Lumpur International", country: "Malaysia" },
  SIN: { city: "Singapore", airport: "Changi", country: "Singapore" },
  DEL: { city: "Delhi", airport: "Indira Gandhi International", country: "India" },
  BOM: { city: "Mumbai", airport: "Chhatrapati Shivaji", country: "India" },
};

const IATA_RE = /^[A-Z]{3}$/;
const CITY_IATA_RE = /^\s*([^()]+?)\s*\(\s*([A-Z]{3})\s*\)\s*$/;

/** Split "Riyadh (RUH)" into { city: "Riyadh", code: "RUH" }. */
const splitCityIata = (raw: string): { city: string; code: string } | null => {
  if (!raw) return null;
  const m = raw.trim().match(CITY_IATA_RE);
  if (!m) return null;
  return { city: m[1].trim(), code: m[2].toUpperCase() };
};

/** Normalize free-form scanner output for one airport endpoint. */
export function resolveAirport(rawCode?: string, rawCity?: string, rawFull?: string) {
  let code = (rawCode || "").trim().toUpperCase();
  let cityIn = (rawCity || "").trim();
  const fullIn = (rawFull || "").trim();

  // English ticket pattern "City (IATA)" can appear in any of these fields.
  for (const candidate of [rawCity, rawCode, rawFull]) {
    const split = splitCityIata(candidate || "");
    if (split) {
      cityIn = split.city;
      if (!IATA_RE.test(code)) code = split.code;
      break;
    }
  }

  if (IATA_RE.test(code) && IATA[code]) {
    const entry = IATA[code];
    return { code, city: cityIn || entry.city, airport: entry.airport };
  }
  // Sometimes the scanner shoves "Riyadh — King Khalid Intl" into city
  // or "BER — Berlin Brandenburg" into the code field. Pull out the IATA.
  const m = (cityIn + " " + fullIn + " " + code).match(/\b([A-Z]{3})\b/);
  if (m && IATA[m[1]]) {
    const entry = IATA[m[1]];
    return { code: m[1], city: cityIn || entry.city, airport: entry.airport };
  }
  // Best-effort fallback — keep raw values, no IATA enrichment.
  return { code, city: cityIn, airport: fullIn || cityIn };
}

/**
 * Convert a date+time string with AM/PM into ISO `YYYY-MM-DDTHH:mm`.
 * Returns the original string when the date portion isn't reliably present
 * (we never invent a date — better to surface the issue than to lie).
 *
 * Accepts: "2026-05-10 7:45 PM", "2026/05/10 10:30 am", "2026-05-10T7:45 PM",
 *          "2026-05-10 19:45" (already 24h, returned normalized).
 */
export function normalizeDateTime(input?: string | null): string {
  if (!input) return "";
  const raw = String(input).trim();
  if (!raw) return "";

  // Already ISO 24h with optional seconds: trim to YYYY-MM-DDTHH:mm.
  const iso24 = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (iso24) {
    const [, y, mo, d, h, mi] = iso24;
    if (Number(h) <= 23) {
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}`;
    }
  }

  // 12h with AM/PM marker.
  const ampm = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    const [, y, mo, d, hStr, mi, mer] = ampm;
    let h = parseInt(hStr, 10);
    const isPm = mer.toUpperCase() === "PM";
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${String(h).padStart(2, "0")}:${mi}`;
  }

  // Last resort: return the first 16 chars (legacy slice behavior) so we
  // don't break existing clean ISO inputs.
  return raw.slice(0, 16);
}

export interface FlightValidationIssue {
  field: keyof FlightInfo | "departure" | "arrival" | "route";
  level: "error" | "warning";
  message: string;
}

/** Validate a flight leg — returns errors that should block save and warnings to surface. */
export function validateFlight(f: FlightInfo, label: string): FlightValidationIssue[] {
  const issues: FlightValidationIssue[] = [];
  if (!f.fromAirport && !f.fromCity) issues.push({ field: "fromAirport", level: "error", message: `${label}: missing departure airport` });
  if (!f.toAirport && !f.toCity) issues.push({ field: "toAirport", level: "error", message: `${label}: missing arrival airport` });
  if (!f.flightNumber) issues.push({ field: "flightNumber", level: "error", message: `${label}: missing flight number` });
  if (!f.bookingRef) issues.push({ field: "bookingRef", level: "warning", message: `${label}: missing PNR / booking reference` });
  if (!f.departureDateTime) issues.push({ field: "departure", level: "error", message: `${label}: missing departure date/time` });

  const sameAirport = f.fromAirport && f.toAirport && f.fromAirport.toUpperCase() === f.toAirport.toUpperCase();
  if (sameAirport) issues.push({ field: "route", level: "error", message: `${label}: from and to airports are identical` });

  if (f.departureDateTime && f.arrivalDateTime) {
    const dep = new Date(f.departureDateTime).getTime();
    const arr = new Date(f.arrivalDateTime).getTime();
    if (!isNaN(dep) && !isNaN(arr) && arr <= dep) {
      issues.push({ field: "arrival", level: "error", message: `${label}: arrival must be after departure` });
    }
  }
  return issues;
}

/** Normalize a parsed leg from the scanner into a clean FlightInfo, swapping fields if needed. */
export function normalizeParsedLeg(leg: any): FlightInfo {
  const from = resolveAirport(leg?.fromAirport, leg?.fromCity, leg?.fromAirportFull);
  const to = resolveAirport(leg?.toAirport, leg?.toCity, leg?.toAirportFull);
  return {
    airline: String(leg?.airline || "").trim(),
    flightNumber: String(leg?.flightNumber || "").toUpperCase().replace(/\s+/g, " ").trim(),
    bookingRef: String(leg?.bookingRef || "").toUpperCase().trim(),
    fromAirport: from.code,
    fromCity: from.city,
    fromAirportFull: from.airport,
    toAirport: to.code,
    toCity: to.city,
    toAirportFull: to.airport,
    departureDateTime: normalizeDateTime(leg?.departureDateTime),
    arrivalDateTime: normalizeDateTime(leg?.arrivalDateTime),
    seatClass: String(leg?.seatClass || "Economy").replace(/^./, (c: string) => c.toUpperCase()),
    seatNumber: String(leg?.seatNumber || "").toUpperCase(),
  };
}
