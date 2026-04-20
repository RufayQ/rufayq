// Twilio Verify - send OTP via WhatsApp / SMS / Email channel
// Public endpoint. Enforces 1 OTP per recipient per 24h via otp_send_log table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendOtpBody {
  channel: "whatsapp" | "sms" | "email";
  to: string;
}

const isE164 = (s: string) => /^\+[1-9]\d{6,14}$/.test(s);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Single source of truth: recipient key used for rate-limit + manual OTP lookup
const normalizeRecipient = (channel: string, raw: string) => {
  const s = (raw || "").trim();
  if (channel === "email") return s.toLowerCase();
  // phone — strip spaces, force leading +
  return s.replace(/\s+/g, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ACCOUNT_SID || !AUTH_TOKEN || !VERIFY_SID) {
      throw new Error("Twilio Verify is not fully configured");
    }

    const body = (await req.json()) as SendOtpBody;
    if (!body?.channel || !body?.to) {
      return new Response(JSON.stringify({ error: "channel and to are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.channel === "email") {
      if (!isEmail(body.to)) {
        return new Response(JSON.stringify({ error: "Invalid email address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isE164(body.to)) {
      return new Response(JSON.stringify({ error: "Phone must be E.164 format (+9665XXXXXXXX)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const recipient = normalizeRecipient(body.channel, body.to);

    // Rate limit: 1 successful send per 24h per recipient
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { data: recent, error: logErr } = await admin
      .from("otp_send_log")
      .select("sent_at")
      .eq("recipient", recipient)
      .gte("sent_at", since)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (logErr) console.error("[send-otp] log query error", logErr);

    if (recent && recent.length > 0) {
      const lastSent = new Date(recent[0].sent_at).getTime();
      const retryAfterMs = RATE_WINDOW_MS - (Date.now() - lastSent);
      const retryAfterHours = Math.ceil(retryAfterMs / (60 * 60 * 1000));
      return new Response(JSON.stringify({
        error: `You've already requested a code today. Try again in about ${retryAfterHours} hour${retryAfterHours === 1 ? "" : "s"}.`,
        rateLimited: true,
        retryAfterMs,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Twilio Verify v2 — direct call
    const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`;
    const params = new URLSearchParams({ To: body.to, Channel: body.channel });
    const basic = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error("[send-otp] Twilio error", resp.status, JSON.stringify(data));
      return new Response(JSON.stringify({
        error: data?.message || "Twilio Verify rejected the request",
        code: data?.code, status: resp.status,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log the successful send for rate limiting
    await admin.from("otp_send_log").insert({ recipient, channel: body.channel });

    return new Response(JSON.stringify({
      success: true, sid: data.sid, status: data.status, channel: body.channel,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-otp] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
