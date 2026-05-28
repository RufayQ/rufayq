/**
 * QC Artifact capture for E2E component tests.
 *
 * On test failure, dumps:
 *   - The current `document.body.innerHTML` (expanded-panel DOM snapshot)
 *   - A lightweight SVG "screenshot" rendering of that DOM as a wrapper
 *
 * Files are written to `test-artifacts/qc/<milestone>/<test>-<ts>.{html,svg}`
 * so the QC admin board upload script can categorize them by milestone kind.
 *
 * In CI, `scripts/qa/upload-qc-artifacts.mjs` walks this folder, uploads each
 * artifact to the `qc-attachments` storage bucket, and inserts a
 * `qc_test_runs` row tagged with the milestone category.
 *
 * Usage inside a test:
 *
 *   import { withQcArtifacts } from "@/test/qcArtifacts";
 *
 *   it("expands flight milestone", withQcArtifacts("flight", () => {
 *     render(...);
 *     fireEvent.click(...);
 *     expect(...).toBeInTheDocument();
 *   }));
 *
 * The wrapper only writes artifacts on failure or when the env var
 * `QC_ARTIFACTS_ALWAYS=1` is set (handy for golden captures).
 */
import { expect } from "vitest";

const ARTIFACT_ROOT = "test-artifacts/qc";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "test";

/** Best-effort node-only writer. No-op in browsers / strict sandboxes. */
async function writeArtifact(relPath: string, contents: string): Promise<string | null> {
  try {
    // Lazy import to avoid bundling node:fs in browser builds.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const abs = path.resolve(process.cwd(), relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, contents, "utf8");
    return abs;
  } catch {
    return null;
  }
}

/** Wrap a DOM string in a minimal SVG so the QC portal can preview it inline. */
function domToSvg(html: string, title: string): string {
  const escaped = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <title>${title}</title>
  <foreignObject x="0" y="0" width="800" height="1200">
    <body xmlns="http://www.w3.org/1999/xhtml" style="font:12px/1.4 monospace;padding:12px;background:#0b1220;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;">${escaped}</body>
  </foreignObject>
</svg>`;
}

/**
 * Wrap a test body so failures dump DOM + svg snapshots under
 * `test-artifacts/qc/<milestone>/`. Returns the captured paths via the
 * artifact log file so the upload script can pick them up.
 */
export function withQcArtifacts<T>(
  milestone: string,
  body: () => T | Promise<T>,
): () => Promise<T> {
  return async () => {
    const testName = expect.getState().currentTestName || "anonymous";
    try {
      const result = await body();
      if (process.env.QC_ARTIFACTS_ALWAYS === "1") {
        await dump(milestone, testName, "pass");
      }
      return result;
    } catch (err) {
      await dump(milestone, testName, "fail");
      throw err;
    }
  };
}

async function dump(milestone: string, testName: string, outcome: "pass" | "fail") {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${ARTIFACT_ROOT}/${slug(milestone)}/${slug(testName)}-${outcome}-${ts}`;
  const html = typeof document !== "undefined" ? document.body.innerHTML : "<no-dom/>";
  const wrapped = `<!doctype html><html><head><meta charset="utf-8"><title>${testName}</title></head><body data-qc-milestone="${milestone}" data-qc-outcome="${outcome}">${html}</body></html>`;
  await writeArtifact(`${base}.html`, wrapped);
  await writeArtifact(`${base}.svg`, domToSvg(html, `${milestone} — ${testName}`));
  // Manifest entry so the upload script can attribute the artifact without
  // re-parsing filenames.
  const manifestLine = JSON.stringify({
    milestone,
    test: testName,
    outcome,
    html: `${base}.html`,
    svg: `${base}.svg`,
    timestamp: ts,
  }) + "\n";
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const manifest = path.resolve(process.cwd(), `${ARTIFACT_ROOT}/manifest.jsonl`);
    await fs.mkdir(path.dirname(manifest), { recursive: true });
    await fs.appendFile(manifest, manifestLine, "utf8");
  } catch {
    /* no-op outside node */
  }
}
