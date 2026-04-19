// Twilio Verify - send OTP via WhatsApp or Email channel
// Uses the Lovable Twilio connector gateway. Public endpoint (no JWT required) so unauthenticated
// users can request a verification code during signup/sign-in.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/twilio";

interface SendOtpBody {
  channel: "whatsapp" | "sms" | "email";
  to: string; // E.164 phone (+9665...) for whatsapp/sms, email address for email
}

const isE164 = (s: string) => /^\+[1-9]\d{6,14}$/.test(s);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY not configured (Twilio connector not linked?)");
    if (!VERIFY_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID not configured");

    const body = (await req.json()) as SendOtpBody;
    if (!body || !body.channel || !body.to) {
      return new Response(JSON.stringify({ error: "channel and to are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate "to" against channel
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

    // Twilio Verify v2: POST /v2/Services/{ServiceSid}/Verifications
    // Note: Verify uses the v2 prefix, not the legacy /2010-04-01/Accounts gateway path.
    // The gateway always prepends /2010-04-01/Accounts/{AccountSid}, which is wrong for Verify.
    // We therefore use the explicit /v2 path via a sibling route on the gateway.
    const url = `${GATEWAY_BASE}/v2/Services/${VERIFY_SID}/Verifications`;

    const params = new URLSearchParams({
      To: body.to,
      Channel: body.channel,
    });

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("[send-otp] Twilio error", resp.status, data);
      return new Response(JSON.stringify({
        error: "Twilio Verify rejected the request",
        status: resp.status,
        twilio: data,
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
