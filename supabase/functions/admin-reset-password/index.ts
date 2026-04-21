// Admin resets a user's password (auto-generated or manual).
// Also supports updating the auth email so phone-based sign-in works.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const generatePwd = () => {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let p = ""; for (let i = 0; i < 14; i++) p += c[Math.floor(Math.random() * c.length)];
  return p;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await userClient.auth.getUser();
    if (!ud?.user) return j({ error: "Unauthorized" }, 401);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: ud.user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Forbidden — admin only." }, 403);

    const body = await req.json().catch(() => ({}));
    const user_id = String(body?.user_id || "").trim();
    const new_email = body?.new_email ? String(body.new_email).trim().toLowerCase() : null;
    let password = body?.password ? String(body.password) : "";
    const auto = !!body?.auto_generate;
    if (!user_id) return j({ error: "user_id required" }, 400);
    if (auto || !password) password = generatePwd();
    if (password.length < 8) return j({ error: "Password must be ≥ 8 chars." }, 400);

    const update: Record<string, unknown> = { password };
    if (new_email) update.email = new_email;
    const { error } = await admin.auth.admin.updateUserById(user_id, update);
    if (error) return j({ error: error.message }, 400);

    await admin.rpc("log_audit_event", {
      _action: "user_password_reset",
      _target_type: "user",
      _target_id: user_id,
      _details: { auto, email_changed: !!new_email },
      _actor_id: ud.user.id,
      _actor_email: ud.user.email,
    });

    return j({ ok: true, password, email: new_email });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
