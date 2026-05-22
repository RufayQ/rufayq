/**
 * Lifestyle Buddy — bilingual one-line motivational nudge for a Lifestyle
 * plan card, generated via Lovable AI Gateway. Cheap, fast, no PII.
 *
 * Auth: x-device-id required + active user_trials row + consume_ai_credit.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface BuddyRequest {
  type: string;
  title: string;
  weeklyTarget: number;
  sessionsDone: number;
  streak: number;
}

const SYSTEM = `You are an upbeat bilingual recovery coach for a Saudi medical-tourism patient.
Write ONE short motivational line (max 90 chars) in English and Arabic for the given lifestyle plan.
Tone: warm, specific, no medical advice. Return strict JSON: {"en":"...","ar":"..."}`;

const PLAN_LIMITS: Record<string, number> = {
  trial: 5,
  basic: 25,
  companion: 50,
  family: 100,
  premium: 200,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ---- Device-ID gated access (mirrors chat/scan-itinerary pattern) ----
    const deviceId = req.headers.get("x-device-id") ?? "";
    if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
      return new Response(JSON.stringify({ error: "Missing or invalid x-device-id" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trial, error: trialErr } = await admin
      .from("user_trials")
      .select("device_id, trial_ends_at, plan")
      .eq("device_id", deviceId)
      .gt("trial_ends_at", new Date().toISOString())
      .maybeSingle();
    if (trialErr || !trial) {
      return new Response(JSON.stringify({ error: "Trial or subscription has expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planKey = (trial.plan || "trial").toLowerCase();
    const dailyLimit = PLAN_LIMITS[planKey] ?? 5;

    const { data: rpcRows, error: rpcErr } = await admin.rpc("consume_ai_credit", {
      _device_id: deviceId,
      _daily_limit: dailyLimit,
    });
    if (rpcErr) {
      console.error("consume_ai_credit error:", rpcErr);
      return new Response(JSON.stringify({ error: "Credit check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (!row?.allowed) {
      return new Response(JSON.stringify({
        error: "Daily AI credit limit reached",
        plan: planKey,
        limit: dailyLimit,
        used: row?.new_count ?? dailyLimit,
        resets_at: row?.resets_at ?? null,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BuddyRequest;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pct = body.weeklyTarget ? Math.round((body.sessionsDone / body.weeklyTarget) * 100) : 0;
    const userPrompt = `Plan type: ${body.type}
Title: ${body.title}
Progress: ${body.sessionsDone}/${body.weeklyTarget} sessions this week (${pct}%)
Streak: ${body.streak} days`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_error", status: aiRes.status, detail: text }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { en?: string; ar?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { en: String(content).slice(0, 120), ar: "" };
    }

    return new Response(JSON.stringify({ en: parsed.en ?? "", ar: parsed.ar ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
