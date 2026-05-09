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
