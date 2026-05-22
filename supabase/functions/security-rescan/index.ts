// security-rescan — nightly RLS / policy auto-rescan.
//
// Auth: requires header `x-cron-secret` matching env CRON_SECRET. Intended to
// be invoked by pg_cron via pg_net. Uses the service-role key to run the
// SECURITY DEFINER read helper and upsert findings under scanner_name
// `auto_rescan` (scoped so it never touches other scanners' findings).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCANNER_NAME = "auto_rescan";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || !provided || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: findings, error: collectErr } = await supabase.rpc("security_rescan_collect");
  if (collectErr) {
    return new Response(JSON.stringify({ error: collectErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const list = Array.isArray(findings) ? findings : [];

  const { data: processed, error: upErr } = await supabase.rpc("security_findings_upsert_scoped", {
    _scanner_name: SCANNER_NAME,
    _findings: list,
  });
  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    scanner: SCANNER_NAME,
    processed,
    findings: list.length,
    ran_at: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
