// expire-pending-payments — sweeps payment_receipts.status='pending' rows
// whose code_expires_at has passed and flips them to 'code_expired'.
// Intended to be invoked by pg_cron every 30 minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require shared cron secret. Configure CRON_SECRET as an Edge Function secret
  // and pass it from the pg_cron job as the x-cron-secret header.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("payment_receipts")
    .update({ status: "code_expired" })
    .eq("status", "pending")
    .lt("code_expires_at", nowIso)
    .select("id");

  if (error) {
    console.error("expire-pending-payments failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expired = data?.length ?? 0;
  console.log(`expire-pending-payments: expired ${expired} receipt(s)`);
  return new Response(JSON.stringify({ expired }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
