// Edge function: rcm-bulk-parse
// Parses an rcm_bulk_jobs row's source_url (CSV/JSON/XML/PDF text) using Lovable AI
// and writes the structured result back into parsed_payload + ai_summary.
// Caller: admin UI button "Run AI parse" → POST { jobId }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KIND_GUIDE: Record<string, string> = {
  claim_upload: "Each row = one healthcare claim. Expect columns like claim_no, patient_name, service_code, service_name, qty, unit_price, gross_amount, payer_name, policy_no, encounter_type. Output as { claims: [...] }.",
  claim_correction: "Each row = a correction to an existing claim. Expect claim_no plus the changed fields (status, denial_reason, corrected_amount). Output as { corrections: [...] }.",
  remittance_upload: "An 835 / remittance file. Extract payer payments per claim: claim_no, paid_amount, denied_amount, denial_reason_code, paid_at. Output as { remittances: [...] }.",
  price_correction: "Each row = a price-list update. Expect service_code, service_name, old_price, new_price, effective_from. Output as { price_updates: [...] }.",
};

const SYSTEM = `You are a healthcare RCM data extraction agent for Saudi NPHIES-aligned bulk uploads.
Your job: read the raw text of a CSV/JSON/XML/PDF dump and produce a clean JSON object with one array key (claims/corrections/remittances/price_updates).

Rules:
- Skip any header rows or notes — return only data rows.
- Normalize column names to snake_case.
- Coerce currency strings ("SAR 1,200.50") → numbers (1200.50).
- Coerce dates → ISO 8601 (YYYY-MM-DD).
- If a column is empty, use null (NOT empty string).
- Add a "row_index" field (1-based) to every row.
- Add a top-level "summary" string (1-2 sentences) describing what the file contains.
- Add a top-level "warnings" array listing parsing issues (missing required fields, bad dates, etc).
- Cap output at 500 rows. If the file has more, parse the first 500 and add a warning.

Return ONLY valid JSON, no markdown fences, no commentary.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // ── Auth: verify caller is an admin (uses anon key + caller's JWT) ───
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    // ── Body ─────────────────────────────────────────────────────────────
    const { jobId } = await req.json().catch(() => ({}));
    if (!jobId || typeof jobId !== "string") return json({ error: "jobId required" }, 400);

    const { data: job, error: jobErr } = await admin
      .from("rcm_bulk_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) return json({ error: "Job not found" }, 404);

    if (!job.source_url) return json({ error: "Job has no source_url" }, 400);

    // ── Mark parsing ─────────────────────────────────────────────────────
    await admin.from("rcm_bulk_jobs")
      .update({ status: "parsing", error_message: null })
      .eq("id", jobId);

    // ── Fetch source content ─────────────────────────────────────────────
    let rawText = "";
    try {
      const r = await fetch(job.source_url);
      if (!r.ok) throw new Error(`Source fetch failed: ${r.status}`);
      rawText = await r.text();
    } catch (e: any) {
      const msg = e?.message ?? "Source fetch failed";
      await admin.from("rcm_bulk_jobs").update({ status: "failed", error_message: msg }).eq("id", jobId);
      return json({ error: msg }, 502);
    }

    // Cap input size to keep AI bills sane (~200kB raw)
    const MAX_INPUT = 200_000;
    const truncated = rawText.length > MAX_INPUT;
    if (truncated) rawText = rawText.slice(0, MAX_INPUT);

    const guide = KIND_GUIDE[job.kind] || "Extract structured rows from the file.";

    // ── Call Lovable AI ──────────────────────────────────────────────────
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Job kind: ${job.kind}\nSource: ${job.source_filename || "unknown"} (${job.source_mime || "text/csv"})\nGuide: ${guide}\n\nRaw content:\n\`\`\`\n${rawText}\n\`\`\`` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const msg = `AI gateway ${aiRes.status}: ${txt.slice(0, 200)}`;
      await admin.from("rcm_bulk_jobs").update({ status: "failed", error_message: msg }).eq("id", jobId);
      const code = aiRes.status === 429 ? 429 : aiRes.status === 402 ? 402 : 500;
      return json({ error: msg }, code);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const msg = "AI returned invalid JSON";
      await admin.from("rcm_bulk_jobs").update({ status: "failed", error_message: msg, ai_summary: content.slice(0, 1000) }).eq("id", jobId);
      return json({ error: msg }, 500);
    }

    // ── Persist result ───────────────────────────────────────────────────
    const arrayKey = ["claims", "corrections", "remittances", "price_updates"].find(k => Array.isArray(parsed[k]));
    const rows = arrayKey ? parsed[arrayKey] : [];
    const summary = (parsed.summary || `Parsed ${rows.length} rows`) + (truncated ? " (input truncated to 200kB)" : "");
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    const { error: upErr } = await admin
      .from("rcm_bulk_jobs")
      .update({
        status: "parsed",
        total_rows: rows.length,
        parsed_payload: parsed,
        ai_summary: `${summary}${warnings.length ? "\n⚠ " + warnings.join(" · ") : ""}`,
      })
      .eq("id", jobId);

    if (upErr) return json({ error: upErr.message }, 500);

    return json({
      ok: true,
      jobId,
      kind: job.kind,
      totalRows: rows.length,
      summary,
      warnings,
      truncated,
    }, 200);
  } catch (e: any) {
    console.error("rcm-bulk-parse error:", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
