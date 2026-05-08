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
    description: "Return parsed airline itinerary fields.",
    parameters: {
      type: "object",
      properties: {
        tripType: { type: "string", enum: ["one_way", "round_trip", "multi_city"] },
        passengerFirstName: { type: "string" },
        passengerLastName: { type: "string" },
        passportNumber: { type: "string" },
        dateOfBirth: { type: "string", description: "ISO date YYYY-MM-DD if visible." },
        ticketNumbers: { type: "array", items: { type: "string" } },
        outboundFlight: FLIGHT_LEG,
        returnFlight: FLIGHT_LEG,
        confidence: { type: "number", description: "0..1 overall extraction confidence." },
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
        "Extract the flight itinerary. Detect whether it is one_way, round_trip or multi_city. " +
        "Capture passenger first/last name and passport/ID if shown. " +
        "For each flight (outbound + return when present) capture airline, flight number, PNR, " +
        "from/to IATA + city + airport, departure & arrival date/time in ISO 8601, cabin class and seat. " +
        "If a value is missing, omit it — never invent data.",
      },
    ];
    if (fileDataUrl) userContent.push({ type: "image_url", image_url: { url: fileDataUrl } });
    if (text) userContent.push({ type: "text", text: `Itinerary text:\n${text}` });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured airline itinerary fields from photographed or PDF travel documents (Wingie, Saudia, flynas, Air Arabia, Emirates, etc.). Be conservative; lower confidence when blurry." },
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
