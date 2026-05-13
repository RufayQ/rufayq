/**
 * Transport ticket data model + validation + adapters.
 *
 * This is the canonical shape used by the new persistence layer
 * (`transportStore.ts`) and the manual-entry sheet. Existing surfaces
 * (`TransportSegment`, `FlightInfo`) keep working via adapters.
 */
import type { Airport } from "@/data/airports";
import { findAirport } from "@/data/airports";
import type { FlightInfo } from "@/components/AddTripSheet";
import type { TransportSegment } from "@/components/TransportCard";
import { isHHmm, normalizeTo24Hour } from "@/lib/time24";
import { normalizeTerminal } from "@/lib/terminal";

export type TripType = "one-way" | "round-trip" | "multi-city";
export type Direction = "outbound" | "return";
export type TravelerKind = "patient" | "companion" | "family";

export type ExtractionProvider = "openai" | "gemini";

/**
 * AI vision extraction metadata persisted alongside a scanned ticket so the
 * UI can show provider/confidence/language badges and re-scan can refresh
 * results from the same source images.
 */
export interface TicketExtractionMetadata {
  provider: ExtractionProvider;
  confidence?: number | null;
  detectedLanguage?: string | null;
  translated?: boolean;
  runAt?: string | null;
}

export interface FlightSegment {
  id: string;
  airline: string;
  flightNumber: string;
  fromAirport: Airport;
  toAirport: Airport;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  arrivalDate?: string;
  arrivalTime?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  departureGate?: string;
  arrivalGate?: string;
  cabinClass?: string;
  fareClass?: string;
  baggageAllowance?: string;
  pnr?: string;
  segmentOrder: number;
  direction: Direction;
}

export interface TransportTicket {
  id: string;
  deviceId: string;
  userId?: string | null;
  sourceDocumentId?: string | null;
  documentType: "flight_ticket";
  tripType: TripType;
  outboundSegments: FlightSegment[];
  returnSegments: FlightSegment[];
  passengerName?: string;
  passengerPassport?: string;
  bookingReference?: string;
  saveToTransportTimeline: boolean;
  saveToMedicalRecords: boolean;
  sendToDoctor: boolean;
  pendingSegmentRef?: string | null;
  traveler?: TravelerKind;
  source?: "ocr" | "manual";
  /** AI extraction metadata (only present when source === "ocr"). */
  extraction?: TicketExtractionMetadata | null;
  /** Storage object paths in the `transport-scans` bucket for the analyzed pages. */
  sourceImagePaths?: string[];
  createdAt: string;
  updatedAt: string;
}

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const emptySegment = (
  direction: Direction,
  segmentOrder: number,
): FlightSegment => ({
  id: newId(),
  airline: "",
  flightNumber: "",
  fromAirport: { code: "", city: "" },
  toAirport: { code: "", city: "" },
  departureDate: "",
  departureTime: "",
  cabinClass: "Economy",
  pnr: "",
  segmentOrder,
  direction,
});

/* ─────────────────────────  validation  ───────────────────────── */

export function validateFlightSegment(segment: FlightSegment): string[] {
  const errors: string[] = [];
  if (!segment.airline?.trim()) errors.push("Airline is required.");
  if (!segment.flightNumber?.trim()) errors.push("Flight number is required.");
  if (!segment.fromAirport?.code) errors.push("From airport is required.");
  if (!segment.toAirport?.code) errors.push("To airport is required.");
  if (
    segment.fromAirport?.code &&
    segment.toAirport?.code &&
    segment.fromAirport.code === segment.toAirport.code
  ) {
    errors.push("From and To airports cannot be the same.");
  }
  if (!segment.departureDate) errors.push("Departure date is required.");
  if (!segment.departureTime) errors.push("Departure time is required.");
  if (segment.departureTime && !isHHmm(segment.departureTime))
    errors.push("Departure time must be in 24-hour HH:mm format.");
  if (segment.arrivalTime && !isHHmm(segment.arrivalTime))
    errors.push("Arrival time must be in 24-hour HH:mm format.");
  return errors;
}

export const validateTicket = (t: TransportTicket): string[] => {
  const errors: string[] = [];
  const all = [...t.outboundSegments, ...t.returnSegments];
  if (all.length === 0) errors.push("At least one flight leg is required.");
  all.forEach((s, i) =>
    validateFlightSegment(s).forEach((e) =>
      errors.push(`Leg ${i + 1}: ${e}`),
    ),
  );
  return errors;
};

/* ─────────────────────────  adapters  ───────────────────────── */

const splitDateTime = (
  iso: string,
): { date: string; time: string } => {
  if (!iso) return { date: "", time: "" };
  const [d, rest] = iso.split("T");
  return { date: d || "", time: normalizeTo24Hour(rest || "") };
};

