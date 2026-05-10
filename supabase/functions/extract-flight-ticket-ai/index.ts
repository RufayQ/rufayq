// AI-Vision-first flight ticket extractor using OpenAI Responses API
// (gpt-5 family). Returns the same shape as scan-itinerary so the
// ScannerWizard can use it as a drop-in primary engine and silently fall
// back to scan-itinerary (Gemini) if this fails.
//
// Request body: { file?: string, files?: string[], text?: string }
//   - file/files: image data URLs (data:image/...)
//   - text: optional extracted text passthrough
// Response: { ok: true, data: AiFlightTicketExtraction } | { error: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// JSON Schema describing the structured extraction. Mirrors scan-itinerary's
// tool schema so downstream parsing is identical.
const FLIGHT_LEG_SCHEMA = {
  type: "object",
  properties: {
    airline: { type: ["string", "null"] },
    flightNumber: { type: ["string", "null"] },
    bookingRef: { type: ["string", "null"] },
    fromAirport: { type: ["string", "null"], description: "3-letter IATA code only" },
    fromCity: { type: ["string", "null"] },
    fromTerminal: { type: ["string", "null"] },
    fromGate: { type: ["string", "null"] },
    toAirport: { type: ["string", "null"], description: "3-letter IATA code only" },
    toCity: { type: ["string", "null"] },
    toTerminal: { type: ["string", "null"] },
    toGate: { type: ["string", "null"] },
    departureDateTime: { type: ["string", "null"], description: "ISO 8601 YYYY-MM-DDTHH:mm local airport time" },
    arrivalDateTime: { type: ["string", "null"] },
    seatClass: { type: ["string", "null"], description: "Cabin: Economy / Business / First" },
    fareClass: { type: ["string", "null"], description: "Booking class letter (Y, J, F, etc.) when shown" },
    seatNumber: { type: ["string", "null"] },
    baggageAllowance: { type: ["string", "null"], description: "e.g. '23 kg', '2PC', 'Hand only'" },
  },
  required: [
    "airline", "flightNumber", "bookingRef",
    "fromAirport", "fromCity", "fromTerminal", "fromGate",
    "toAirport", "toCity", "toTerminal", "toGate",
    "departureDateTime", "arrivalDateTime",
    "seatClass", "fareClass", "seatNumber", "baggageAllowance",
  ],
  additionalProperties: false,
} as const;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tripType: { type: ["string", "null"], enum: ["one_way", "round_trip", "multi_city", null] },
    passengerFirstName: { type: ["string", "null"] },
    passengerLastName: { type: ["string", "null"] },
    passportNumber: { type: ["string", "null"] },
    dateOfBirth: { type: ["string", "null"], description: "ISO YYYY-MM-DD" },
    ticketNumbers: { type: "array", items: { type: "string" } },
    outboundSegments: { type: "array", items: FLIGHT_LEG_SCHEMA, description: "All outbound legs in chronological order, including transits." },
    returnSegments: { type: "array", items: FLIGHT_LEG_SCHEMA, description: "All return legs in chronological order, including transits." },
    detectedLanguage: { type: ["string", "null"] },
    translated: { type: ["boolean", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "tripType", "passengerFirstName", "passengerLastName", "passportNumber",
    "dateOfBirth", "ticketNumbers", "outboundSegments", "returnSegments",
    "detectedLanguage", "translated", "confidence",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a precise computer-vision extraction system for airline travel documents (boarding passes, e-tickets, multi-page itineraries from Saudia, flynas, Wingie, Emirates, Air Arabia, Lufthansa, etc.).

Rules — read carefully:
1. NEVER invent data. If a field is not visible, return null (or [] for arrays).
2. fromAirport / toAirport must be the 3-letter IATA code ONLY (e.g. "RUH"). Never put a city name there.
3. fromCity / toCity must be the plain city name (e.g. "Riyadh"). Never put an IATA code there.
4. departureDateTime / arrivalDateTime must be strict ISO 8601 (YYYY-MM-DDTHH:mm) in local airport time, 24h.
5. TRANSIT / CONNECTING flights: When the ticket shows multiple chained legs (e.g. DMM → SHJ → HBE), populate outboundSegments with EVERY leg in chronological order. Do NOT collapse legs.
6. If both an outbound and a return-to-origin direction exist, the return chain goes in returnSegments.
7. fromTerminal / toTerminal: terminal name as printed (e.g. "T2", "Terminal 1"); fromGate / toGate: gate code if visible.
8. seatClass = cabin (Economy/Business/First); fareClass = booking-class letter (Y, J, F …) when present.
9. baggageAllowance: e.g. "23 kg", "2PC", "Hand only" — exactly as shown, otherwise null.
10. confidence: 0.0–0.6 for blurry/partial scans, 0.85–1.0 only when every leg field is unambiguously legible.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const deviceId = req.headers.get("x-device-id") ?? "";
    if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
      return json({ error: "Missing or invalid x-device-id" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Trial / subscription gate (mirrors scan-itinerary).
    const { data: trial } = await admin
      .from("user_trials")
      .select("device_id, plan")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (!trial) return json({ error: "No active trial or subscription for this device" }, 403);

    const PLAN_LIMITS: Record<string, number> = {
      trial: 5, basic: 25, companion: 50, family: 100, premium: 200,
    };
    const dailyLimit = PLAN_LIMITS[(trial.plan || "trial").toLowerCase()] ?? 5;
    const { data: rpcRows, error: rpcErr } = await admin.rpc("consume_ai_credit", {
      _device_id: deviceId, _daily_limit: dailyLimit,
    });
    if (rpcErr) return json({ error: "Credit check failed" }, 500);
    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!row?.allowed) return json({ error: "Daily AI credit limit reached" }, 429);

    const body = await req.json().catch(() => ({}));
    const fileDataUrl: string | undefined = body?.file;
    const filesArr: string[] | undefined = Array.isArray(body?.files) ? body.files : undefined;
    const text: string | undefined = body?.text;

    const images: string[] = [];
    if (filesArr) images.push(...filesArr.filter(Boolean));
    if (fileDataUrl) images.push(fileDataUrl);

    if (images.length === 0 && !text) return json({ error: "file(s) or text required" }, 400);
    for (const u of images) {
      if (!/^data:image\//.test(u)) {
        return json({ error: "files must be image data URLs" }, 400);
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    const userContent: any[] = [
      { type: "input_text", text:
        "Extract the flight itinerary from this airline document. Capture every transit/connecting leg in outboundSegments / returnSegments in chronological order. Use IATA codes for airports and plain city names for cities. Return null for any unreadable field — never invent values." },
    ];
    for (const u of images) userContent.push({ type: "input_image", image_url: u });
    if (text) userContent.push({ type: "input_text", text: `Additional itinerary text:\n${text}` });

    const aiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "flight_ticket_extraction",
            schema: EXTRACTION_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("OpenAI error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit, please retry" }, 429);
      if (aiResp.status === 401) return json({ error: "OpenAI auth failed" }, 500);
      return json({ error: "AI extraction failed" }, 500);
    }
    const data = await aiResp.json();

    // Responses API: pull the structured JSON output.
    let parsed: any = null;
    try {
      const outputText: string | undefined =
        data?.output_text ??
        data?.output?.[0]?.content?.find?.((c: any) => c?.type === "output_text")?.text ??
        data?.output?.find?.((o: any) => o?.type === "message")?.content?.find?.((c: any) => c?.type === "output_text")?.text;
      if (outputText) parsed = JSON.parse(outputText);
    } catch (e) {
      console.error("Failed to parse OpenAI structured output", e, data);
      return json({
        error: "ai_malformed_json",
        message: "AI returned malformed JSON. Try a clearer image or use manual entry.",
        fallback: "manual",
      }, 422);
    }

    // Strict shape validation — fail loudly with actionable error so the
    // client can auto-fall back to manual entry.
    const validationErrors = validateExtraction(parsed);
    if (validationErrors.length > 0) {
      console.warn("Extraction validation failed", validationErrors, parsed);
      return json({
        error: "ai_invalid_shape",
        message: "AI extraction did not match the expected schema.",
        details: validationErrors,
        fallback: "manual",
      }, 422);
    }

    // No legs at all = useless extraction.
    if (
      (!Array.isArray(parsed.outboundSegments) || parsed.outboundSegments.length === 0) &&
      (!Array.isArray(parsed.returnSegments) || parsed.returnSegments.length === 0)
    ) {
      return json({
        error: "ai_no_legs",
        message: "No flight legs could be extracted from the document.",
        fallback: "manual",
      }, 422);
    }

    return json({ ok: true, data: parsed, provider: "openai" });
  } catch (e) {
    console.error("extract-flight-ticket-ai error:", e);
    return json({
      error: "internal_error",
      message: e instanceof Error ? e.message : "Unknown",
      fallback: "manual",
    }, 500);
  }
});

