import { describe, it, expect } from "vitest";
import { parseFlightJourney, journeyLegKey, type ParseFlightJourneyInput } from "@/lib/flightJourney";
import type { FlightInfo } from "@/components/AddTripSheet";

const leg = (over: Partial<FlightInfo> = {}): FlightInfo => ({
  airline: "Saudia",
  flightNumber: "SV123",
  bookingRef: "ABC123",
  fromAirport: "JED",
  fromCity: "Jeddah",
  fromAirportFull: "King Abdulaziz Intl",
  toAirport: "LHR",
  toCity: "London",
  toAirportFull: "Heathrow",
  departureDateTime: "2026-01-10T08:00",
  arrivalDateTime: "2026-01-10T13:00",
  seatClass: "Economy",
  seatNumber: "12A",
  ...over,
});

describe("parseFlightJourney", () => {
  it("returns empty journey for null/empty input", () => {
    const j = parseFlightJourney(null, "ocr");
    expect(j.legs).toEqual([]);
    expect(j.tripType).toBe("one-way");
    expect(j.dropped).toEqual([]);
    expect(j.source).toBe("ocr");
  });

  it("normalizes a single outbound into one-way", () => {
    const j = parseFlightJourney({ outbound: leg() }, "ocr");
    expect(j.tripType).toBe("one-way");
    expect(j.legs).toHaveLength(1);
    expect(j.legs[0].from.code).toBe("JED");
    expect(j.legs[0].to.code).toBe("LHR");
    expect(j.legs[0].flightNumber).toBe("SV123");
  });

  it("detects round-trip when outbound + return mirror routes", () => {
    const out = leg();
    const ret = leg({
      flightNumber: "SV124",
      fromAirport: "LHR", fromCity: "London", fromAirportFull: "Heathrow",
      toAirport: "JED", toCity: "Jeddah", toAirportFull: "King Abdulaziz Intl",
      departureDateTime: "2026-01-20T10:00",
    });
    const j = parseFlightJourney({ outbound: out, return: ret }, "ocr");
    expect(j.tripType).toBe("round-trip");
    expect(j.legs).toHaveLength(2);
    expect(j.legs[0].departureDateTime < j.legs[1].departureDateTime).toBe(true);
  });

  it("treats non-mirrored 2-leg trips as multi-city", () => {
    const a = leg({ toAirport: "DXB", toCity: "Dubai" });
    const b = leg({
      flightNumber: "EK500",
      fromAirport: "DXB", fromCity: "Dubai",
      toAirport: "BKK", toCity: "Bangkok",
      departureDateTime: "2026-01-12T09:00",
    });
    const j = parseFlightJourney({ legs: [a, b] }, "manual");
    expect(j.tripType).toBe("multi-city");
    expect(j.legs).toHaveLength(2);
  });

  it("sorts legs chronologically regardless of input order", () => {
    const earlier = leg({ flightNumber: "SV1", departureDateTime: "2026-02-01T08:00" });
    const later = leg({ flightNumber: "SV2", departureDateTime: "2026-02-05T08:00" });
    const j = parseFlightJourney({ legs: [later, earlier] }, "manual");
    expect(j.legs.map(l => l.flightNumber)).toEqual(["SV1", "SV2"]);
  });

  it("drops legs missing route info into `dropped`", () => {
    const bad = leg({ fromAirport: "", toAirport: "" });
    const j = parseFlightJourney({ outbound: bad, return: leg() }, "ocr");
    expect(j.legs).toHaveLength(1);
    expect(j.dropped).toHaveLength(1);
    expect(j.dropped[0].reason).toBe("missing-route");
  });

  it("dedupes legs by (flightNumber, departureDateTime)", () => {
    const dup = leg();
    const j = parseFlightJourney({ outbound: dup, legs: [dup, dup] }, "ocr");
    expect(j.legs).toHaveLength(1);
  });

  it("accepts raw OCR-shaped legs and normalizes via flightParsing", () => {
    const raw = {
      airline: "qatar",
      flightNumber: "qr 1163",
      fromAirport: "jed",
      fromCity: "Jeddah",
      toAirport: "doh",
      toCity: "Doha",
      departureDateTime: "2026-03-01T10:00",
    };
    const j = parseFlightJourney({ legs: [raw] } as ParseFlightJourneyInput, "ocr");
    expect(j.legs).toHaveLength(1);
    expect(j.legs[0].flightNumber).toBe("QR1163");
    expect(j.legs[0].from.code).toBe("JED");
    expect(j.legs[0].to.code).toBe("DOH");
  });

  it("handles a 3-leg multi-city itinerary", () => {
    const l1 = leg({ flightNumber: "SV1", toAirport: "CAI", toCity: "Cairo", departureDateTime: "2026-04-01T08:00" });
    const l2 = leg({
      flightNumber: "MS2", fromAirport: "CAI", fromCity: "Cairo",
      toAirport: "IST", toCity: "Istanbul", departureDateTime: "2026-04-05T09:00",
    });
    const l3 = leg({
      flightNumber: "TK3", fromAirport: "IST", fromCity: "Istanbul",
      toAirport: "JED", toCity: "Jeddah", departureDateTime: "2026-04-10T11:00",
    });
    const j = parseFlightJourney({ legs: [l3, l1, l2] }, "ocr");
    expect(j.tripType).toBe("multi-city");
    expect(j.legs.map(l => l.flightNumber)).toEqual(["SV1", "MS2", "TK3"]);
  });

  it("preserves passenger and sourceDocId", () => {
    const j = parseFlightJourney(
      { outbound: leg(), passenger: { name: "Ahmed", passport: "X1" }, sourceDocId: "doc-42" },
      "ocr",
    );
    expect(j.passenger?.name).toBe("Ahmed");
    expect(j.sourceDocId).toBe("doc-42");
  });

  it("tags source correctly for manual entry", () => {
    const j = parseFlightJourney({ outbound: leg() }, "manual");
    expect(j.source).toBe("manual");
  });
});

describe("journeyLegKey", () => {
  it("produces stable key for dedup", () => {
    const a = parseFlightJourney({ outbound: leg() }, "ocr").legs[0];
    const b = parseFlightJourney({ outbound: leg() }, "manual").legs[0];
    expect(journeyLegKey(a)).toBe(journeyLegKey(b));
  });
});