/** Convert a legacy `FlightInfo` (used by the OCR pipeline + AddTripSheet) into a FlightSegment. */
export function flightInfoToSegment(
  info: FlightInfo,
  direction: Direction,
  segmentOrder: number,
): FlightSegment {
  const dep = splitDateTime(info.departureDateTime);
  const arr = splitDateTime(info.arrivalDateTime);
  const fromKnown = findAirport(info.fromAirport);
  const toKnown = findAirport(info.toAirport);
  return {
    id: newId(),
    airline: info.airline || "",
    flightNumber: (info.flightNumber || "").toUpperCase(),
    fromAirport: fromKnown ?? {
      code: (info.fromAirport || "").toUpperCase(),
      city: info.fromCity || "",
      name: info.fromAirportFull || undefined,
    },
    toAirport: toKnown ?? {
      code: (info.toAirport || "").toUpperCase(),
      city: info.toCity || "",
      name: info.toAirportFull || undefined,
    },
    departureDate: dep.date,
    departureTime: dep.time,
    arrivalDate: arr.date || undefined,
    arrivalTime: arr.time || undefined,
    cabinClass: info.seatClass || "Economy",
    pnr: info.bookingRef || "",
    segmentOrder,
    direction,
  };
}

/** Convert a raw parsed leg from the AI extractor (which carries terminal,
 *  gate, fareClass and baggageAllowance) into a FlightSegment. */
export function parsedLegToSegment(
  raw: any,
  direction: Direction,
  segmentOrder: number,
): FlightSegment {
  const base = flightInfoToSegment(
    {
      airline: raw?.airline ?? "",
      flightNumber: raw?.flightNumber ?? "",
      bookingRef: raw?.bookingRef ?? "",
      fromAirport: raw?.fromAirport ?? "",
      fromCity: raw?.fromCity ?? "",
      fromAirportFull: raw?.fromAirportFull ?? "",
      toAirport: raw?.toAirport ?? "",
      toCity: raw?.toCity ?? "",
      toAirportFull: raw?.toAirportFull ?? "",
      departureDateTime: raw?.departureDateTime ?? "",
      arrivalDateTime: raw?.arrivalDateTime ?? "",
      seatClass: raw?.seatClass ?? "Economy",
      seatNumber: raw?.seatNumber ?? "",
    } as FlightInfo,
    direction,
    segmentOrder,
  );
  return {
    ...base,
    departureTerminal: normalizeTerminal(raw?.fromTerminal || raw?.departureTerminal) || undefined,
    arrivalTerminal: normalizeTerminal(raw?.toTerminal || raw?.arrivalTerminal) || undefined,
    departureGate: raw?.fromGate || raw?.departureGate || undefined,
    arrivalGate: raw?.toGate || raw?.arrivalGate || undefined,
    fareClass: raw?.fareClass || undefined,
    baggageAllowance: raw?.baggageAllowance || undefined,
  };
}

/** Reverse adapter: FlightSegment → legacy FlightInfo. */
export function segmentToFlightInfo(s: FlightSegment): FlightInfo {
  const dep = s.departureDate && s.departureTime
    ? `${s.departureDate}T${s.departureTime}`
    : s.departureDate || "";
  const arr = s.arrivalDate && s.arrivalTime
    ? `${s.arrivalDate}T${s.arrivalTime}`
    : s.arrivalDate || "";
  return {
    airline: s.airline,
    flightNumber: s.flightNumber,
    bookingRef: s.pnr || "",
    fromAirport: s.fromAirport.code,
    fromCity: s.fromAirport.city,
    fromAirportFull: s.fromAirport.name || "",
    toAirport: s.toAirport.code,
    toCity: s.toAirport.city,
    toAirportFull: s.toAirport.name || "",
    departureDateTime: dep,
    arrivalDateTime: arr,
    seatClass: s.cabinClass || "Economy",
    seatNumber: "",
  };
}

/** Convert a TransportTicket into the legacy TransportSegment[] used by the
 *  Journey screen so existing rendering keeps working.  Adds groupId +
 *  segmentOrder + direction so a connected DMM→SHJ→HBE chain can be drawn. */
