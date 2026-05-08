#!/usr/bin/env node
/**
 * Validates src/api/openapi.ts as a well-formed OpenAPI 3.1 document.
 * Wired into CI (.github/workflows/ci.yml) so a malformed spec fails the build.
 *
 * Validation rules (kept dependency-free so CI doesn't grow a transitive
 * surface for a docs-only artifact):
 *  - openapi version starts with "3.1"
 *  - required top-level keys present (info, paths, components)
 *  - info.title + info.version are non-empty strings
 *  - every path begins with "/"
 *  - every operation has at least one response with a description
 *  - every $ref points at an existing component schema/response
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const SRC = "src/api/openapi.ts";

const fail = (msg) => {
  console.error(`✗ openapi validation failed: ${msg}`);
  process.exit(1);
};

const source = readFileSync(SRC, "utf8");

// Compile TS → ESM into a temp file so we can dynamic-import it.
const { code } = transformSync(source, {
  loader: "ts",
  format: "esm",
  target: "es2022",
});
const dir = mkdtempSync(join(tmpdir(), "openapi-"));
const out = join(dir, "openapi.mjs");
writeFileSync(out, code);

const mod = await import(pathToFileURL(out).href);
const spec = mod.openApiSpec;

if (!spec || typeof spec !== "object") fail("openApiSpec export missing");
if (!String(spec.openapi || "").startsWith("3.1")) fail(`openapi must start with "3.1" (got ${spec.openapi})`);
if (!spec.info?.title) fail("info.title is required");
if (!spec.info?.version) fail("info.version is required");
if (!spec.paths || typeof spec.paths !== "object") fail("paths object is required");
if (!spec.components) fail("components object is required");

const schemas = spec.components.schemas ?? {};
const responses = spec.components.responses ?? {};

const checkRef = (ref, where) => {
  if (typeof ref !== "string") return;
  const m = ref.match(/^#\/components\/(schemas|responses)\/(.+)$/);
  if (!m) fail(`unsupported $ref "${ref}" at ${where}`);
  const [, kind, name] = m;
  const bag = kind === "schemas" ? schemas : responses;
  if (!(name in bag)) fail(`$ref "${ref}" at ${where} → missing component`);
};

const walk = (node, path) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref") checkRef(v, path);
    else walk(v, `${path}.${k}`);
  }
};

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
let opCount = 0;
for (const [p, item] of Object.entries(spec.paths)) {
  if (!p.startsWith("/")) fail(`path "${p}" must start with "/"`);
  for (const method of METHODS) {
    const op = item?.[method];
    if (!op) continue;
    opCount++;
    if (!op.responses || Object.keys(op.responses).length === 0) {
      fail(`${method.toUpperCase()} ${p} has no responses`);
    }
    for (const [code, resp] of Object.entries(op.responses)) {
      if (resp?.$ref) continue;
      if (!resp?.description) fail(`${method.toUpperCase()} ${p} response ${code} missing description`);
    }
  }
}
walk(spec, "spec");

console.log(`✓ openapi spec OK — ${Object.keys(spec.paths).length} paths, ${opCount} operations, ${Object.keys(schemas).length} schemas`);
