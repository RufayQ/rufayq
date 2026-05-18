/**
 * Lounge membership store (Dragonpass, Priority Pass, Visa Airport Companion,
 * Mastercard Travel Pass, LoungeKey, etc.) persisted in Lovable Cloud so cards
 * survive logout, browser changes, and new devices, and so they reflect in
 * Records → Travel → Lounge for the same user/device.
 *
 * Public API (kept stable so existing components don't need to change):
 *   listLoungeMemberships(): LoungeMembership[]        — synchronous cache read
 *   saveLoungeMembership(input)                        — upsert (optimistic)
 *   deleteLoungeMembership(id)                         — delete (optimistic)
 *   subscribeLoungeMemberships(fn) => unsubscribe      — fires on any change
 *   fetchLoungeMemberships(): Promise<LoungeMembership[]>  — pulls from DB
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

const LEGACY_KEY = "rufayq_lounge_memberships_v1";
const MIGRATION_FLAG = "rufayq_lounge_memberships_migrated_v1";

export interface LoungeMembership {
  id: string;
  program: string;
  membershipNumber: string;
  cardholderName: string;
  cardLast4?: string;
  expiresOn?: string;       // YYYY-MM-DD
  linkedSegmentId?: string;
  notes?: string;
  qrSecret?: string;            // number after "=" in the DragonPass QR
  entitlementRefreshOn?: string; // YYYY-MM-DD — "Entitlement refresh" date
  qrImageUrl?: string;          // optional user-uploaded QR image (data URL or remote URL)
  createdAt: string;        // ISO
}

let cache: LoungeMembership[] = [];
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

type DbRow = {
  id: string;
  program: string;
  membership_number: string;
  cardholder_name: string;
  card_last4: string | null;
  expires_on: string | null;
  linked_segment_id: string | null;
  notes: string | null;
  qr_secret: string | null;
  entitlement_refresh_on: string | null;
  qr_image_url: string | null;
  created_at: string;
  deleted_at: string | null;
};

const rowToMembership = (r: DbRow): LoungeMembership => ({
  id: r.id,
  program: r.program,
  membershipNumber: r.membership_number,
  cardholderName: r.cardholder_name,
  cardLast4: r.card_last4 ?? undefined,
  expiresOn: r.expires_on ?? undefined,
  linkedSegmentId: r.linked_segment_id ?? undefined,
  notes: r.notes ?? undefined,
  qrSecret: r.qr_secret ?? undefined,
  entitlementRefreshOn: r.entitlement_refresh_on ?? undefined,
  qrImageUrl: r.qr_image_url ?? undefined,
  createdAt: r.created_at,
});

const ensureRealtime = () => {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("lounge-memberships")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lounge_memberships" },
      () => { void fetchLoungeMemberships(); },
    )
    .subscribe();
};

/** Returns whatever is in memory right now (cache-first paint). */
export const listLoungeMemberships = (): LoungeMembership[] => cache;

/** Pulls fresh rows from the DB and updates cache + listeners. Idempotent. */
export const fetchLoungeMemberships = async (): Promise<LoungeMembership[]> => {
  ensureRealtime();
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    const deviceId = getDeviceId();

    let q = supabase
      .from("lounge_memberships")
      .select("*")
      .is("deleted_at", null);

    if (userId) {
      q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
    } else {
      q = q.is("user_id", null).eq("device_id", deviceId);
    }

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;

    // One-shot migration: push any pre-existing localStorage rows up to the DB
    // the first time we successfully fetch. Then clear the legacy key.
    await migrateLegacyIfNeeded(userId, deviceId, (data ?? []) as DbRow[]);

    // Refetch after migration in case we inserted new rows.
    const refetch = await supabase
      .from("lounge_memberships")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const rows = (refetch.data ?? data ?? []) as DbRow[];

    cache = rows.map(rowToMembership);
    notify();
    return cache;
  } catch (e) {
    console.warn("[loungeMemberships] fetch failed", e);
    return cache;
  }
};

const migrateLegacyIfNeeded = async (
  userId: string | null,
  deviceId: string,
  existingDbRows: DbRow[],
) => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
  let legacy: LoungeMembership[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    legacy = raw ? (JSON.parse(raw) as LoungeMembership[]) : [];
  } catch { legacy = []; }
  if (legacy.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, "1");
    return;
  }
  const existingNumbers = new Set(existingDbRows.map((r) => r.membership_number));
  const toInsert = legacy
    .filter((l) => !existingNumbers.has(l.membershipNumber))
    .map((l) => ({
      user_id: userId,
      device_id: deviceId,
      program: l.program,
      membership_number: l.membershipNumber,
      cardholder_name: l.cardholderName,
      card_last4: l.cardLast4 ?? null,
      expires_on: l.expiresOn ?? null,
      linked_segment_id: l.linkedSegmentId ?? null,
      notes: l.notes ?? null,
    }));
  if (toInsert.length > 0) {
    const { error } = await supabase.from("lounge_memberships").insert(toInsert);
    if (error) {
      console.warn("[loungeMemberships] legacy migration failed", error);
      return; // keep legacy + flag unset so we retry next launch
    }
  }
  localStorage.setItem(MIGRATION_FLAG, "1");
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* noop */ }
};

export const subscribeLoungeMemberships = (fn: () => void) => {
  listeners.add(fn);
  ensureRealtime();
  return () => { listeners.delete(fn); };
};

export const saveLoungeMembership = async (
  input: Omit<LoungeMembership, "id" | "createdAt"> & { id?: string },
): Promise<LoungeMembership> => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  const deviceId = getDeviceId();

  const payload = {
    program: input.program,
    membership_number: input.membershipNumber,
    cardholder_name: input.cardholderName,
    card_last4: input.cardLast4 ?? null,
    expires_on: input.expiresOn ?? null,
    linked_segment_id: input.linkedSegmentId ?? null,
    notes: input.notes ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("lounge_memberships")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw error;
    const row = rowToMembership(data as DbRow);
    cache = [row, ...cache.filter((c) => c.id !== row.id)];
    notify();
    return row;
  }

  const { data, error } = await supabase
    .from("lounge_memberships")
    .insert({ ...payload, user_id: userId, device_id: deviceId })
    .select()
    .single();
  if (error) throw error;
  const row = rowToMembership(data as DbRow);
  cache = [row, ...cache];
  notify();
  return row;
};

export const deleteLoungeMembership = async (id: string): Promise<void> => {
  const snapshot = cache;
  cache = cache.filter((c) => c.id !== id);
  notify();
  const { error } = await supabase
    .from("lounge_memberships")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    cache = snapshot;
    notify();
    throw error;
  }
};
