// Receipt OCR for payout / refund evidence.
// Uses Lovable AI Gateway (Gemini Flash vision) to extract:
//   - reference_no  (bank/transfer reference)
//   - amount        (numeric)
//   - currency      (3-letter code if present)
//   - date          (ISO if recognizable)
//   - reason        (short suggested dispute reason)
// Admin-only endpoint: requires a valid Supabase JWT belonging to a user
// with the 'admin' role. The image is sent as a data URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "extract_receipt",
    description: "Return parsed bank/payment receipt fields.",
    parameters: {
      type: "object",
      properties: {
        reference_no: { type: "string", description: "Transaction or transfer reference number." },
        amount: { type: "number", description: "Numeric amount on the receipt." },
        currency: { type: "string", description: "ISO currency code if present (SAR, USD, EUR...)." },
        date: { type: "string", description: "Receipt date in YYYY-MM-DD if visible." },
        bank_name: { type: "string" },
        reason: { type: "string", description: "Concise dispute/refund reason inferred from the receipt context (1 sentence)." },
        confidence: { type: "number", description: "0..1 confidence the data is reliable." },
      },
      required: ["confidence"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "Missing token" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userRes.user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const imageDataUrl: string | undefined = body?.image;
    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return json({ error: "image (data URL) required" }, 400);
    }
    if (imageDataUrl.length > 10_000_000) {
      return json({ error: "Image payload too large (max 10 MB)" }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract structured fields from photographed bank receipts, transfer slips, or refund vouchers. " +
              "Return numeric amount without separators. If a field is missing, omit it. " +
              "Be conservative with confidence; lower it when the image is blurry or unreadable.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the receipt fields and a short refund reason." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_receipt" } },
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
    console.error("scan-receipt error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
