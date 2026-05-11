/**
 * Generic factory for patient-data domain APIs.
 *
 * Each call follows the canonical contract:
 *   1. validate input
 *   2. require/resolve patient_id
 *   3. write to DB (DB is source of truth — errors surface)
 *   4. on success: update cache (filtered to deleted_at IS NULL)
 *   5. write audit log
 *   6. return the canonical DB row
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import {
  readCache,
  writeCache,
  filterAlive,
  writeLastSyncedAt,
  readLastSyncedAt,
  type PatientKey,
} from "@/lib/sync/cacheStore";
import { ensurePatient, logAudit } from "@/lib/api/patientDataApi";

export interface DomainConfig<Row extends { id: string; deleted_at?: string | null }> {
  /** Supabase table name */
  table: string;
  /** Cache namespace (entity key) */
  entity: string;
  /** Audit entity_type label */
  auditEntity: string;
  /** Optional client-side validator. Throw on invalid input. */
  validate?: (input: Partial<Row>) => void;
  /** Optional select projection */
  select?: string;
  /** Optional default order column */
  orderBy?: { column: string; ascending?: boolean };
}

export function createDomainApi<
  Row extends { id: string; deleted_at?: string | null; patient_id?: string | null; user_id?: string | null; device_id?: string | null; client_generated_id?: string | null }
>(cfg: DomainConfig<Row>) {
  const select = cfg.select ?? "*";

  async function ctx() {
    const deviceId = getDeviceId();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;
    const patientId = await ensurePatient();
    const cacheKey: PatientKey = patientId || userId || deviceId;
    return { deviceId, userId, patientId, cacheKey };
  }

  async function list(): Promise<Row[]> {
    const { patientId, cacheKey } = await ctx();
    const q = (supabase as any)
      .from(cfg.table)
      .select(select)
      .is("deleted_at", null)
      .eq("patient_id", patientId);
    const { data, error } = cfg.orderBy
      ? await q.order(cfg.orderBy.column, { ascending: cfg.orderBy.ascending ?? true })
      : await q;
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    writeCache(cacheKey, cfg.entity, rows);
    writeLastSyncedAt(cacheKey, cfg.entity);
    return rows;
  }

  function listCached(): Row[] {
    const deviceId = getDeviceId();
    // Best-effort cache read; used for instant paint before DB call.
    // We try patient-id-based key opportunistically by scanning known prefixes.
    const candidates = [deviceId];
    for (const k of candidates) {
      const cached = readCache<Row>(k, cfg.entity);
      if (cached.length) return filterAlive(cached);
    }
    return [];
  }

  async function save(input: Partial<Row> & { id?: string }): Promise<Row> {
    cfg.validate?.(input);
    const { deviceId, userId, patientId, cacheKey } = await ctx();
    const payload: any = {
      ...input,
      patient_id: patientId,
      user_id: userId,
      device_id: deviceId,
      sync_status: "synced",
      updated_at: new Date().toISOString(),
    };
    // upsert: rely on id when provided, else insert
    let dbRow: Row | null = null;
    if (input.id) {
      const { data, error } = await (supabase as any)
        .from(cfg.table)
        .update(payload)
        .eq("id", input.id)
        .select(select)
        .single();
      if (error) throw error;
      dbRow = data as Row;
    } else {
      const { data, error } = await (supabase as any)
        .from(cfg.table)
        .insert(payload)
        .select(select)
        .single();
      if (error) throw error;
      dbRow = data as Row;
    }
    if (!dbRow) throw new Error(`${cfg.table}.save: no row returned`);

    // Cache update only after DB success.
    const current = readCache<Row>(cacheKey, cfg.entity);
    const next = filterAlive([dbRow, ...current.filter((r) => r.id !== dbRow!.id)]);
    writeCache(cacheKey, cfg.entity, next);

    await logAudit({
      patientId,
      entityType: cfg.auditEntity,
      entityId: dbRow.id,
      action: input.id ? "entity_updated" : "entity_created",
    });
    return dbRow;
  }

  async function remove(id: string): Promise<void> {
    const { patientId, cacheKey } = await ctx();
    const { error } = await (supabase as any)
      .from(cfg.table)
      .update({ deleted_at: new Date().toISOString(), sync_status: "synced" })
      .eq("id", id);
    if (error) throw error;

    const current = readCache<Row>(cacheKey, cfg.entity);
    writeCache(cacheKey, cfg.entity, current.filter((r) => r.id !== id));

    await logAudit({
      patientId,
      entityType: cfg.auditEntity,
      entityId: id,
      action: "entity_deleted",
    });
  }

  function lastSyncedAt(): string | null {
    const deviceId = getDeviceId();
    return readLastSyncedAt(deviceId, cfg.entity);
  }

  return { list, listCached, save, remove, lastSyncedAt, ctx };
}
