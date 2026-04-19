// Twilio Verify - check OTP code (direct API, Basic Auth)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyOtpBody {
  to: string;   // same phone/email used in send-otp
  code: string; // 4-10 digit code
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID not configured");
    if (!AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN not configured");
    if (!VERIFY_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID not configured");

    const body = (await req.json()) as VerifyOtpBody;
    if (!body || !body.to || !body.code) {
      return new Response(JSON.stringify({ error: "to and code are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{4,10}$/.test(body.code)) {
      return new Response(JSON.stringify({ error: "Code must be 4-10 digits" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`;
    const params = new URLSearchParams({ To: body.to, Code: body.code });
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
      console.error("[verify-otp] Twilio error", resp.status, JSON.stringify(data));
      // Twilio returns 404 when the verification expired or was already approved/denied.
      return new Response(JSON.stringify({
        approved: false,
        error: data?.message || "Verification not found or expired",
        code: data?.code,
        status: resp.status,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      approved: data.status === "approved",
      status: data.status,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-otp] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
