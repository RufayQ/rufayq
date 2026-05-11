/**
 * patientDataApi — central bootstrap, claim, and audit utilities.
 *
 * - ensurePatient(): idempotent. Returns the active patient_id for the
 *   current session (auth user OR guest device).
 * - claimGuestPatientData(): SECURITY DEFINER RPC that atomically reassigns
 *   every guest row on a device to the signed-in user across all domain
 *   tables. Returns counts per table.
 * - logAudit(): write a row into patient_data_audit_log via API path
 *   (we never trust DB triggers here so device_id is always captured).
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface BootstrapResult {
  patientId: string;
  userId: string | null;
  deviceId: string;
  claimed?: Record<string, number>;
}

export async function ensurePatient(): Promise<string> {
  const deviceId = getDeviceId();
  const { data, error } = await (supabase as any).rpc("ensure_patient", {
    _device_id: deviceId,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("ensure_patient: invalid response");
  return data;
}

export async function claimGuestPatientData(): Promise<Record<string, number> | null> {
  const deviceId = getDeviceId();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await (supabase as any).rpc(
    "claim_guest_patient_data",
    { _device_id: deviceId },
  );
  if (error) {
    console.warn("[patientDataApi] claim failed", error);
    return null;
  }
  return (data?.claimed ?? {}) as Record<string, number>;
}

/**
 * Bootstrap the patient session. Safe to call on every auth-state change.
 * 1. Detect device + auth.
 * 2. If signed in, claim any guest rows.
 * 3. Resolve / create the active patient row.
 */
export async function bootstrapPatientData(): Promise<BootstrapResult> {
  const deviceId = getDeviceId();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  let claimed: Record<string, number> | null = null;
  if (userId) {
    claimed = await claimGuestPatientData();
  }
  const patientId = await ensurePatient();

  return {
    patientId,
    userId,
    deviceId,
    claimed: claimed ?? undefined,
  };
}

export type AuditAction =
  | "patient_data_bootstrap_started"
  | "patient_data_bootstrap_completed"
  | "local_cache_backfilled_to_db"
  | "entity_created"
  | "entity_updated"
  | "entity_deleted"
  | "entity_sync_failed"
  | "entity_sync_conflict"
  | "file_uploaded"
  | "file_downloaded";

export async function logAudit(params: {
  patientId: string | null;
  entityType: string;
  entityId?: string | null;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const deviceId = getDeviceId();
  const { data: auth } = await supabase.auth.getUser();
  try {
    await (supabase as any).from("patient_data_audit_log").insert({
      patient_id: params.patientId,
      user_id: auth.user?.id ?? null,
      device_id: deviceId,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      action: params.action,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    // Never let audit failures break the user flow.
    console.warn("[patientDataApi] audit log failed", e);
  }
}
