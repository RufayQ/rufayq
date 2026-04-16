import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { messages, mode } = await req.json();
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
