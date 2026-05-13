/**
 * Tests for findDuplicateTickets — duplicate detection rules used by the
 * Journey screen before saving a scanned or manually-entered flight ticket.
 */
<<<<<<< ours
<<<<<<< ours
import { describe, it, expect } from "vitest";
=======
import { describe, expect, it } from "vitest";
>>>>>>> theirs
=======
import { describe, expect, it } from "vitest";
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
  pnr: "ABC123",
  segmentOrder: 1,
=======
  pnr: Object.prototype.hasOwnProperty.call(over, "pnr") ? over.pnr : "ABC123",
  segmentOrder: 0,
>>>>>>> theirs
=======
  pnr: Object.prototype.hasOwnProperty.call(over, "pnr") ? over.pnr : "ABC123",
  segmentOrder: 0,
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
=======
  userId: "user-1",
  sourceDocumentId: null,
>>>>>>> theirs
=======
  userId: "user-1",
  sourceDocumentId: null,
>>>>>>> theirs
  documentType: "flight_ticket",
  tripType: "one-way",
  outboundSegments: outbound,
  returnSegments: [],
<<<<<<< ours
<<<<<<< ours
=======
  passengerName: "Patient",
>>>>>>> theirs
=======
  passengerName: "Patient",
>>>>>>> theirs
  bookingReference,
  saveToTransportTimeline: true,
  saveToMedicalRecords: false,
  sendToDoctor: false,
<<<<<<< ours
<<<<<<< ours
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
=======
=======
>>>>>>> theirs
  pendingSegmentRef: null,
  traveler: "patient",
  source: "manual",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
});

describe("findDuplicateTickets", () => {
  it("returns empty when there is no overlap", () => {
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
    const candidate = ticket("t1", [seg()]);
    const existing = ticket("t2", [
      seg({
        id: "seg-2",
        flightNumber: "EK999",
        fromAirport: { code: "DXB", city: "Dubai" },
        departureDate: "2026-07-15",
        pnr: "XYZ",
      }),
    ]);

    expect(findDuplicateTickets(candidate, [existing])).toEqual([]);
  });

  it("detects same flight number and departure date", () => {
    const existing = ticket("t-existing", [seg({ id: "old", pnr: "DIFF" })]);
    const candidate = ticket("t-new", [seg({ id: "new", pnr: "OTHER" })]);

    const matches = findDuplicateTickets(candidate, [existing]);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      ticketId: "t-existing",
      reason: "flight-number-and-date",
    });
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    expect(matches[0].label).toContain("SV123");
    expect(matches[0].labelAr).toBeTruthy();
  });

  it("detects matching booking reference (PNR)", () => {
    const existing = ticket(
      "t-existing",
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
      [
        seg({
          id: "old",
          flightNumber: "LH100",
          fromAirport: { code: "JED", city: "Jeddah" },
          toAirport: { code: "MUC", city: "Munich" },
          departureDate: "2026-09-01",
          pnr: "",
        }),
      ],
      "SHARED1",
    );
    const candidate = ticket(
      "t-new",
      [seg({ id: "new", flightNumber: "EK20", departureDate: "2026-12-12", pnr: "" })],
      "SHARED1",
    );

    const matches = findDuplicateTickets(candidate, [existing]);

    expect(matches.map((m) => m.reason)).toContain("shared-pnr");
    expect(matches[0].label).toBeTruthy();
    expect(matches[0].labelAr).toBeTruthy();
  });

  it("detects same route plus departure date and time when flight numbers differ", () => {
    const existing = ticket("t-existing", [seg({ id: "old", flightNumber: "SV999", pnr: "NONE" })]);
    const candidate = ticket("t-new", [seg({ id: "new", flightNumber: "QR55", pnr: "OTHER" })]);

    const matches = findDuplicateTickets(candidate, [existing]);

    expect(matches).toHaveLength(1);
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    expect(matches[0].reason).toBe("same-route-and-time");
  });

  it("ignores the candidate's own id when re-saving", () => {
<<<<<<< ours
<<<<<<< ours
    const t = ticket("self", [seg()]);
    expect(findDuplicateTickets(t, [t])).toEqual([]);
=======
    const saved = ticket("self", [seg()]);
    expect(findDuplicateTickets(saved, [saved])).toEqual([]);
>>>>>>> theirs
=======
    const saved = ticket("self", [seg()]);
    expect(findDuplicateTickets(saved, [saved])).toEqual([]);
>>>>>>> theirs
  });
});
