import { describe, it, expect } from "vitest";
import { normalizeParsedLeg, validateFlight, resolveAirport } from "@/lib/flightParsing";
import type { FlightInfo } from "@/components/AddTripSheet";

const baseLeg = (over: Partial<FlightInfo> = {}): FlightInfo => ({
  airline: "Saudia",
  flightNumber: "SV 301",
  bookingRef: "AB1234",
  fromAirport: "RUH",
  fromCity: "Riyadh",
  fromAirportFull: "King Khalid International",
  toAirport: "BER",
  toCity: "Berlin",
  toAirportFull: "Berlin Brandenburg",
  departureDateTime: "2026-04-05T08:30",
  arrivalDateTime: "2026-04-05T14:00",
  seatClass: "Business",
  seatNumber: "24A",
  ...over,
});

describe("normalizeParsedLeg", () => {
  it("resolves clean IATA codes to canonical city + airport", () => {
    const leg = normalizeParsedLeg({
      airline: "saudia",
      flightNumber: "sv 301",
      bookingRef: "ab1234",
      fromAirport: "RUH",
      toAirport: "JED",
      departureDateTime: "2026-04-05T08:30:00Z",
    });
    expect(leg.fromCity).toBe("Riyadh");
    expect(leg.fromAirportFull).toBe("King Khalid International");
    expect(leg.toCity).toBe("Jeddah");
    expect(leg.flightNumber).toBe("SV 301");
    expect(leg.bookingRef).toBe("AB1234");
    expect(leg.seatClass).toBe("Economy");
    expect(leg.departureDateTime).toBe("2026-04-05T08:30");
  });

  it("recovers IATA code shoved into city/full field (swap detection)", () => {
    const leg = normalizeParsedLeg({
      fromAirport: "Riyadh",
      fromCity: "RUH — King Khalid Intl",
      toAirport: "Berlin",
      toCity: "BER Brandenburg",
    });
    expect(leg.fromAirport).toBe("RUH");
    expect(leg.fromCity).toBe("Riyadh");
    expect(leg.toAirport).toBe("BER");
    // BER not in our IATA table — but we still extract the code
    expect(leg.toAirport).toMatch(/^[A-Z]{3}$/);
  });

  it("preserves unknown codes verbatim without enrichment", () => {
    const leg = normalizeParsedLeg({
      fromAirport: "ZZZ",
      fromCity: "Atlantis",
      fromAirportFull: "Lost City",
      toAirport: "RUH",
    });
    expect(leg.fromAirport).toBe("ZZZ");
    expect(leg.fromCity).toBe("Atlantis");
    expect(leg.toAirport).toBe("RUH");
    expect(leg.toCity).toBe("Riyadh");
  });

  it("handles missing fields without throwing", () => {
    const leg = normalizeParsedLeg({});
    expect(leg.airline).toBe("");
    expect(leg.fromAirport).toBe("");
    expect(leg.seatClass).toBe("Economy");
  });
});

describe("resolveAirport", () => {
  it("returns canonical mapping for known IATA", () => {
    const r = resolveAirport("DXB");
    expect(r).toEqual({ code: "DXB", city: "Dubai", airport: "Dubai International" });
  });
  it("returns raw values when nothing resolvable", () => {
    const r = resolveAirport("", "Nowhere", "Some Airport");
    expect(r.code).toBe("");
    expect(r.city).toBe("Nowhere");
    expect(r.airport).toBe("Some Airport");
  });
});

describe("validateFlight", () => {
  it("passes a complete consistent leg", () => {
    const issues = validateFlight(baseLeg(), "Outbound");
    expect(issues.filter(i => i.level === "error")).toHaveLength(0);
  });

  it("flags missing flight number / airports / departure", () => {
    const issues = validateFlight(
      baseLeg({ flightNumber: "", fromAirport: "", fromCity: "", toAirport: "", toCity: "", departureDateTime: "" }),
      "Outbound",
    );
    const errs = issues.filter(i => i.level === "error").map(i => i.field);
    expect(errs).toContain("flightNumber");
    expect(errs).toContain("fromAirport");
    expect(errs).toContain("toAirport");
    expect(errs).toContain("departure");
  });

  it("blocks identical from/to airports", () => {
    const issues = validateFlight(baseLeg({ toAirport: "RUH", toCity: "Riyadh" }), "Outbound");
    expect(issues.some(i => i.field === "route" && i.level === "error")).toBe(true);
  });

  it("blocks arrival before/equal to departure", () => {
    const issues = validateFlight(
      baseLeg({ departureDateTime: "2026-04-05T14:00", arrivalDateTime: "2026-04-05T08:30" }),
      "Outbound",
    );
    expect(issues.some(i => i.field === "arrival" && i.level === "error")).toBe(true);
  });

  it("warns (not errors) on missing PNR", () => {
    const issues = validateFlight(baseLeg({ bookingRef: "" }), "Outbound");
    const pnr = issues.find(i => i.field === "bookingRef");
    expect(pnr?.level).toBe("warning");
  });
});
