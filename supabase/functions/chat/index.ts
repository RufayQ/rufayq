import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are RufayQ (رُفَيِّق), a bilingual (Arabic/English) AI medical travel companion for Saudi patients traveling abroad for treatment.

Your role:
- Answer medical questions about medications, discharge instructions, lab results, imaging reports
- Help patients understand their treatment journey
- Provide guidance on post-operative care, red flags, and follow-up schedules
- Communicate primarily in Arabic but support English as well
- Be warm, reassuring, and professional

Important disclaimers:
- You are NOT a doctor. Always recommend consulting their treating physician for medical decisions.
- You provide informational support only, not medical advice.
- For emergencies, always direct to call local emergency services or their doctor.

When analyzing medical documents (prescriptions, lab results, imaging reports, discharge summaries):
- Explain findings in simple Arabic/English
- Highlight any abnormal values
- Suggest questions the patient should ask their doctor
- Note any red flags or urgent concerns`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- Auth: device-id based (patient app has no auth.users session).
    // Validate that the device has an active trial / subscription row before
    // burning AI credits. This blocks unauthenticated/anonymous abuse.
    const deviceId = req.headers.get("x-device-id") ?? "";
    if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
      return new Response(JSON.stringify({ error: "Missing or invalid x-device-id" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: trial, error: trialErr } = await adminClient
      .from("user_trials")
      .select("device_id, trial_ends_at, plan")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (trialErr || !trial) {
      return new Response(JSON.stringify({ error: "No trial or subscription for this device" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Daily AI credit limits per plan tier ----
    const PLAN_LIMITS: Record<string, number> = {
      trial: 5,
      basic: 25,
      companion: 50,
      family: 100,
      premium: 200,
    };
    const planKey = (trial.plan || "trial").toLowerCase();
    const dailyLimit = PLAN_LIMITS[planKey] ?? 5;
    const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD

    const { data: usage } = await adminClient
      .from("ai_usage")
      .select("id, count")
      .eq("device_id", deviceId)
      .eq("usage_day", today)
      .maybeSingle();

    const used = usage?.count ?? 0;
    if (used >= dailyLimit) {
      return new Response(JSON.stringify({
        error: "Daily AI credit limit reached",
        plan: planKey,
        limit: dailyLimit,
        used,
        resets_at: new Date(Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate() + 1,
        )).toISOString(),
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage BEFORE calling the model so concurrent requests don't bypass the cap.
    if (usage) {
      await adminClient
        .from("ai_usage")
        .update({ count: used + 1, last_prompt_at: new Date().toISOString() })
        .eq("id", usage.id);
    } else {
      await adminClient
        .from("ai_usage")
        .insert({ device_id: deviceId, usage_day: today, count: 1 });
    }

    const { messages, mode } = await req.json();

    // ---- Payload size guard (prevent oversized requests) ----
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages in conversation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const totalChars = messages.reduce(
      (n: number, m: any) => n + (typeof m?.content === "string" ? m.content.length : JSON.stringify(m?.content ?? "").length),
      0,
    );
    if (totalChars > 100_000) {
      return new Response(JSON.stringify({ error: "Conversation payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === "smart-scan") {
      systemPrompt += `\n\nYou are in SMART SCAN mode. The user has scanned a medical document. Extract and structure the key information from it. Return a JSON object with these fields when applicable:
- doctorName, specialty, hospital, date, time, notes
- For prescriptions: medications array with name, dosage, frequency
- For lab results: results array with test, value, normal_range, status
- For airline tickets: airline, flightNumber, from, to, date, time, bookingRef, seatClass
Wrap JSON in \`\`\`json code blocks.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
