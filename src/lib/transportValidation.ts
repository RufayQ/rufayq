/**
 * Transport segment validation rules.
 *
 * Returns a list of issues (errors block save, warnings are informational).
 * Each issue includes the source `field` so the UI can highlight the exact
 * input that needs attention.
 */
import type { TransportSegment } from "@/components/TransportCard";

export type TransportIssueLevel = "error" | "warning";

export interface TransportIssue {
  field: string;
  message: string;
  level: TransportIssueLevel;
}

const sameCity = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function validateTransportSegment(s: TransportSegment): TransportIssue[] {
  const out: TransportIssue[] = [];

  if (!s.fromCity?.trim())
    out.push({ field: "fromCity", message: "Departure city is required", level: "error" });
  if (!s.toCity?.trim())
    out.push({ field: "toCity", message: "Arrival city is required", level: "error" });
  if (sameCity(s.fromCity, s.toCity))
    out.push({ field: "route", message: "From and To must be different", level: "error" });

  if (!s.departureDateTime)
    out.push({ field: "departureDateTime", message: "Departure date/time required", level: "error" });
  if (!s.arrivalDateTime)
    out.push({ field: "arrivalDateTime", message: "Arrival date/time required", level: "error" });

  if (s.departureDateTime && s.arrivalDateTime) {
    const dep = new Date(s.departureDateTime).getTime();
    const arr = new Date(s.arrivalDateTime).getTime();
    if (!isNaN(dep) && !isNaN(arr) && arr <= dep) {
      out.push({
        field: "arrivalDateTime",
        message: "Arrival must be after departure",
        level: "error",
      });
    }
  }

  switch (s.type) {
    case "flight":
      if (!s.airline) out.push({ field: "airline", message: "Airline missing", level: "warning" });
      if (!s.flightNumber)
        out.push({ field: "flightNumber", message: "Flight number missing", level: "warning" });
      break;
    case "train":
      if (!s.trainNumber)
        out.push({ field: "trainNumber", message: "Train number missing", level: "warning" });
      break;
    case "bus":
      if (!s.busNumber)
        out.push({ field: "busNumber", message: "Bus number missing", level: "warning" });
      break;
    case "taxi":
      if (!s.taxiProvider)
        out.push({ field: "taxiProvider", message: "Taxi provider missing", level: "warning" });
      break;
    case "rental":
      if (!s.rentalCompany)
        out.push({ field: "rentalCompany", message: "Rental company missing", level: "warning" });
      break;
    case "medical":
      if (!s.mobilityType)
        out.push({
          field: "mobilityType",
          message: "Mobility / transfer type missing",
          level: "warning",
        });
      break;
  }

  return out;
}

/** Convenience: map issues to `{ field: message }` for inline highlighting. */
export function fieldErrorMap(issues: TransportIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const i of issues) if (i.level === "error" && !map[i.field]) map[i.field] = i.message;
  return map;
}

export const hasBlockingErrors = (issues: TransportIssue[]) =>
  issues.some((i) => i.level === "error");
