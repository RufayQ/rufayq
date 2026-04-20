// Provider-side patient lookup by Saudi ID / Passport / Iqama.
// Uses service role to bypass profile RLS (providers can't read profiles directly).
// Verifies caller is an authenticated active member of the supplied organization_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  organization_id: string;
  search_type: "saudi_id" | "passport" | "iqama";
  search_value: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing auth" }, 401);

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPA_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthenticated" }, 401);

    const body = (await req.json()) as Body;
    if (!body?.organization_id || !body?.search_type || !body?.search_value) {
      return json({ error: "organization_id, search_type, search_value required" }, 400);
    }
    if (!["saudi_id", "passport", "iqama"].includes(body.search_type)) {
      return json({ error: "Invalid search_type" }, 400);
    }

    const admin = createClient(SUPA_URL, SERVICE);

    // Verify caller is an active member of this org (or admin).
    const { data: membership } = await admin
      .from("provider_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", body.organization_id)
      .eq("is_active", true)
      .maybeSingle();

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    if (!membership && !isAdmin) return json({ error: "Not a member of this organization" }, 403);

    const column =
      body.search_type === "saudi_id" ? "saudi_id" :
      body.search_type === "passport" ? "passport_number" : "iqama_number";

    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, device_id, full_name_en, full_name_ar, date_of_birth, gender, nationality")
      .eq(column, body.search_value.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);

    return json({ match: profile || null }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
