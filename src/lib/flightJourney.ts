/**
 * Slice 2A — Flight journey data model.
 *
 * Normalizes raw OCR payloads (or manual entry payloads) into a uniform
 * `FlightJourney` shape that downstream UI (JourneyTimeline) and the save
 * pipeline (Transport Timeline) can consume without caring about source.
 */

import { normalizeParsedLeg } from "@/lib/flightParsing";
import type { FlightInfo } from "@/components/AddTripSheet";

export type JourneySource = "ocr" | "manual";
export type TripType = "one-way" | "round-trip" | "multi-city";

export interface JourneyAirportRef {
  code: string;
  city: string;
  fullName?: string;
}

export interface JourneyLeg {
  airline: string;
  flightNumber: string;
  bookingRef: string;
  from: JourneyAirportRef;
  to: JourneyAirportRef;
  departureDateTime: string; // ISO or empty
  arrivalDateTime: string;   // ISO or empty
  seatClass: string;
  seatNumber: string;
}

export interface JourneyPassenger {
  name?: string;
  passport?: string;
}

export interface DroppedLeg {
  reason: "missing-route" | "invalid";
  raw: any;
}

export interface FlightJourney {
  tripType: TripType;
  legs: JourneyLeg[];
  passenger?: JourneyPassenger;
  source: JourneySource;
  sourceDocId?: string;
  dropped: DroppedLeg[];
}

/** Input shape accepted by `parseFlightJourney`. */
export interface ParseFlightJourneyInput {
  // Scanner-style fields
  outbound?: FlightInfo | null;
  return?: FlightInfo | null;
  // Manual / multi-city: arbitrary ordered legs (already FlightInfo or raw)
  legs?: Array<FlightInfo | any> | null;
  passenger?: JourneyPassenger;
  sourceDocId?: string;
}

const toAirportRef = (code: string, city: string, full: string): JourneyAirportRef => ({
  code: (code || "").trim().toUpperCase(),
  city: (city || "").trim(),
  fullName: full?.trim() || undefined,
});

const isFlightInfoShape = (v: any): v is FlightInfo =>
  v && typeof v === "object" && "fromAirport" in v && "toAirport" in v;

const toJourneyLeg = (info: FlightInfo): JourneyLeg => ({
  airline: (info.airline || "").trim(),
  flightNumber: (info.flightNumber || "").trim().toUpperCase().replace(/\s+/g, ""),
  bookingRef: (info.bookingRef || "").trim().toUpperCase(),
  from: toAirportRef(info.fromAirport, info.fromCity, info.fromAirportFull),
  to: toAirportRef(info.toAirport, info.toCity, info.toAirportFull),
  departureDateTime: info.departureDateTime || "",
  arrivalDateTime: info.arrivalDateTime || "",
  seatClass: (info.seatClass || "").trim(),
  seatNumber: (info.seatNumber || "").trim().toUpperCase(),
});

const isLegValid = (l: JourneyLeg) => !!(l.from.code && l.to.code && l.from.code !== l.to.code);

const parseTime = (iso: string) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

const inferTripType = (legs: JourneyLeg[]): TripType => {
  if (legs.length <= 1) return "one-way";
  if (legs.length === 2) {
    const [a, b] = legs;
    if (a.from.code && a.from.code === b.to.code && a.to.code === b.from.code) {
      return "round-trip";
    }
  }
  return "multi-city";
};

/** Idempotency key for de-duping legs across sources. */
export const journeyLegKey = (l: JourneyLeg): string =>
  `${l.flightNumber}|${l.departureDateTime}`;

/**
 * Computed layover between two consecutive legs.
 * Returns null when this isn't a transit (different airports) or when timestamps
 * are missing/invalid. `airport` and `code` come from the previous leg's arrival.
 */
export interface ComputedLayover {
  durationMinutes: number;
  durationLabel: string;
  airport: string;
  code: string;
}

/**
 * Format a duration in minutes for the journey UI.
 *
 *   < 60m  →  "Nm"
 *   < 24h  →  "Hh Mm"  (drops "0m"  →  e.g. "1h", "1h 30m")
 *   ≥ 24h  →  "Dd Hh"  (drops "0h"  →  e.g. "1d", "1d 1h", "2d")
 */
export const formatDuration = (mins: number): string => {
  const total = Math.max(0, Math.round(mins));
  if (total < 60) return `${total}m`;
  if (total < 24 * 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const d = Math.floor(total / (24 * 60));
  const h = Math.floor((total % (24 * 60)) / 60);
  return h === 0 ? `${d}d` : `${d}d ${h}h`;
};

const fmtDur = (mins: number) => formatDuration(mins);

export function computeLayover(prev: JourneyLeg, next: JourneyLeg): ComputedLayover | null {
  if (!prev || !next) return null;
  if (!prev.to.code || !next.from.code) return null;
  if (prev.to.code !== next.from.code) return null;
  const arr = Date.parse(prev.arrivalDateTime);
  const dep = Date.parse(next.departureDateTime);
  if (isNaN(arr) || isNaN(dep) || dep <= arr) return null;
  const mins = Math.round((dep - arr) / 60000);
  return {
    durationMinutes: mins,
    durationLabel: fmtDur(mins),
    airport: prev.to.city || prev.to.code,
    code: prev.to.code,
  };
}

/**
 * Parse a scanner OCR payload (or manual entry payload) into a normalized
 * FlightJourney. Invalid/incomplete legs are surfaced via `dropped` rather
 * than thrown, so callers can show partial results.
 */
export function parseFlightJourney(
  input: ParseFlightJourneyInput | null | undefined,
  source: JourneySource,
): FlightJourney {
  const dropped: DroppedLeg[] = [];
  const collected: FlightInfo[] = [];

  const ingest = (raw: FlightInfo | any | null | undefined) => {
    if (!raw) return;
    const info = isFlightInfoShape(raw) ? raw : normalizeParsedLeg(raw);
    collected.push(info);
  };

  if (input) {
    ingest(input.outbound);
    ingest(input.return);
    if (Array.isArray(input.legs)) input.legs.forEach(ingest);
  }

  // Normalize, validate, dedupe
  const seen = new Set<string>();
  const legs: JourneyLeg[] = [];
  for (const info of collected) {
    const leg = toJourneyLeg(info);
    if (!isLegValid(leg)) {
      dropped.push({ reason: "missing-route", raw: info });
      continue;
    }
    const key = journeyLegKey(leg);
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push(leg);
  }

  legs.sort((a, b) => parseTime(a.departureDateTime) - parseTime(b.departureDateTime));

  return {
    tripType: inferTripType(legs),
    legs,
    passenger: input?.passenger,
    source,
    sourceDocId: input?.sourceDocId,
    dropped,
  };
}
