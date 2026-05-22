// security-findings-sync — admin-only endpoint that accepts a list of
// findings (from Lovable security scan, CI, or manual entry) and upserts
// them into public.security_findings, marking missing ones as fixed.
//
// POST { findings: Array<{scanner_name, internal_id, title, severity?, description?, metadata?}> }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: { findings?: unknown };
  try { payload = await req.json(); } catch { payload = {}; }
  const findings = Array.isArray(payload.findings) ? payload.findings : [];

  // Basic sanitisation: only keep recognised fields, drop everything else.
  const clean = findings
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      scanner_name: String(f.scanner_name ?? "").slice(0, 64),
      internal_id: String(f.internal_id ?? "").slice(0, 128),
      title: String(f.title ?? f.internal_id ?? "Untitled").slice(0, 256),
      severity: ["low", "medium", "high", "critical"].includes(String(f.severity))
        ? String(f.severity) : "medium",
      description: f.description ? String(f.description).slice(0, 4000) : null,
      metadata: typeof f.metadata === "object" ? f.metadata : {},
    }))
    .filter((f) => f.scanner_name && f.internal_id);

  const { data, error } = await supabase.rpc("security_findings_upsert", { _findings: clean });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, processed: data ?? clean.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
