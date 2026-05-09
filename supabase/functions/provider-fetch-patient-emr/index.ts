/**
 * provider-fetch-patient-emr — returns sectioned EMR for a patient,
 * gated by `provider_has_consent`. Caller must be an active member of the org.
 * Logs every access to `provider_emr_access_log`.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTIONS = [
  "profile", "medications", "lab_results", "imaging",
  "discharge_summaries", "appointments", "consultations",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

    // user-context client to identify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const orgId: string | undefined = body.organization_id;
    const deviceId: string | undefined = body.patient_device_id;
    if (!orgId || !deviceId) {
      return new Response(JSON.stringify({ error: "missing fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // service-role client for cross-table reads
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // verify membership
    const { data: member } = await admin.from("provider_members").select("id")
      .eq("user_id", userData.user.id).eq("organization_id", orgId).eq("is_active", true).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "not_a_member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // consent check per section
    const granted: string[] = [];
    const denied: string[] = [];
    const sections: Array<Record<string, unknown>> = [];

    for (const section of SECTIONS) {
      const { data: ok } = await admin.rpc("provider_has_consent", {
        _org_id: orgId, _device_id: deviceId, _section: section,
      });
      if (!ok) {
        sections.push({ granted: false, section });
        denied.push(section);
        continue;
      }
      granted.push(section);

      // fetch the actual data (best-effort; section→source mapping)
      let data: unknown = null;
      if (section === "profile") {
        const r = await admin.from("medical_profiles").select("*").eq("device_id", deviceId).maybeSingle();
        data = r.data;
      } else if (section === "medications") {
        const r = await admin.from("provider_medication_updates").select("*")
          .eq("patient_device_id", deviceId).order("created_at", { ascending: false }).limit(50);
        data = r.data ?? [];
      } else if (section === "appointments") {
        const r = await admin.from("provider_appointments").select("*")
          .eq("patient_device_id", deviceId).order("scheduled_at", { ascending: false }).limit(50);
        data = r.data ?? [];
      } else {
        // lab_results / imaging / discharge_summaries / consultations:
        // wired to medical_records once that schema is exposed.
        data = [];
      }
      sections.push({ granted: true, section, data });
    }

    // audit log
    await admin.from("provider_emr_access_log").insert({
      organization_id: orgId, accessed_by: userData.user.id,
      patient_device_id: deviceId, granted_sections: granted, denied_sections: denied,
    });

    return new Response(JSON.stringify({
      patient_device_id: deviceId, sections, fetched_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
