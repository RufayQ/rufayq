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

export type TripType = "one-way" | "round-trip" | "multi-city";
export type Direction = "outbound" | "return";
export type TravelerKind = "patient" | "companion" | "family";

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
  cabinClass?: string;
  pnr?: string;
  segmentOrder: number;
  direction: Direction;
}

export interface TransportTicket {
  id: string;
  deviceId: string;
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
      documentSource: t.source === "manual" ? "Manual Entry" : "OCR Scanned",
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
