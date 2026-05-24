// Verify OTP: tries manual admin-issued code first (free, no Twilio cost),
// then falls back to Twilio Verify check. On success, ensures a Supabase
// Auth user exists and returns one-time credentials for the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyOtpProfile {
  full_name_en?: string | null;
  full_name_ar?: string | null;
  national_id_or_passport?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  terms_accepted?: boolean;
  privacy_accepted?: boolean;
}

interface VerifyOtpBody {
  to: string;
  code: string;
  channel?: "whatsapp" | "sms" | "email";
  /** Optional profile payload — used during signup to atomically create the
   * `public.profiles` row server-side so contact info can never be lost to a
   * browser race. For non-signup flows (recover) callers may omit this; we
   * still derive the verified phone/email from the OTP recipient. */
  profile?: VerifyOtpProfile;
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
    const ipAddress = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

    // --- Rate limit: max 8 failed attempts per recipient per 15 minutes,
    //                 max 30 failed attempts per IP per 15 minutes.
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recipFails } = await admin
      .from("otp_verify_attempts")
      .select("id", { count: "exact", head: true })
      .eq("recipient", recipientKey)
      .eq("succeeded", false)
      .gte("attempt_at", windowStart);
    if ((recipFails ?? 0) >= 8) {
      return new Response(JSON.stringify({
        approved: false,
        error: "Too many failed attempts. Please request a new code in 15 minutes.",
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (ipAddress) {
      const { count: ipFails } = await admin
        .from("otp_verify_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ipAddress)
        .eq("succeeded", false)
        .gte("attempt_at", windowStart);
      if ((ipFails ?? 0) >= 30) {
        return new Response(JSON.stringify({
          approved: false,
          error: "Too many failed attempts from your network. Try again later.",
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const recordAttempt = async (succeeded: boolean) => {
      await admin.from("otp_verify_attempts").insert({
        recipient: recipientKey, ip_address: ipAddress, succeeded,
      });
    };

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
        await recordAttempt(false);
        return new Response(JSON.stringify({
          approved: false,
          error: data?.message || "Verification not found or expired",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (data.status !== "approved") {
        await recordAttempt(false);
        return new Response(JSON.stringify({ approved: false, status: data.status, error: "Code did not match" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      approved = true;
    }

    // Track the successful attempt for monitoring (does not count toward limits).
    await recordAttempt(true);

    // 3. Approved → create or fetch Supabase Auth user
    const usingEmail = isEmail(recipientKey);
    const identity = recipientKey;

    let userId: string | null = null;
    const createPayload: Record<string, unknown> = usingEmail
      ? { email: identity, email_confirm: true }
      : { phone: identity, phone_confirm: true };

    const { data: created, error: createErr } = await admin.auth.admin.createUser(createPayload);
    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr) {
      // Paginate through all auth users to locate existing account (handles >200 users).
      const perPage = 1000;
      const needle = usingEmail ? identity.toLowerCase() : identity.replace(/^\+/, "");
      for (let page = 1; page <= 50; page++) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
        if (listErr) break;
        const users = list?.users ?? [];
        const match = users.find((u) =>
          usingEmail ? u.email?.toLowerCase() === needle : u.phone === needle
        );
        if (match) { userId = match.id; break; }
        if (users.length < perPage) break;
      }
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

    // 6. Atomic profile upsert — guarantees Admin sees real phone/email.
    // Verified channel always wins over any client-supplied value.
    const profile = body.profile ?? {};
    const deviceId = `auth_${userId}`;
    const verifiedPhone = !usingEmail ? identity : (profile.phone?.trim() || null);
    const verifiedEmail = usingEmail ? identity : (profile.email?.trim()?.toLowerCase() || null);
    const idOrPassport = profile.national_id_or_passport?.trim() || "";
    const isSaudiId = /^\d{10}$/.test(idOrPassport);

    const profileRow: Record<string, unknown> = {
      device_id: deviceId,
      phone: verifiedPhone,
      email: verifiedEmail,
    };
    if (profile.full_name_en?.trim()) profileRow.full_name_en = profile.full_name_en.trim();
    if (profile.full_name_ar?.trim()) profileRow.full_name_ar = profile.full_name_ar.trim();
    if (idOrPassport) {
      profileRow.saudi_id = isSaudiId ? idOrPassport : null;
      profileRow.passport_number = isSaudiId ? null : idOrPassport;
    }
    if (profile.date_of_birth) profileRow.date_of_birth = profile.date_of_birth;
    if (profile.gender) profileRow.gender = profile.gender;
    if (profile.nationality?.trim()) profileRow.nationality = profile.nationality.trim();
    if (profile.terms_accepted) profileRow.terms_accepted_at = new Date().toISOString();
    if (profile.privacy_accepted) profileRow.privacy_accepted_at = new Date().toISOString();

    const { error: profileErr } = await admin
      .from("profiles")
      .upsert(profileRow, { onConflict: "device_id" });
    if (profileErr) {
      console.error("[verify-otp] profile upsert failed", profileErr.message, { userId, deviceId });
      // Surface so the client can retry instead of silently succeeding.
      return new Response(JSON.stringify({
        approved: true,
        userId,
        profilePersisted: false,
        error: "Verified, but contact details could not be saved. Please retry.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      approved: true,
      userId,
      signInMethod: "password",
      identity,
      usingEmail,
      signInEmail: usingEmail ? identity : `${identity.replace(/[^\d]/g, "")}@phone.rufayq.local`,
      password: tempPassword,
      profilePersisted: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-otp] error", msg);
    return new Response(JSON.stringify({ approved: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
