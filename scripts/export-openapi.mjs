#!/usr/bin/env node
/**
 * Compiles src/api/openapi.ts and emits the JSON spec to
 * supabase/functions/openapi-spec/spec.json so the protected edge function
 * can serve it without duplicating the source.
 *
 * Run manually after editing the spec, or wire into CI before deploy.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const SRC = "src/api/openapi.ts";
const OUT = "supabase/functions/openapi-spec/spec.json";

const source = readFileSync(SRC, "utf8");
const { code } = transformSync(source, { loader: "ts", format: "esm", target: "es2022" });
const dir = mkdtempSync(join(tmpdir(), "openapi-export-"));
const tmp = join(dir, "openapi.mjs");
writeFileSync(tmp, code);
const mod = await import(pathToFileURL(tmp).href);
const spec = mod.openApiSpec;
if (!spec) { console.error("openApiSpec export missing"); process.exit(1); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(spec, null, 2));
console.log(`✓ wrote ${OUT} (${JSON.stringify(spec).length} bytes)`);
