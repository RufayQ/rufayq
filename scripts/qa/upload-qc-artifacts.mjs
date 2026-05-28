#!/usr/bin/env node
/**
 * Upload QC E2E artifacts (DOM snapshots + SVG screenshots) produced by
 * `src/test/qcArtifacts.ts` to the `qc-attachments` storage bucket and insert
 * a corresponding `qc_test_runs` row tagged with the milestone category.
 *
 * Categories are derived from the artifact's milestone slug, e.g.
 *   transport-flight        → case_subtags: ['e2e','tap-for-details','flight']
 *   appointment (consult)   → case_subtags: ['e2e','tap-for-details','appointment']
 *
 * Manifest layout (written by withQcArtifacts):
 *   test-artifacts/qc/manifest.jsonl   (one JSON line per dumped test)
 *   test-artifacts/qc/<milestone>/<test>-<outcome>-<ts>.{html,svg}
 *
 * Env:
 *   SUPABASE_URL                 (required)
 *   SUPABASE_SERVICE_ROLE_KEY    (required — service role for storage + insert)
 *   QC_BUILD_VERSION             (optional, defaults to git short SHA or 'dev')
 *   QC_PLATFORM                  (optional, defaults to 'web')
 *
 * Usage:
 *   node scripts/qa/upload-qc-artifacts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(process.cwd(), "test-artifacts/qc");
const MANIFEST = path.join(ROOT, "manifest.jsonl");
const BUCKET = "qc-attachments";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[qc-upload] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const buildVersion =
  process.env.QC_BUILD_VERSION ||
  (() => {
    try { return execSync("git rev-parse --short HEAD").toString().trim(); }
    catch { return "dev"; }
  })();
const platform = process.env.QC_PLATFORM || "web";

const exists = async (p) => stat(p).then(() => true).catch(() => false);

const readManifest = async () => {
  if (!(await exists(MANIFEST))) return [];
  const raw = await readFile(MANIFEST, "utf8");
  return raw.split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
};

const mimeFor = (file) =>
  file.endsWith(".svg") ? "image/svg+xml" :
  file.endsWith(".html") ? "text/html" :
  file.endsWith(".png") ? "image/png" : "application/octet-stream";

const categoryFor = (milestone) => {
  // Strip a `transport-` prefix so the case_subtag is the milestone kind.
  const m = String(milestone || "unknown");
  return m.startsWith("transport-") ? m.slice("transport-".length) : m;
};

const uploadFile = async (localPath, bucketPath) => {
  const body = await readFile(localPath);
  const { error } = await supabase.storage.from(BUCKET).upload(bucketPath, body, {
    contentType: mimeFor(localPath),
    upsert: true,
  });
  if (error) throw new Error(`upload ${bucketPath}: ${error.message}`);
  return bucketPath;
};

const main = async () => {
  if (!(await exists(ROOT))) {
    console.log("[qc-upload] no test-artifacts/qc directory — nothing to upload");
    return;
  }
  const entries = await readManifest();
  if (entries.length === 0) {
    console.log("[qc-upload] manifest is empty — no failed/captured tests");
    return;
  }
  console.log(`[qc-upload] uploading ${entries.length} artifact set(s) → bucket ${BUCKET}`);

  for (const entry of entries) {
    const category = categoryFor(entry.milestone);
    const stamp = entry.timestamp || new Date().toISOString().replace(/[:.]/g, "-");
    const folder = `e2e/${category}/${stamp}`;
    const paths = [];

    for (const key of ["html", "svg", "png"]) {
      const local = entry[key];
      if (!local || !(await exists(local))) continue;
      const dest = `${folder}/${path.basename(local)}`;
      try {
        await uploadFile(local, dest);
        paths.push(dest);
        console.log(`  ✓ ${dest}`);
      } catch (e) {
        console.warn(`  ✗ ${dest}: ${e.message}`);
      }
    }

    if (paths.length === 0) continue;

    const { error } = await supabase.from("qc_test_runs").insert({
      build_version: buildVersion,
      platform,
      scenario: `Tap-for-details · ${category} · ${entry.test}`,
      result: entry.outcome === "fail" ? "fail" : "pass",
      case_subtags: ["e2e", "tap-for-details", category],
      notes: `Automated E2E artifact upload. Milestone category: ${category}. Test: ${entry.test}.`,
      screenshot_paths: paths,
    });
    if (error) {
      console.warn(`  ! qc_test_runs insert failed: ${error.message}`);
    } else {
      console.log(`  → qc_test_runs row recorded (${category})`);
    }
  }
};

main().catch((e) => {
  console.error("[qc-upload] fatal:", e);
  process.exit(1);
});
