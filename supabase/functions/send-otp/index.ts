// Twilio Verify - send OTP via WhatsApp / SMS / Email channel
// Calls Twilio Verify v2 directly (gateway doesn't support /v2 paths).
// Public endpoint (no JWT) so unauthenticated users can request a code during signup/sign-in.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendOtpBody {
  channel: "whatsapp" | "sms" | "email";
  to: string; // E.164 phone (+9665...) for whatsapp/sms, email address for email
}

const isE164 = (s: string) => /^\+[1-9]\d{6,14}$/.test(s);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID not configured");
    if (!AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN not configured");
    if (!VERIFY_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID not configured");

    const body = (await req.json()) as SendOtpBody;
    if (!body || !body.channel || !body.to) {
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
    } else {
      if (!isE164(body.to)) {
        return new Response(JSON.stringify({ error: "Phone must be E.164 format (+9665XXXXXXXX)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Twilio Verify v2 — direct call, Basic Auth with Account SID + Auth Token
    const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/Verifications`;
    const params = new URLSearchParams({ To: body.to, Channel: body.channel });
    const basic = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[send-otp] Twilio error", resp.status, JSON.stringify(data));
      return new Response(JSON.stringify({
        error: data?.message || "Twilio Verify rejected the request",
        code: data?.code,
        status: resp.status,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      sid: data.sid,
      status: data.status,
      channel: body.channel,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-otp] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
