// Verify OTP: tries manual admin-issued code first (free, no Twilio cost),
// then falls back to Twilio Verify check. On success, ensures a Supabase
// Auth user exists and returns one-time credentials for the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyOtpBody {
  to: string;
  code: string;
  channel?: "whatsapp" | "sms" | "email";
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const normalizeRecipient = (raw: string) => {
  const s = (raw || "").trim();
  if (isEmail(s)) return s.toLowerCase();
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

    const body = (await req.json()) as VerifyOtpBody;
    if (!body?.to || !body?.code) {
      return new Response(JSON.stringify({ error: "to and code are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d{4,10}$/.test(body.code)) {
      return new Response(JSON.stringify({ error: "Code must be 4-10 digits" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const recipientKey = normalizeRecipient(body.to);

    // 1. Try manual admin-issued OTP first (free path)
    const { data: manualMatch } = await admin.rpc("consume_manual_otp", {
      _recipient: recipientKey,
      _code: body.code,
    });
    let approved = manualMatch === true;

    // 2. Fall back to Twilio Verify
    if (!approved) {
      if (!ACCOUNT_SID || !AUTH_TOKEN || !VERIFY_SID) {
        return new Response(JSON.stringify({ approved: false, error: "Verification service not configured" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `https://verify.twilio.com/v2/Services/${VERIFY_SID}/VerificationCheck`;
      const params = new URLSearchParams({ To: body.to, Code: body.code });
      const basic = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error("[verify-otp] Twilio error", resp.status, JSON.stringify(data));
        return new Response(JSON.stringify({
          approved: false,
          error: data?.message || "Verification not found or expired",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (data.status !== "approved") {
        return new Response(JSON.stringify({ approved: false, status: data.status, error: "Code did not match" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      approved = true;
    }

    // 3. Approved → create or fetch Supabase Auth user
    const usingEmail = isEmail(body.to);
    const identity = body.to.trim();

    let userId: string | null = null;
    const createPayload: Record<string, unknown> = usingEmail
      ? { email: identity, email_confirm: true }
      : { phone: identity, phone_confirm: true };

    const { data: created, error: createErr } = await admin.auth.admin.createUser(createPayload);
    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users.find((u) =>
        usingEmail ? u.email?.toLowerCase() === identity.toLowerCase() : u.phone === identity.replace(/^\+/, "")
      );
      if (match) userId = match.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ approved: false, error: "Could not create or find user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Check user_status — deny if suspended
    const { data: status } = await admin.from("user_status").select("status, reason").eq("user_id", userId).maybeSingle();
    if (status && status.status === "suspended") {
      return new Response(JSON.stringify({
        approved: false, suspended: true,
        error: status.reason || "This account has been suspended. Contact support.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Issue one-time temp password for client to sign in
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const updatePayload: Record<string, unknown> = { password: tempPassword };
    if (!usingEmail) {
      updatePayload.email = `${identity.replace(/[^\d]/g, "")}@phone.rufayq.local`;
      updatePayload.email_confirm = true;
    }
    await admin.auth.admin.updateUserById(userId, updatePayload);

    return new Response(JSON.stringify({
      approved: true,
      userId,
      signInMethod: "password",
      identity,
      usingEmail,
      signInEmail: usingEmail ? identity : `${identity.replace(/[^\d]/g, "")}@phone.rufayq.local`,
      password: tempPassword,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-otp] error", msg);
    return new Response(JSON.stringify({ approved: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
