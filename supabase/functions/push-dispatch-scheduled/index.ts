// Dispatches scheduled push campaigns whose scheduled_at <= now().
// Invoked by pg_cron every minute (see migration).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: due, error } = await supabase
    .from("push_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; ok: boolean; error?: string; delivered?: number }> = [];
  for (const row of due ?? []) {
    const { data, error: sendErr } = await supabase.rpc("push_campaign_send", {
      _campaign_id: row.id,
    });
    if (sendErr) {
      await supabase
        .from("push_campaigns")
        .update({ status: "failed", error_msg: sendErr.message })
        .eq("id", row.id);
      results.push({ id: row.id, ok: false, error: sendErr.message });
    } else {
      results.push({ id: row.id, ok: true, delivered: (data as { delivered?: number })?.delivered });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