export function ticketToTransportSegments(t: TransportTicket): TransportSegment[] {
  const all = [...t.outboundSegments, ...t.returnSegments].sort(
    (a, b) => {
      if (a.direction !== b.direction) return a.direction === "outbound" ? -1 : 1;
      return a.segmentOrder - b.segmentOrder;
    },
  );
  return all.map((s, i): TransportSegment => {
    const dep = s.departureDate && s.departureTime
      ? `${s.departureDate}T${s.departureTime}`
      : s.departureDate || new Date().toISOString();
    const arr = s.arrivalDate && s.arrivalTime
      ? `${s.arrivalDate}T${s.arrivalTime}`
      : s.arrivalDate || dep;
    const isFirst = i === 0;
    // Compute layoverAfter when next segment in same direction departs from
    // this segment's arrival airport — that's a transit/connecting leg.
    const next = all[i + 1];
    let layoverAfter: TransportSegment["layoverAfter"] | undefined;
    if (next && next.direction === s.direction && next.fromAirport.code === s.toAirport.code) {
      let duration = "Layover";
      const arrTs = Date.parse(arr);
      const nextDep = next.departureDate && next.departureTime
        ? Date.parse(`${next.departureDate}T${next.departureTime}`)
        : NaN;
      if (!isNaN(arrTs) && !isNaN(nextDep) && nextDep > arrTs) {
        const mins = Math.round((nextDep - arrTs) / 60000);
        const h = Math.floor(mins / 60); const m = mins % 60;
        duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
      layoverAfter = {
        duration,
        airport: s.toAirport.city || s.toAirport.code,
        code: s.toAirport.code,
      };
    }
    return {
      id: isFirst && t.pendingSegmentRef ? t.pendingSegmentRef : s.id,
      type: "flight",
      status: "upcoming",
      fromCode: s.fromAirport.code,
      fromCity: s.fromAirport.city || s.fromAirport.code,
      fromFull: s.fromAirport.name,
      toCode: s.toAirport.code,
      toCity: s.toAirport.city || s.toAirport.code,
      toFull: s.toAirport.name,
      departureDateTime: dep,
      arrivalDateTime: arr,
      bookingRef: s.pnr,
      airline: s.airline,
      flightNumber: s.flightNumber,
      seatClass: s.cabinClass,
      departureTerminal: s.departureTerminal,
      arrivalTerminal: s.arrivalTerminal,
      groupId: t.id,
      segmentOrder: s.segmentOrder,
      direction: s.direction,
      layoverAfter,
      documentSource: t.source === "manual" ? "Manual Entry" : "OCR Scanned",
      extraction: t.source === "manual" ? null : (t.extraction ?? null),
    };
  });
}

export function inferTripType(
  outbound: FlightSegment[],
  ret: FlightSegment[],
): TripType {
  if (outbound.length + ret.length <= 1) return "one-way";
  if (ret.length > 0) return "round-trip";
  return outbound.length > 1 ? "multi-city" : "one-way";
}

/* ─────────────────────────  duplicate detection  ───────────────────────── */

export type DuplicateMatchReason =
  | "flight-number-and-date"
  | "shared-pnr"
  | "same-route-and-time";

export interface DuplicateMatch {
  ticketId: string;
  reason: DuplicateMatchReason;
  /** Human label (EN/AR) describing the conflicting flight for the dialog. */
  label: string;
  labelAr: string;
}

const norm = (v: string | undefined | null): string =>
  (v || "").toString().trim().toUpperCase().replace(/\s+/g, "");

const segLabel = (s: FlightSegment): string =>
  `${s.airline || ""} ${s.flightNumber || ""} · ${s.fromAirport.code} → ${s.toAirport.code} · ${s.departureDate}${s.departureTime ? " " + s.departureTime : ""}`.trim();

const segLabelAr = (s: FlightSegment): string =>
  `${s.airline || ""} ${s.flightNumber || ""} · ${s.fromAirport.code} ← ${s.toAirport.code} · ${s.departureDate}`;

/**
 * Detect tickets in `existing` that overlap with `candidate`.
 *
 * Match rules (any one triggers a match):
 *  - Same normalized flightNumber AND same departureDate
 *  - Same non-empty PNR (case/whitespace insensitive)
 *  - Same fromAirport.code + toAirport.code + departureDate + departureTime
 *
 * The candidate is matched against itself's own id via filter so callers
 * can pass it without extra plumbing.
 */
export function findDuplicateTickets(
  candidate: TransportTicket,
  existing: TransportTicket[],
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const candidateSegs = [...candidate.outboundSegments, ...candidate.returnSegments];
  const candidatePnr = norm(candidate.bookingReference);
  for (const other of existing) {
    if (other.id === candidate.id) continue;
    const otherSegs = [...other.outboundSegments, ...other.returnSegments];
    const otherPnr = norm(other.bookingReference);

    let reason: DuplicateMatchReason | null = null;
    let labelSeg: FlightSegment | null = null;

    // Rule: shared non-empty PNR (booking reference) at the ticket level.
    if (candidatePnr && otherPnr && candidatePnr === otherPnr) {
      reason = "shared-pnr";
      labelSeg = otherSegs[0] || null;
    }

    if (!reason) {
      outer: for (const a of candidateSegs) {
        for (const b of otherSegs) {
          // Rule: same flight number + same departure date.
          if (norm(a.flightNumber) && norm(a.flightNumber) === norm(b.flightNumber) &&
              a.departureDate && a.departureDate === b.departureDate) {
            reason = "flight-number-and-date";
            labelSeg = b;
            break outer;
          }
          // Rule: same route + date + time.
          if (a.fromAirport.code && a.toAirport.code &&
              a.fromAirport.code === b.fromAirport.code &&
              a.toAirport.code === b.toAirport.code &&
              a.departureDate && a.departureDate === b.departureDate &&
              a.departureTime && a.departureTime === b.departureTime) {
            reason = "same-route-and-time";
            labelSeg = b;
            break outer;
          }
          // Rule: shared non-empty PNR at the segment level.
          if (norm(a.pnr) && norm(a.pnr) === norm(b.pnr)) {
            reason = "shared-pnr";
            labelSeg = b;
            break outer;
          }
        }
      }
    }

    if (reason && labelSeg) {
      matches.push({
        ticketId: other.id,
        reason,
        label: segLabel(labelSeg),
        labelAr: segLabelAr(labelSeg),
      });
    }
  }
  return matches;
}

