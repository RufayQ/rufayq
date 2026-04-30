import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cachedFetch,
  clearAll,
  invalidate,
  invalidatePrefix,
  OfflineDataError,
} from "../cache";

beforeEach(() => {
  clearAll();
  vi.useRealTimers();
});

describe("cachedFetch", () => {
  it("returns fresh data and writes cache on first call", async () => {
    const r = await cachedFetch("k1", async () => ({ n: 1 }));
    expect(r).toMatchObject({ data: { n: 1 }, stale: false, source: "network" });
  });

  it("retries on failure with backoff and succeeds", async () => {
    let calls = 0;
    const r = await cachedFetch(
      "k2",
      async () => {
        calls += 1;
        if (calls < 2) throw new Error("flaky");
        return "ok";
      },
      { retries: 2, baseDelayMs: 1 },
    );
    expect(calls).toBe(2);
    expect(r.data).toBe("ok");
    expect(r.stale).toBe(false);
  });

  it("falls back to cache when network exhausts retries", async () => {
    await cachedFetch("k3", async () => ({ n: 1 }));
    const r = await cachedFetch(
      "k3",
      async () => {
        throw new Error("offline");
      },
      { retries: 0, staleAfterMs: 0 },
    );
    expect(r.source).toBe("cache");
    expect(r.stale).toBe(true);
    expect(r.data).toEqual({ n: 1 });
  });

  it("throws OfflineDataError when cache is too old", async () => {
    await cachedFetch("k4", async () => 1);
    await expect(
      cachedFetch(
        "k4",
        async () => {
          throw new Error("offline");
        },
        { retries: 0, maxStaleMs: -1 },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("invalidate() drops a single key", async () => {
    await cachedFetch("k5", async () => 1);
    invalidate("k5");
    await expect(
      cachedFetch(
        "k5",
        async () => {
          throw new Error("offline");
        },
        { retries: 0 },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("invalidatePrefix() drops all matching keys", async () => {
    await cachedFetch("journeys:a", async () => 1);
    await cachedFetch("journeys:b", async () => 2);
    invalidatePrefix("journeys:");
    await expect(
      cachedFetch("journeys:a", async () => { throw new Error(); }, { retries: 0 }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("OfflineDataError", () => {
  it("includes the key name", () => {
    const e = new OfflineDataError("foo");
    expect(e.message).toContain("foo");
    expect(e.name).toBe("OfflineDataError");
  });
});
