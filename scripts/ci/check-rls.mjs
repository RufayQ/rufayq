#!/usr/bin/env node
// CI guard: every CREATE TABLE public.* must have a corresponding
// ENABLE ROW LEVEL SECURITY somewhere in the migrations directory.
// Also flags policies that use `USING (true)` without a `-- @security-public`
// justification on the preceding line.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIG_DIR = "supabase/migrations";

const allSql = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ file: f, sql: readFileSync(join(MIG_DIR, f), "utf8") }));

const createdTables = new Set();
const rlsEnabled = new Set();
const issues = [];

const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-zA-Z0-9_]+)/gi;
const enableRe = /alter\s+table\s+(?:only\s+)?public\.([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi;
const dropRe   = /drop\s+table\s+(?:if\s+exists\s+)?public\.([a-zA-Z0-9_]+)/gi;

for (const { sql } of allSql) {
  for (const m of sql.matchAll(createRe)) createdTables.add(m[1].toLowerCase());
  for (const m of sql.matchAll(enableRe)) rlsEnabled.add(m[1].toLowerCase());
  for (const m of sql.matchAll(dropRe))  createdTables.delete(m[1].toLowerCase());
}

for (const t of createdTables) {
  if (!rlsEnabled.has(t)) {
    issues.push(`Table public.${t} is created but never has RLS enabled.`);
  }
}

// Permissive policy check — WARN only (legacy migrations have intentional
// public-read policies for CMS/marketing content). New code should add a
// `-- @security-public` comment in the preceding 5 lines to silence the warning.
const warnings = [];
for (const { file, sql } of allSql) {
  const lines = sql.split("\n");
  lines.forEach((line, i) => {
    if (/\busing\s*\(\s*true\s*\)/i.test(line) || /\bwith\s+check\s*\(\s*true\s*\)/i.test(line)) {
      const window = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
      if (!/@security-public/i.test(window)) {
        warnings.push(`${file}:${i + 1} permissive policy without -- @security-public justification`);
      }
    }
  });
}

if (issues.length) {
  console.error("RLS check failed:\n" + issues.map((i) => "  - " + i).join("\n"));
  process.exit(1);
}
if (warnings.length) {
  console.warn(`RLS check: ${warnings.length} permissive-policy warnings (non-blocking).`);
}
console.log(`RLS check passed. ${createdTables.size} public tables, all RLS-enabled.`);

