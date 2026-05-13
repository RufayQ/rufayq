// Itinerary OCR — extracts flight + traveler details from a photographed
// or PDF airline itinerary (e.g. Wingie, Saudia, flynas, Air Arabia).
// Uses Lovable AI Gateway (Gemini Flash multimodal).
//
// Auth: device-based (patient app has no auth.users session). Mirrors the
// pattern used by the chat function — validates that a trial/subscription
// row exists for the device id and consumes 1 AI credit per call.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FLIGHT_LEG = {
  type: "object",
  properties: {
    airline: { type: "string", description: "Airline name, e.g. 'Air Arabia', 'Saudia'." },
    flightNumber: { type: "string", description: "Flight number, e.g. 'G9164'." },
    bookingRef: { type: "string", description: "PNR / booking reference." },
    fromAirport: { type: "string", description: "IATA code of departure airport, e.g. 'DMM'." },
    fromCity: { type: "string", description: "Departure city + airport name." },
    toAirport: { type: "string", description: "IATA code of arrival airport, e.g. 'SHJ'." },
    toCity: { type: "string", description: "Arrival city + airport name." },
    departureDateTime: { type: "string", description: "Departure date/time in ISO 8601 (YYYY-MM-DDTHH:mm)." },
    arrivalDateTime: { type: "string", description: "Arrival date/time in ISO 8601." },
    seatClass: { type: "string", description: "Cabin class, e.g. 'Economy', 'Business'." },
    seatNumber: { type: "string" },
  },
  additionalProperties: false,
} as const;

const TOOL = {
  type: "function",
  function: {
    name: "extract_itinerary",
    description: "Return parsed airline itinerary fields, including connecting/transit segments.",
    parameters: {
      type: "object",
      properties: {
        tripType: { type: "string", enum: ["one_way", "round_trip", "multi_city"] },
        passengerFirstName: { type: "string" },
        passengerLastName: { type: "string" },
        passportNumber: { type: "string" },
        dateOfBirth: { type: "string", description: "ISO date YYYY-MM-DD if visible." },
        ticketNumbers: { type: "array", items: { type: "string" } },
        // Legacy single-leg fields (kept for back-compat with older clients).
        outboundFlight: FLIGHT_LEG,
        returnFlight: FLIGHT_LEG,
        // NEW: full chains for transit/connecting itineraries (DMM→SHJ→HBE).
        // Each array is ordered earliest → latest. If only one leg per
        // direction, the arrays still hold a single element.
        outboundSegments: { type: "array", items: FLIGHT_LEG, description: "Ordered outbound legs including any transit/connecting flights." },
        returnSegments: { type: "array", items: FLIGHT_LEG, description: "Ordered return legs including any transit/connecting flights." },
        detectedLanguage: { type: "string", description: "Primary language detected in the document." },
        translated: { type: "boolean" },
        confidence: { type: "number" },
      },
      required: ["confidence"],
      additionalProperties: false,
    },
  },
} as const;

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

    const { data: trial } = await admin
      .from("user_trials")
      .select("device_id, trial_ends_at, plan")
      .eq("device_id", deviceId)
      .gt("trial_ends_at", new Date().toISOString())
      .maybeSingle();
    if (!trial) return json({ error: "Trial or subscription has expired" }, 403);

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

    if (images.length === 0 && !text) return json({ error: "file(s) (data URL) or text required" }, 400);
    for (const u of images) {
      if (!/^data:image\//.test(u)) {
        return json({ error: "files must be image data URLs (convert PDF pages to images client-side)" }, 400);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const userContent: any[] = [
      { type: "text", text:
        "Extract the flight itinerary from this airline ticket / boarding pass / e-ticket. " +
        "Detect tripType (one_way | round_trip | multi_city). For each leg capture:\n" +
        "- airline (full carrier name e.g. 'Saudia', not the IATA code)\n" +
        "- flightNumber (e.g. 'SV301', 'G9 164')\n" +
        "- bookingRef (PNR, 5-7 chars)\n" +
        "- fromAirport: the 3-letter IATA code ONLY (e.g. 'RUH'). Never put a city name here.\n" +
        "- fromCity: the city name ONLY (e.g. 'Riyadh'). Never put an airport name or IATA code here.\n" +
        "- toAirport / toCity: same rules.\n" +
        "- departureDateTime / arrivalDateTime in strict ISO 8601 (YYYY-MM-DDTHH:mm), local airport time.\n" +
        "- seatClass + seatNumber when shown.\n" +
        "IMPORTANT — TRANSIT/CONNECTING FLIGHTS: When the itinerary shows multiple flights chained via a layover (e.g. DMM → SHJ → HBE), populate `outboundSegments` (and `returnSegments` for the return direction) with EVERY leg in chronological order. Each transit leg is a full FLIGHT_LEG entry. Do NOT collapse multiple legs into one. Use `outboundFlight`/`returnFlight` only as a back-compat copy of the FIRST outbound/return leg.\n" +
        "Also capture passengerFirstName, passengerLastName, passportNumber, dateOfBirth.\n" +
        "If a value is missing or unreadable, OMIT the field entirely — never invent or guess. " +
        "If the document shows two flights with the same passenger and the second one returns to the first origin, treat the second as returnFlight / first returnSegments entry.",
      },
    ];
    for (const u of images) userContent.push({ type: "image_url", image_url: { url: u } });
    if (text) userContent.push({ type: "text", text: `Itinerary text:\n${text}` });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Pro-tier vision: significantly stronger at small print, multi-language
        // tickets, and segmented layouts (Wingie, Saudia, flynas, Air Arabia,
        // Emirates, lufthansa, etc.) than gemini-2.5-flash.
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content:
            "You are a precise computer-vision OCR + extraction system for airline travel documents. " +
            "READ every legible glyph in the image(s) — boarding passes, e-tickets, itineraries, screenshots from Saudia/flynas/Wingie/Emirates/Air Arabia/Lufthansa, multi-page PDFs. " +
            "Be conservative: NEVER invent a value. If a field isn't visible, omit it. " +
            "Return cleaned, normalized values: full airline names (not codes), 3-letter IATA codes for fromAirport/toAirport, plain city names for fromCity/toCity, ISO 8601 (YYYY-MM-DDTHH:mm) local-airport time for departureDateTime/arrivalDateTime. " +
            "Lower confidence (0.0-0.6) for blurry / partial scans; raise (0.85-1.0) only when every leg field is unambiguously legible.",
          },
          { role: "user", content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_itinerary" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit, please retry" }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: "OCR failed" }, 500);
    }
    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: Record<string, unknown> = {};
    try { parsed = args ? JSON.parse(args) : {}; } catch { parsed = {}; }
    return json({ ok: true, data: parsed });
  } catch (e) {
    console.error("scan-itinerary error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
