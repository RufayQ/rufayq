// Integration tests for extract-flight-ticket-ai.
//
// Covers:
//  - validateExtraction (malformed JSON, invalid shape, no legs, IATA mismatch)
//  - Live HTTP: unauthorized device → 401
//
// Run: supabase test edge functions extract-flight-ticket-ai
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateExtraction } from "./index.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
const FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/extract-flight-ticket-ai` : null;

const validLeg = {
  airline: "SV", flightNumber: "SV123", bookingRef: "ABC123",
  fromAirport: "RUH", fromCity: "Riyadh", fromTerminal: "T1", fromGate: "A12",
  toAirport: "JED", toCity: "Jeddah", toTerminal: "T2", toGate: "B5",
  departureDateTime: "2026-06-01T08:00", arrivalDateTime: "2026-06-01T10:00",
  seatClass: "Economy", fareClass: "Y", seatNumber: "12A", baggageAllowance: "23 kg",
};

const validPayload = {
  tripType: "one_way",
  passengerFirstName: "Test", passengerLastName: "User",
  passportNumber: null, dateOfBirth: null,
  ticketNumbers: [],
  outboundSegments: [validLeg],
  returnSegments: [],
  detectedLanguage: "en", translated: false,
  confidence: 0.9,
};

Deno.test("validateExtraction: passes for a fully valid payload", () => {
  assertEquals(validateExtraction(validPayload), []);
});

Deno.test("validateExtraction: rejects null / non-object (malformed JSON path)", () => {
  assertEquals(validateExtraction(null), ["root must be an object"]);
  assertEquals(validateExtraction("not json"), ["root must be an object"]);
  assertEquals(validateExtraction(42), ["root must be an object"]);
});

Deno.test("validateExtraction: flags missing required fields (invalid shape)", () => {
  const errs = validateExtraction({ confidence: 0.5 });
  assertStringIncludes(errs.join("|"), "missing field: tripType");
  assertStringIncludes(errs.join("|"), "missing field: outboundSegments");
  assertStringIncludes(errs.join("|"), "missing field: returnSegments");
});

Deno.test("validateExtraction: flags non-array segment lists", () => {
  const errs = validateExtraction({
    tripType: "one_way", outboundSegments: "nope", returnSegments: {}, confidence: 0.5,
  });
  assertStringIncludes(errs.join("|"), "outboundSegments must be an array");
  assertStringIncludes(errs.join("|"), "returnSegments must be an array");
});

Deno.test("validateExtraction: flags bad IATA codes inside legs", () => {
  const bad = {
    ...validPayload,
    outboundSegments: [{ ...validLeg, fromAirport: "Riyadh", toAirport: "JEDDAH" }],
  };
  const errs = validateExtraction(bad);
  assertStringIncludes(errs.join("|"), "fromAirport must be 3-letter IATA");
  assertStringIncludes(errs.join("|"), "toAirport must be 3-letter IATA");
});

Deno.test("validateExtraction: empty IATA strings are tolerated (treated as null)", () => {
  const ok = {
    ...validPayload,
    outboundSegments: [{ ...validLeg, fromAirport: "", toAirport: "" }],
  };
  // Empty strings are skipped by the validator (length 0). Caller treats as null.
  assertEquals(validateExtraction(ok), []);
});

Deno.test("validateExtraction: leg-not-object is reported", () => {
  const bad = { ...validPayload, outboundSegments: ["not-an-object"] };
  const errs = validateExtraction(bad);
  assertStringIncludes(errs.join("|"), "leg 0: not an object");
});

// ─────────────────── Live HTTP integration ───────────────────

Deno.test({
  name: "HTTP: missing x-device-id → 401 unauthorized",
  ignore: !FN_URL || !ANON_KEY,
  async fn() {
    const r = await fetch(FN_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ text: "x" }),
    });
    const body = await r.json();
    assertEquals(r.status, 401, JSON.stringify(body));
    assertStringIncludes(String(body.error ?? ""), "x-device-id");
  },
});

Deno.test({
  name: "HTTP: too-short x-device-id → 401 unauthorized",
  ignore: !FN_URL || !ANON_KEY,
  async fn() {
    const r = await fetch(FN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY!,
        Authorization: `Bearer ${ANON_KEY}`,
        "x-device-id": "abc",
      },
      body: JSON.stringify({ text: "x" }),
    });
    const body = await r.json();
    assertEquals(r.status, 401);
    assert(typeof body.error === "string");
  },
});

Deno.test({
  name: "HTTP: CORS preflight responds 200 with allow headers",
  ignore: !FN_URL,
  async fn() {
    const r = await fetch(FN_URL!, { method: "OPTIONS" });
    await r.text();
    assertEquals(r.status, 200);
    assert(r.headers.get("access-control-allow-origin"));
  },
});
