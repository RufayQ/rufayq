/**
 * Lifestyle Buddy — bilingual one-line motivational nudge for a Lifestyle
 * plan card, generated via Lovable AI Gateway. Cheap, fast, no PII.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
      // Fallback: model returned non-JSON; salvage what we can.
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
