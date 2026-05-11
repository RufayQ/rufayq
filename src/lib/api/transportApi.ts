/**
 * transportApi — DB-canonical wrapper around transport_tickets.
 *
 * Existing src/lib/transportStore.ts implements the legacy device-only path
 * used by useTransportTimeline. This module exposes the new patient-anchored
 * contract (validate → DB → cache → audit) used by ScannerWizard and any
 * new UI built post-Phase-2.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { ensurePatient, logAudit } from "./patientDataApi";
import {
  readCache,
  writeCache,
  filterAlive,
  writeLastSyncedAt,
  type PatientKey,
} from "@/lib/sync/cacheStore";

export interface TransportTicketRow {
  id: string;
  patient_id: string | null;
  user_id: string | null;
  device_id: string | null;
  client_generated_id: string | null;
  document_type: string;
  trip_type: string;
  passenger_name: string | null;
  passenger_passport: string | null;
  booking_reference: string | null;
  source: string;
  sync_status: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const ENTITY = "transport_tickets";
const AUDIT_ENTITY = "transport_ticket";

async function ctx() {
  const deviceId = getDeviceId();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const patientId = await ensurePatient();
  const cacheKey: PatientKey = patientId || userId || deviceId;
  return { deviceId, userId, patientId, cacheKey };
}

export async function listTransportTickets(): Promise<TransportTicketRow[]> {
  const { patientId, cacheKey } = await ctx();
  const { data, error } = await (supabase as any)
    .from("transport_tickets")
    .select("*")
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as TransportTicketRow[];
  writeCache(cacheKey, ENTITY, rows);
  writeLastSyncedAt(cacheKey, ENTITY);
  return rows;
}

export async function saveTransportTicket(
  input: Partial<TransportTicketRow> & {
    trip_type: string;
    document_type?: string;
    client_generated_id?: string;
  },
  segments?: Array<Record<string, unknown>>,
): Promise<TransportTicketRow> {
  if (!input.trip_type) throw new Error("trip_type is required");
  const { deviceId, userId, patientId, cacheKey } = await ctx();
  const payload: any = {
    ...input,
    document_type: input.document_type ?? "flight_ticket",
    patient_id: patientId,
    user_id: userId,
    device_id: deviceId,
    sync_status: "synced",
  };

  let row: TransportTicketRow;
  if (input.id) {
    const { data, error } = await (supabase as any)
      .from("transport_tickets")
      .update(payload)
      .eq("id", input.id)
      .eq("patient_id", patientId)
      .select("*")
      .single();
    if (error) throw error;
    row = data;
  } else {
    const { data, error } = await (supabase as any)
      .from("transport_tickets")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    row = data;
  }

  if (segments && segments.length) {
    // replace all segments for this ticket atomically (simple delete+insert)
    await (supabase as any)
      .from("transport_flight_segments")
      .delete()
      .eq("ticket_id", row.id)
      .eq("patient_id", patientId);
    const segPayload = segments.map((s) => ({
      ...s,
      ticket_id: row.id,
      patient_id: patientId,
    }));
    const { error: segErr } = await (supabase as any)
      .from("transport_flight_segments")
      .insert(segPayload);
    if (segErr) throw segErr;
  }

  // cache after DB success
  const current = readCache<TransportTicketRow>(cacheKey, ENTITY);
  const next = filterAlive([row, ...current.filter((r) => r.id !== row.id)]);
  writeCache(cacheKey, ENTITY, next);

  await logAudit({
    patientId,
    entityType: AUDIT_ENTITY,
    entityId: row.id,
    action: input.id ? "entity_updated" : "entity_created",
  });
  return row;
}

export async function removeTransportTicket(id: string): Promise<void> {
  const { patientId, cacheKey } = await ctx();
  const { error } = await (supabase as any)
    .from("transport_tickets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw error;
  const current = readCache<TransportTicketRow>(cacheKey, ENTITY);
  writeCache(cacheKey, ENTITY, current.filter((r) => r.id !== id));
  await logAudit({
    patientId,
    entityType: AUDIT_ENTITY,
    entityId: id,
    action: "entity_deleted",
  });
}

export const transportApi = {
  list: listTransportTickets,
  save: saveTransportTicket,
  remove: removeTransportTicket,
};
