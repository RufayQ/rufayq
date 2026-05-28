#!/usr/bin/env node
/**
 * generate-remediation-checklist.mjs
 *
 * Turn a Lovable Cloud / Supabase security scan JSON dump into a markdown
 * remediation checklist that links each finding to:
 *   • the file/migration where the fix landed (or "TODO")
 *   • a concrete verification step QA can re-run
 *
 * Usage:
 *   node scripts/qa/generate-remediation-checklist.mjs path/to/scan.json
 *   cat scan.json | node scripts/qa/generate-remediation-checklist.mjs
 *
 * Output is written to docs/qa/security-remediation-<YYYY-MM-DD>.md so
 * historical checklists are preserved per scan.
 *
 * Expected scan shape (best-effort — extra fields are ignored):
 *   {
 *     "scannedAt": "2026-05-28T16:00:00Z",
 *     "findings": [
 *       {
 *         "id": "rls-missing-public-foo",
 *         "severity": "ERROR" | "WARN" | "INFO",
 *         "title": "RLS disabled on public.foo",
 *         "rule": "rls_enabled_no_policies",
 *         "table": "public.foo",
 *         "remediation": "Enable RLS and add policies."
 *       }
 *     ]
 *   }
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const arg = process.argv[2];
const raw = arg && arg !== "-"
  ? fs.readFileSync(arg, "utf8")
  : fs.readFileSync(0, "utf8");

let scan;
try {
  scan = JSON.parse(raw);
} catch (e) {
  console.error("Could not parse scan JSON:", e.message);
  process.exit(1);
}

const findings = Array.isArray(scan.findings) ? scan.findings : [];
const scannedAt = scan.scannedAt || new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);

// Heuristic mapping from rule → suggested verification step.
const verifyHints = {
  rls_enabled_no_policies: "Run `supabase--linter`; confirm the table no longer appears.",
  rls_disabled_in_public: "Run `supabase--linter`; confirm `rls_disabled_in_public` clears.",
  realtime_published_tables_no_topic_policies:
    "Subscribe to the channel from a foreign device id — expect denial.",
  function_search_path_mutable:
    "`SELECT proname, proconfig FROM pg_proc WHERE proname = '<fn>'` shows `search_path=public`.",
  auth_allow_anonymous_sign_ins:
    "Hit `/auth/v1/signup` with `data: { is_anonymous: true }` — expect 400.",
  storage_bucket_public_no_rls:
    "Verify bucket is private and signed URLs are required to read objects.",
};

const fixHints = {
  rls_enabled_no_policies: "Add `CREATE POLICY` in a new migration under `supabase/migrations/`.",
  rls_disabled_in_public: "`ALTER TABLE … ENABLE ROW LEVEL SECURITY;` + policies in a migration.",
  realtime_published_tables_no_topic_policies:
    "Extend `public._rt_topic_allowed(...)` in a new migration.",
  function_search_path_mutable:
    "`ALTER FUNCTION <fn>(...) SET search_path = public;` in a migration.",
  auth_allow_anonymous_sign_ins:
    "`supabase--configure_auth` → disable anonymous sign-ins.",
};

const severityOrder = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) =>
  (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

const rows = findings.map((f, i) => {
  const fix = fixHints[f.rule] || "TODO — link migration or file:line.";
  const verify = verifyHints[f.rule] || f.remediation || "TODO — define verification.";
  const target = [f.table, f.rule].filter(Boolean).join(" · ") || f.id || "—";
  return `| ${i + 1} | ${f.severity || "—"} | ${f.title || target} (${target}) | ${fix} | ${verify} | ☐ |`;
});

if (!rows.length) {
  rows.push("| 1 | — | No findings 🎉 | — | Re-run scan after next merge. | ☑ |");
}

const md = `# Security Remediation Checklist — ${today}

Generated from a security scan dated **${scannedAt}**.
Total findings: **${findings.length}**.

| #   | Severity | Finding (rule / table) | Fix (file:line or migration) | Verify (manual or automated step) | Status |
| --- | -------- | ---------------------- | ---------------------------- | ---------------------------------- | ------ |
${rows.join("\n")}

## Standing verification checks

- [ ] \`supabase--linter\` reports zero ERROR-level rules.
- [ ] \`scripts/ci/check-rls.mjs\` exits 0.
- [ ] \`scripts/ci/check-edge-auth.mjs\` exits 0.
- [ ] Realtime: subscribing with a foreign device id is denied.
- [ ] Auth: anonymous sign-ups disabled; email verification required.

> Template reference: \`docs/qa/security-remediation-template.md\`
`;

const outDir = path.join("docs", "qa");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `security-remediation-${today}.md`);
fs.writeFileSync(outPath, md);
console.log(`Wrote ${outPath} (${findings.length} findings).`);
