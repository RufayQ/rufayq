/**
 * Tests for findDuplicateTickets — duplicate detection rules used by the
 * Journey screen before saving a scanned or manually-entered flight ticket.
 */
import { describe, it, expect } from "vitest";
import {
  findDuplicateTickets,
  type FlightSegment,
  type TransportTicket,
} from "@/lib/transportTickets";

const seg = (over: Partial<FlightSegment> = {}): FlightSegment => ({
  id: over.id ?? "seg-1",
  airline: "Saudia",
  flightNumber: "SV123",
  fromAirport: { code: "RUH", city: "Riyadh" },
  toAirport: { code: "FRA", city: "Frankfurt" },
  departureDate: "2026-06-01",
  departureTime: "10:30",
  cabinClass: "Economy",
  pnr: "ABC123",
  segmentOrder: 1,
  direction: "outbound",
  ...over,
});

const ticket = (
  id: string,
  outbound: FlightSegment[],
  bookingReference?: string,
): TransportTicket => ({
  id,
  deviceId: "device-1",
  documentType: "flight_ticket",
  tripType: "one-way",
  outboundSegments: outbound,
  returnSegments: [],
  bookingReference,
  saveToTransportTimeline: true,
  saveToMedicalRecords: false,
  sendToDoctor: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("findDuplicateTickets", () => {
  it("returns empty when there is no overlap", () => {
    const a = ticket("t1", [seg()]);
    const b = ticket("t2", [seg({ flightNumber: "EK999", fromAirport: { code: "DXB", city: "Dubai" }, departureDate: "2026-07-15", pnr: "XYZ" })]);
    expect(findDuplicateTickets(a, [b])).toEqual([]);
  });

  it("detects same flight number and departure date", () => {
    const existing = ticket("t-existing", [seg({ pnr: "DIFF" })]);
    const candidate = ticket("t-new", [seg({ pnr: "OTHER" })]);
    const matches = findDuplicateTickets(candidate, [existing]);
    expect(matches).toHaveLength(1);
    expect(matches[0].ticketId).toBe("t-existing");
    expect(matches[0].reason).toBe("flight-number-and-date");
    expect(matches[0].label).toBeTruthy();
    expect(matches[0].labelAr).toBeTruthy();
  });

  it("detects matching booking reference (PNR)", () => {
    const existing = ticket(
      "t-existing",
      [seg({ flightNumber: "LH100", fromAirport: { code: "JED", city: "Jeddah" }, toAirport: { code: "MUC", city: "Munich" }, departureDate: "2026-09-01", pnr: "" })],
      "SHARED1",
    );
    const candidate = ticket("t-new", [seg({ flightNumber: "EK20", departureDate: "2026-12-12", pnr: "" })], "SHARED1");
    const matches = findDuplicateTickets(candidate, [existing]);
    expect(matches.map((m) => m.reason)).toContain("shared-pnr");
  });

  it("detects same route plus departure date and time when flight numbers differ", () => {
    const existing = ticket("t-existing", [seg({ flightNumber: "SV999", pnr: "NONE" })]);
    const candidate = ticket("t-new", [seg({ flightNumber: "QR55", pnr: "OTHER" })]);
    const matches = findDuplicateTickets(candidate, [existing]);
    expect(matches[0].reason).toBe("same-route-and-time");
  });

  it("ignores the candidate's own id when re-saving", () => {
    const t = ticket("self", [seg()]);
    expect(findDuplicateTickets(t, [t])).toEqual([]);
  });
});
