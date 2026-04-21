// Admin creates a new user (staff or external).
// Idempotent: if auth user already exists, attach role/profile to the existing user
// and return success so the admin UI doesn't break on duplicates.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["admin", "moderator", "user"] as const;
const VALID_PTYPES = ["patient", "hospital", "physician", "vendor", "insurance", "internal"] as const;

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) {
      return j({ error: "Server is missing Supabase credentials. Contact support." }, 500);
    }

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return j({ error: "Unauthorized — please sign in again." }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: getUserErr } = await userClient.auth.getUser();
    if (getUserErr || !userData?.user) return j({ error: "Unauthorized — session invalid." }, 401);
    const actor = userData.user;

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: actor.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Forbidden — admin role required." }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const full_name = body?.full_name ? String(body.full_name).trim() : null;
    const full_name_ar = body?.full_name_ar ? String(body.full_name_ar).trim() : null;
    const phone = body?.phone ? String(body.phone).trim() : null;
    const role = VALID_ROLES.includes(body?.role) ? body.role : null;
    const organization_id = body?.organization_id || null;
    const provider_type = VALID_PTYPES.includes(body?.provider_type)
      ? body.provider_type
      : (role === "admin" || role === "moderator" ? "internal" : "patient");
    const id_number = body?.id_number ? String(body.id_number).trim() : null;
    const date_of_birth = body?.date_of_birth || null;
    const gender = body?.gender ? String(body.gender) : null;
    const nationality = body?.nationality ? String(body.nationality).trim() : null;

    if (!email || !isEmail(email)) return j({ error: "A valid email is required." }, 400);
    if (!password || password.length < 8) return j({ error: "Password must be at least 8 characters." }, 400);

    // 1. Try to create auth user; if duplicate, look up existing
    let userId: string | null = null;
    let alreadyExisted = false;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, phone, created_by_admin: true },
    });
    if (created?.user?.id) {
      userId = created.user.id;
    } else {
      const isDup = cErr?.message?.toLowerCase().includes("already") || cErr?.message?.toLowerCase().includes("registered");
      if (!isDup) return j({ error: cErr?.message || "Failed to create auth user." }, 400);
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!match) return j({ error: "User exists but could not be located." }, 500);
      userId = match.id;
      alreadyExisted = true;
      await admin.auth.admin.updateUserById(userId, { password });
    }

    // 2. Attach role (idempotent — unique on user_id+role)
    if (role) {
      const { error: rErr } = await admin.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (rErr && !rErr.message.toLowerCase().includes("duplicate")) {
        console.error("[admin-create-user] role insert error", rErr);
      }
    }

    // 3. Upsert profile keyed by deterministic device_id derived from auth uid
    const device_id = `auth_${userId}`;
    // ID-number heuristic: 10 digits → Saudi national ID; otherwise treat as passport
    const id_clean = id_number ? id_number.replace(/\s+/g, "") : null;
    const saudi_id = id_clean && /^\d{10}$/.test(id_clean) ? id_clean : null;
    const passport_number = id_clean && !saudi_id ? id_clean : null;
    const now = new Date().toISOString();

    const { error: pErr } = await admin.from("profiles").upsert(
      {
        device_id,
        full_name_en: full_name,
        full_name_ar,
        email,
        phone,
        organization_id,
        provider_type,
        date_of_birth,
        gender,
        nationality,
        saudi_id,
        passport_number,
        terms_accepted_at: now,
        privacy_accepted_at: now,
      },
      { onConflict: "device_id" },
    );
    if (pErr) {
      console.error("[admin-create-user] profile upsert error", pErr);
      return j({ error: `Profile could not be saved: ${pErr.message}` }, 500);
    }

    // 4. Audit
    await admin.rpc("log_audit_event", {
      _action: alreadyExisted ? "staff_user_updated" : "staff_user_created",
      _target_type: "user",
      _target_id: userId,
      _details: { email, role, organization_id, provider_type, already_existed: alreadyExisted },
      _actor_id: actor.id,
      _actor_email: actor.email,
    });

    return j({ user_id: userId, email, already_existed: alreadyExisted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[admin-create-user] crash", msg);
    return j({ error: msg }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
