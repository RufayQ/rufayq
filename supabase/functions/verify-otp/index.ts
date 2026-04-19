// Twilio Verify - check OTP code
// Public endpoint. Returns { approved: boolean }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/twilio";

interface VerifyOtpBody {
  to: string;   // same phone/email used in send-otp
  code: string; // 4-10 digit code
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY not configured (Twilio connector not linked?)");
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

    const url = `${GATEWAY_BASE}/v2/Services/${VERIFY_SID}/VerificationCheck`;
    const params = new URLSearchParams({ To: body.to, Code: body.code });

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
      console.error("[verify-otp] Twilio error", resp.status, data);
      // Twilio returns 404 when the verification expired or was already approved/denied.
      return new Response(JSON.stringify({
        approved: false,
        error: data?.message || "Verification not found or expired",
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
