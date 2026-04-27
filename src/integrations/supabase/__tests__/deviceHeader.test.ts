/**
 * Tests for the global fetch interceptor in `deviceHeader.ts`. This module
 * has a top-level `if (typeof window !== "undefined")` side-effect, so we
 * lazy-`import()` it inside each `it()` after wiring up `window.fetch` and
 * `import.meta.env`. We also `vi.resetModules()` between cases to ensure the
 * side-effect re-runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SUPA_URL = "https://example.supabase.co";

// Stub the env that deviceHeader.ts reads at module-eval time.
vi.stubEnv("VITE_SUPABASE_URL", SUPA_URL);

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  // Fresh device id per test
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const installSpyFetch = () => {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response("{}", { status: 200 }),
  );
  globalThis.fetch = spy as unknown as typeof fetch;
  window.fetch = spy as unknown as typeof fetch;
  return spy;
};

const lastInit = (spy: ReturnType<typeof installSpyFetch>): RequestInit => {
  const call = spy.mock.calls[spy.mock.calls.length - 1];
  return (call?.[1] as RequestInit) ?? {};
};

const headerOf = (init: RequestInit, name: string): string | null => {
  const h = init.headers;
  if (!h) return null;
  if (h instanceof Headers) return h.get(name);
  if (Array.isArray(h)) return h.find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1] ?? null;
  const rec = h as Record<string, string>;
  const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? rec[key] : null;
};

describe("deviceHeader fetch interceptor", () => {
  it("injects x-device-id on Supabase URLs", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch(`${SUPA_URL}/rest/v1/notes?select=*`);

    expect(spy).toHaveBeenCalledTimes(1);
    const dev = headerOf(lastInit(spy), "x-device-id");
    expect(dev).toBeTruthy();
    expect(dev!.length).toBeGreaterThan(8);
  });

  it("does NOT touch headers for non-Supabase URLs", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch("https://api.openai.com/v1/models", {
      headers: { authorization: "Bearer xyz" },
    });

    const init = lastInit(spy);
    expect(headerOf(init, "x-device-id")).toBeNull();
    expect(headerOf(init, "authorization")).toBe("Bearer xyz");
  });

  it("does NOT overwrite a caller-set x-device-id", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch(`${SUPA_URL}/rest/v1/x`, {
      headers: { "x-device-id": "caller-supplied-id" },
    });

    expect(headerOf(lastInit(spy), "x-device-id")).toBe("caller-supplied-id");
  });

  it("preserves caller-supplied auth header on Supabase URLs", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch(`${SUPA_URL}/rest/v1/x`, {
      headers: { authorization: "Bearer abc", "content-type": "application/json" },
    });

    const init = lastInit(spy);
    expect(headerOf(init, "authorization")).toBe("Bearer abc");
    expect(headerOf(init, "content-type")).toBe("application/json");
    expect(headerOf(init, "x-device-id")).toBeTruthy();
  });

  it("reuses the same device id across requests", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch(`${SUPA_URL}/rest/v1/a`);
    await window.fetch(`${SUPA_URL}/rest/v1/b`);

    const a = headerOf((spy.mock.calls[0]?.[1] as RequestInit) ?? {}, "x-device-id");
    const b = headerOf((spy.mock.calls[1]?.[1] as RequestInit) ?? {}, "x-device-id");
    expect(a).toBe(b);
    expect(a).toBeTruthy();
  });

  it("handles URL objects and Request objects", async () => {
    const spy = installSpyFetch();
    await import("../deviceHeader");

    await window.fetch(new URL(`${SUPA_URL}/rest/v1/x`));
    await window.fetch(new Request(`${SUPA_URL}/rest/v1/y`));

    expect(spy).toHaveBeenCalledTimes(2);
    expect(headerOf((spy.mock.calls[0]?.[1] as RequestInit) ?? {}, "x-device-id")).toBeTruthy();
    expect(headerOf((spy.mock.calls[1]?.[1] as RequestInit) ?? {}, "x-device-id")).toBeTruthy();
  });
});
