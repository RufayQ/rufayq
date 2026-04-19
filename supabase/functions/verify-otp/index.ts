// Twilio Verify check + create/sign-in Supabase Auth user (passwordless).
// On approved code: ensure an auth.users row exists with phone or email as identity,
// then mint a magic-link / OTP session token and return it to the client.

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

    // 1. Check OTP with Twilio
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

    // 2. Approved → create or fetch Supabase Auth user
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const usingEmail = isEmail(body.to);
    const identity = body.to.trim();

    // Try to create. If exists, that's fine.
    let userId: string | null = null;
    const createPayload: Record<string, unknown> = usingEmail
      ? { email: identity, email_confirm: true }
      : { phone: identity, phone_confirm: true };

    const { data: created, error: createErr } = await admin.auth.admin.createUser(createPayload);
    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr) {
      // User likely exists — look them up.
      // listUsers paginates; query by filter.
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

    // 3. Check user_status — if suspended, deny
    const { data: status } = await admin.from("user_status").select("status, reason").eq("user_id", userId).maybeSingle();
    if (status && status.status === "suspended") {
      return new Response(JSON.stringify({
        approved: false,
        suspended: true,
        error: status.reason || "This account has been suspended. Contact support.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Issue a one-time temp password the client uses to sign in immediately.
    //    The session it creates is the user's real Supabase Auth session.
    //    Password is rotated each verify call so it can't be re-used.
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const updatePayload: Record<string, unknown> = { password: tempPassword };
    // Ensure user has an email we can sign in with (Supabase password sign-in needs email).
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
