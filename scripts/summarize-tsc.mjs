#!/usr/bin/env node
/**
 * Reads `tsc --noEmit --pretty false` output from stdin and:
 *   1. Writes a grouped Markdown summary to $GITHUB_STEP_SUMMARY
 *   2. Emits ::error file=...,line=...,col=...:: annotations so failures
 *      appear inline on PR diffs.
 *   3. Re-prints the raw tsc output to stdout (so the job log still has it).
 *   4. Exits non-zero if any TS errors were detected.
 */
import { appendFileSync, existsSync } from "node:fs";

const chunks = [];
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  const raw = chunks.join("");
  // Always echo so the job log keeps the original tsc output.
  process.stdout.write(raw);

  // Match: path/to/file.ts(line,col): error TSxxxx: message
  const errorRe = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/gm;
  const errors = [];
  let m;
  while ((m = errorRe.exec(raw)) !== null) {
    errors.push({ file: m[1], line: +m[2], col: +m[3], code: m[4], msg: m[5] });
  }

  if (errors.length === 0) {
    writeSummary("✅ TypeScript check passed — no errors.\n");
    process.exit(0);
  }

  // Emit GitHub annotations (these surface inline on PR diffs).
  for (const e of errors) {
    const safe = e.msg.replace(/\r?\n/g, " ").replace(/::/g, ":");
    process.stdout.write(
      `::error file=${e.file},line=${e.line},col=${e.col}::${e.code}: ${safe}\n`,
    );
  }

  // Group by file.
  const byFile = new Map();
  for (const e of errors) {
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file).push(e);
  }
  const fileRows = [...byFile.entries()]
    .map(([file, es]) => ({ file, count: es.length }))
    .sort((a, b) => b.count - a.count);

  let md = `## ❌ TypeScript check failed\n\n`;
  md += `**${errors.length} error${errors.length === 1 ? "" : "s"} across ${byFile.size} file${byFile.size === 1 ? "" : "s"}.**\n\n`;
  md += `| File | Errors |\n| --- | ---: |\n`;
  for (const r of fileRows.slice(0, 25)) {
    md += `| \`${r.file}\` | ${r.count} |\n`;
  }
  if (fileRows.length > 25) {
    md += `| _…and ${fileRows.length - 25} more_ | |\n`;
  }
  md += `\n### First errors\n\n`;
  for (const e of errors.slice(0, 50)) {
    md += `- \`${e.file}:${e.line}:${e.col}\` — **${e.code}** ${e.msg}\n`;
  }
  if (errors.length > 50) {
    md += `\n_…and ${errors.length - 50} more. See full job log._\n`;
  }

  writeSummary(md);
  process.exit(1);
});

function writeSummary(content) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, content + "\n");
  } catch (err) {
    process.stderr.write(`Failed to write step summary: ${err.message}\n`);
  }
  // Best-effort hint if path doesn't exist (local runs).
  if (!existsSync(path)) return;
}
