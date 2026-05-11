/**
 * syncEngine — bootstraps the patient session and coordinates DB↔cache sync.
 *
 * - bootstrap(): claim guest rows on login, ensure patient_id, return context.
 * - refreshAll(): pull every domain from DB into cache.
 * - backfillLegacyLocalStorage(): one-time push of legacy localStorage keys
 *   into DB via the API layer. Legacy keys are marked, never deleted, until
 *   the per-user migration flag is set.
 */
import {
  bootstrapPatientData,
  type BootstrapResult,
  logAudit,
} from "@/lib/api/patientDataApi";
import { medicationApi } from "@/lib/api/medicationApi";
import { medicalRecordApi } from "@/lib/api/medicalRecordApi";
import { appointmentApi } from "@/lib/api/appointmentApi";
import { allergyApi } from "@/lib/api/allergyApi";
import { journeyApi } from "@/lib/api/journeyApi";
import { carePlanApi } from "@/lib/api/carePlanApi";
import { educationApi } from "@/lib/api/educationApi";
import { listTransportTickets } from "@/lib/api/transportApi";

export type EntityRefreshResult = {
  entity: string;
  ok: boolean;
  count?: number;
  error?: string;
};

export async function bootstrap(): Promise<BootstrapResult> {
  await logAudit({
    patientId: null,
    entityType: "patient",
    action: "patient_data_bootstrap_started",
  });
  const result = await bootstrapPatientData();
  await logAudit({
    patientId: result.patientId,
    entityType: "patient",
    action: "patient_data_bootstrap_completed",
    metadata: { claimed: result.claimed ?? null },
  });
  return result;
}

export async function refreshAll(): Promise<EntityRefreshResult[]> {
  const tasks: Array<{ entity: string; run: () => Promise<unknown[]> }> = [
    { entity: "transport_tickets", run: listTransportTickets },
    { entity: "medications", run: medicationApi.list },
    { entity: "medical_records", run: medicalRecordApi.list },
    { entity: "appointments", run: appointmentApi.list },
    { entity: "allergies", run: allergyApi.list },
    { entity: "journeys", run: journeyApi.list },
    { entity: "care_plans", run: carePlanApi.list },
    { entity: "education_progress", run: educationApi.list },
  ];
  const results: EntityRefreshResult[] = [];
  for (const t of tasks) {
    try {
      const rows = await t.run();
      results.push({ entity: t.entity, ok: true, count: rows.length });
    } catch (e: any) {
      console.warn(`[syncEngine] refresh ${t.entity} failed`, e);
      results.push({ entity: t.entity, ok: false, error: e?.message ?? String(e) });
    }
  }
  return results;
}

const BACKFILL_FLAG_PREFIX = "rufayq:backfill-completed:";

/**
 * Backfill known legacy localStorage keys into DB exactly once per user.
 * Legacy keys are NOT deleted here; they remain until DB upsert is confirmed
 * and the migration flag is set. A future cleanup task can remove them.
 */
export async function backfillLegacyLocalStorage(
  ctx: BootstrapResult,
): Promise<{ migrated: Record<string, number>; skipped: boolean }> {
  if (typeof window === "undefined") return { migrated: {}, skipped: true };
  const flagKey = `${BACKFILL_FLAG_PREFIX}${ctx.userId ?? ctx.deviceId}`;
  if (window.localStorage.getItem(flagKey) === "v1") {
    return { migrated: {}, skipped: true };
  }

  const migrated: Record<string, number> = {};

  const tryMigrate = async <T>(
    legacyKey: string,
    parse: (raw: any) => T[],
    push: (item: T) => Promise<unknown>,
    label: string,
  ) => {
    const raw = window.localStorage.getItem(legacyKey);
    if (!raw) return;
    let items: T[] = [];
    try {
      items = parse(JSON.parse(raw));
    } catch {
      return;
    }
    let count = 0;
    for (const item of items) {
      try {
        await push(item);
        count += 1;
      } catch (e) {
        console.warn(`[backfill] ${label} item failed`, e);
      }
    }
    if (count > 0) migrated[label] = count;
  };

  // Known legacy keys. Each parser is defensive: malformed = skip.
  await tryMigrate(
    "rufayq_meds",
    (raw) => (Array.isArray(raw) ? raw : []),
    async (m: any) =>
      medicationApi.save({
        medication_name: String(m.name ?? m.medication_name ?? ""),
        dose: m.dose ?? null,
        frequency: m.frequency ?? null,
        start_date: m.startDate ?? m.start_date ?? null,
        end_date: m.endDate ?? m.end_date ?? null,
        instructions: m.instructions ?? null,
        client_generated_id: m.id ?? null,
        source: "legacy_localstorage",
      } as any),
    "medications",
  );

  await tryMigrate(
    "rufayq_allergies",
    (raw) => (Array.isArray(raw) ? raw : []),
    async (a: any) =>
      allergyApi.save({
        allergen: String(a.allergen ?? a.name ?? ""),
        severity: a.severity ?? null,
        reaction: a.reaction ?? null,
        notes: a.notes ?? null,
        client_generated_id: a.id ?? null,
        source: "legacy_localstorage",
      } as any),
    "allergies",
  );

  await tryMigrate(
    "rufayq_records",
    (raw) => (Array.isArray(raw) ? raw : []),
    async (r: any) =>
      medicalRecordApi.save({
        title: String(r.title ?? "Record"),
        record_type: r.record_type ?? r.type ?? "other",
        record_date: r.record_date ?? r.date ?? null,
        facility_name: r.facility_name ?? r.facility ?? null,
        doctor_name: r.doctor_name ?? r.doctor ?? null,
        extracted_summary: r.summary ?? r.extracted_summary ?? null,
        client_generated_id: r.id ?? null,
        source: "legacy_localstorage",
      } as any),
    "medical_records",
  );

  await tryMigrate(
    "rufayq_appointments",
    (raw) => (Array.isArray(raw) ? raw : []),
    async (a: any) =>
      appointmentApi.save({
        title: String(a.title ?? "Appointment"),
        appointment_type: a.type ?? a.appointment_type ?? null,
        facility_name: a.facility ?? a.facility_name ?? null,
        doctor_name: a.doctor ?? a.doctor_name ?? null,
        location: a.location ?? null,
        start_at: a.startAt ?? a.start_at ?? null,
        end_at: a.endAt ?? a.end_at ?? null,
        notes: a.notes ?? null,
        client_generated_id: a.id ?? null,
        source: "legacy_localstorage",
      } as any),
    "appointments",
  );

  window.localStorage.setItem(flagKey, "v1");
  await logAudit({
    patientId: ctx.patientId,
    entityType: "patient",
    action: "local_cache_backfilled_to_db",
    metadata: { migrated },
  });

  return { migrated, skipped: false };
}