// Lightweight shape validator (mirrors EXTRACTION_SCHEMA required fields).
function validateExtraction(parsed: unknown): string[] {
  const errs: string[] = [];
  if (!parsed || typeof parsed !== "object") return ["root must be an object"];
  const p = parsed as Record<string, unknown>;
  for (const key of [
    "tripType", "outboundSegments", "returnSegments", "confidence",
  ]) {
    if (!(key in p)) errs.push(`missing field: ${key}`);
  }
  if ("outboundSegments" in p && !Array.isArray(p.outboundSegments)) errs.push("outboundSegments must be an array");
  if ("returnSegments" in p && !Array.isArray(p.returnSegments)) errs.push("returnSegments must be an array");
  const allLegs: any[] = [
    ...(Array.isArray(p.outboundSegments) ? p.outboundSegments as any[] : []),
    ...(Array.isArray(p.returnSegments) ? p.returnSegments as any[] : []),
  ];
  allLegs.forEach((leg, i) => {
    if (!leg || typeof leg !== "object") {
      errs.push(`leg ${i}: not an object`);
      return;
    }
    const code = (leg as any).fromAirport;
    const codeTo = (leg as any).toAirport;
    if (code !== null && code !== undefined && typeof code === "string" && code.length > 0 && !/^[A-Z]{3}$/.test(code)) {
      errs.push(`leg ${i}: fromAirport must be 3-letter IATA, got "${code}"`);
    }
    if (codeTo !== null && codeTo !== undefined && typeof codeTo === "string" && codeTo.length > 0 && !/^[A-Z]{3}$/.test(codeTo)) {
      errs.push(`leg ${i}: toAirport must be 3-letter IATA, got "${codeTo}"`);
    }
  });
  return errs;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
