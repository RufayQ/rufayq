#!/usr/bin/env node
// CI guard: every edge function under supabase/functions/<name>/index.ts must
// either validate a caller JWT (getClaims), accept a cron secret
// (x-cron-secret), validate a webhook signature, or be on the public allowlist.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FN_DIR = "supabase/functions";

// Functions whose endpoints are intentionally public (signed OTPs, schema docs,
// signature-verified webhooks). Each entry should be reviewed in PR.
const PUBLIC_ALLOWLIST = new Set([
  "send-otp",        // pre-auth OTP send (rate-limited in code)
  "verify-otp",      // pre-auth OTP verification
  "openapi-spec",    // public API schema
  "extract-flight-ticket-ai", // guest mode usage
  "scan-itinerary",  // guest mode usage
  "scan-receipt",    // guest mode usage
  "chat",            // mixed guest + auth; gated by trial credits
  "lifestyle-buddy", // gated by device id + trial credits in code
]);

const issues = [];
let checked = 0;

for (const name of readdirSync(FN_DIR)) {
  const dir = join(FN_DIR, name);
  if (!statSync(dir).isDirectory()) continue;
  const idx = join(dir, "index.ts");
  let src;
  try { src = readFileSync(idx, "utf8"); } catch { continue; }
  checked++;
  if (PUBLIC_ALLOWLIST.has(name)) continue;

  const hasJwt = /getClaims\s*\(/.test(src);
  const hasCron = /x-cron-secret/i.test(src);
  const hasSignature = /(verifyWebhookSignature|x-(?:hub|stripe)-signature)/i.test(src);
  const serviceRoleOnly = /SUPABASE_SERVICE_ROLE_KEY/.test(src) && /Bearer\s+\$\{serviceKey\}/.test(src);

  if (!hasJwt && !hasCron && !hasSignature && !serviceRoleOnly) {
    issues.push(`Function "${name}" has no JWT, cron-secret, webhook signature, or service-role auth check.`);
  }
}

if (issues.length) {
  console.error("Edge-function auth check failed:\n" + issues.map((i) => "  - " + i).join("\n"));
  console.error("\nAdd in-code auth or update PUBLIC_ALLOWLIST in scripts/ci/check-edge-auth.mjs with justification.");
  process.exit(1);
}
console.log(`Edge-function auth check passed. ${checked} functions audited.`);
