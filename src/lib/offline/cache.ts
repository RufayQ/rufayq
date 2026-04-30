/**
 * Offline-tolerant data cache (no service worker).
 *
 * Provides `cachedFetch(key, fetcher, opts)` for screens that should keep
 * working when connectivity drops:
 *   - Fresh result → returned + cached.
 *   - Network failure within `staleAfterMs` → cached payload returned with
 *     `{ stale: true }` so the UI can show a banner.
 *   - Network failure beyond `maxStaleMs` → throws; caller decides.
 *   - Retries with exponential backoff (`retries`, `baseDelayMs`).
 *
 * Storage tiers:
 *   - In-memory map (per tab, fastest).
 *   - sessionStorage (survives reload, cleared on tab close — safe for
 *     clinical data).
 *
 * We deliberately do NOT use localStorage or IndexedDB — leaving medical
 * data on disk indefinitely is not acceptable for this app.
 */

const MEM = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = "rufayq.cache.v1.";

interface CacheEntry<T> {
  value: T;
  ts: number; // epoch ms
}

export interface CachedResult<T> {
  data: T;
  stale: boolean;
  ageMs: number;
  source: "network" | "cache";
}

export interface CachedFetchOpts {
  /** Below this age, cache is considered fresh and returned without warning. */
  staleAfterMs?: number;
  /** Beyond this age, cache is discarded and an offline error is thrown. */
  maxStaleMs?: number;
  /** Network retry attempts (default 2). */
  retries?: number;
  /** Initial backoff in ms (default 400). Doubled per retry. */
  baseDelayMs?: number;
  /** Cancellation. */
  signal?: AbortSignal;
}

const DEFAULTS: Required<Omit<CachedFetchOpts, "signal">> = {
  staleAfterMs: 60_000,        // 1 min — UI shows nothing
  maxStaleMs: 24 * 3_600_000,  // 24 h — beyond this, we refuse
  retries: 2,
  baseDelayMs: 400,
};

function readStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, entry: CacheEntry<T>): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode — silently degrade */
  }
}

function readCache<T>(key: string): CacheEntry<T> | null {
  return (MEM.get(key) as CacheEntry<T> | undefined) ?? readStorage<T>(key);
}

function writeCache<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { value, ts: Date.now() };
  MEM.set(key, entry);
  writeStorage(key, entry);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

export class OfflineDataError extends Error {
  constructor(public readonly key: string) {
    super(`No offline data available for "${key}"`);
    this.name = "OfflineDataError";
  }
}

/** Force-invalidate one key (e.g. after a mutation). */
export function invalidate(key: string): void {
  MEM.delete(key);
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Drop every cached entry — used on sign-out to avoid cross-account leaks. */
export function clearAll(): void {
  MEM.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Drop all entries whose key starts with `prefix`. */
export function invalidatePrefix(prefix: string): void {
  for (const k of MEM.keys()) if (k.startsWith(prefix)) MEM.delete(k);
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX + prefix))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Fetch with offline fallback + retry.
 *
 * @example
 *   const { data, stale, ageMs } = await cachedFetch(
 *     `journeys:${userId}`,
 *     () => journeysClient.list(userId),
 *     { staleAfterMs: 30_000 },
 *   );
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: CachedFetchOpts = {},
): Promise<CachedResult<T>> {
  const cfg = { ...DEFAULTS, ...opts };
  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= cfg.retries) {
    if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");
    try {
      const value = await fetcher();
      writeCache(key, value);
      return { data: value, stale: false, ageMs: 0, source: "network" };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > cfg.retries) break;
      await sleep(cfg.baseDelayMs * 2 ** (attempt - 1), opts.signal);
    }
  }

  // Network exhausted → try cache.
  const cached = readCache<T>(key);
  if (cached) {
    const ageMs = Date.now() - cached.ts;
    if (ageMs <= cfg.maxStaleMs) {
      return {
        data: cached.value,
        stale: ageMs > cfg.staleAfterMs,
        ageMs,
        source: "cache",
      };
    }
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new OfflineDataError(key);
}
