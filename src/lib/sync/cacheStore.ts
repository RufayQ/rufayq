/**
 * Generic namespaced localStorage cache for patient data domains.
 *
 * Architecture:
 *   - DB is the source of truth.
 *   - Cache is read-through / write-through, used only to repaint the UI
 *     instantly while a background fetch refreshes the canonical state.
 *   - Cache key is namespaced per patient + entity:
 *       rufayq:{patientKey}:{entity}:v1
 *     where `patientKey` is the active patient_id when known, falling
 *     back to the device_id for guests.
 *   - Soft-deleted rows are NEVER cached (callers strip them first).
 */

const CACHE_VERSION = "v1";

export type PatientKey = string; // patient_id OR device_id

export const cacheKeyFor = (patientKey: PatientKey, entity: string): string =>
  `rufayq:${patientKey}:${entity}:${CACHE_VERSION}`;

export function readCache<T>(patientKey: PatientKey, entity: string): T[] {
  if (typeof window === "undefined" || !patientKey) return [];
  try {
    const raw = window.localStorage.getItem(cacheKeyFor(patientKey, entity));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    console.warn("[cacheStore] read failed", entity, e);
    return [];
  }
}

export function writeCache<T>(
  patientKey: PatientKey,
  entity: string,
  rows: T[],
): void {
  if (typeof window === "undefined" || !patientKey) return;
  try {
    window.localStorage.setItem(
      cacheKeyFor(patientKey, entity),
      JSON.stringify(rows),
    );
  } catch (e) {
    console.warn("[cacheStore] write failed", entity, e);
  }
}

export function clearCache(patientKey: PatientKey, entity: string): void {
  if (typeof window === "undefined" || !patientKey) return;
  try {
    window.localStorage.removeItem(cacheKeyFor(patientKey, entity));
  } catch {
    /* noop */
  }
}

/** Strip rows that are soft-deleted (defense in depth). */
export const filterAlive = <T extends { deletedAt?: string | null }>(
  rows: T[],
): T[] => rows.filter((r) => !r.deletedAt);

/**
 * Last-synced timestamp, per patient+entity. Used by the UI to render
 * "Last synced HH:MM" and to drive pull-to-refresh staleness checks.
 */
const tsKey = (p: PatientKey, e: string) => `rufayq:${p}:${e}:lastSync`;

export function readLastSyncedAt(patientKey: PatientKey, entity: string): string | null {
  if (typeof window === "undefined" || !patientKey) return null;
  try {
    return window.localStorage.getItem(tsKey(patientKey, entity));
  } catch {
    return null;
  }
}

export function writeLastSyncedAt(patientKey: PatientKey, entity: string): string {
  const ts = new Date().toISOString();
  if (typeof window === "undefined" || !patientKey) return ts;
  try {
    window.localStorage.setItem(tsKey(patientKey, entity), ts);
  } catch {
    /* noop */
  }
  return ts;
}
