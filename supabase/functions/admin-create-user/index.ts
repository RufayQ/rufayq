import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { email, password, full_name, phone, role, organization_id, org_type, provider_type } = body || {};
    if (!email || !password) return j({ error: "Email and password are required" }, 400);
    const validProviderTypes = ["patient","hospital","physician","vendor","insurance","internal"];
    const ptype = validProviderTypes.includes(provider_type) ? provider_type : (role === "admin" || role === "moderator" ? "internal" : "patient");

    // 1. Create auth user
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, phone, created_by_admin: true },
    });
    if (cErr) return j({ error: cErr.message }, 400);
    const newUserId = created.user!.id;

    // 2. Attach role if any
    if (role && (role === "admin" || role === "moderator" || role === "user")) {
      await admin.from("user_roles").insert({ user_id: newUserId, role });
    }

    // 3. Create profile row (so admin can see them in Users tab)
    await admin.from("profiles").insert({
      device_id: `manual_${newUserId.slice(0, 12)}`,
      full_name_en: full_name || null,
      email, phone: phone || null,
      organization_id: organization_id || null,
      provider_type: ptype,
    });

    // 4. Audit log
    await admin.rpc("log_audit_event", {
      _action: "staff_user_created",
      _target_type: "user",
      _target_id: newUserId,
      _details: { email, role, organization_id, org_type, provider_type: ptype },
      _actor_id: user.id,
      _actor_email: user.email,
    });

    return j({ user_id: newUserId, email });
  } catch (e: any) {
    return j({ error: e.message || "Internal error" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
