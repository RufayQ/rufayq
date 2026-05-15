/**
 * Flight draft store — local-first with best-effort cloud sync.
 *
 * Persists in-progress manual flight entries so the user can recover after
 * closing the sheet, navigating away, or losing focus.
 *
 *   - localStorage is the source of truth on the device (always available,
 *     works offline, no auth required).
 *   - When the user is signed in, every save also upserts into the
 *     `flight_drafts` table so the same draft is recoverable on another
 *     device. Cloud failures are silent — they never block the UX.
 *
 * Schema:
 *   key:   rufayq.flight_draft.<draftId>
 *   value: FlightDraft (see below)
 *   index: rufayq.flight_drafts.index = DraftIndexEntry[]
 */
import { supabase } from "@/integrations/supabase/client";
import type { FlightSegment } from "@/lib/transportTickets";

export type TravelerKind = "patient" | "companion" | "family";
export type TripMode = "one-way" | "round-trip";

export interface FlightDraft {
  version: 1;
  mode: TripMode;
  outboundSegments: FlightSegment[];
  returnSegments: FlightSegment[];
  passenger?: { name?: string; passport?: string };
  traveler: TravelerKind;
  updatedAt: string; // ISO
}

export interface DraftIndexEntry {
  draftId: string;
  label: string;
  updatedAt: string;
}

const KEY = (id: string) => `rufayq.flight_draft.${id}`;
const INDEX_KEY = "rufayq.flight_drafts.index";

const safeJSONParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
};

const readIndex = (): DraftIndexEntry[] => {
  if (typeof window === "undefined") return [];
  return safeJSONParse<DraftIndexEntry[]>(localStorage.getItem(INDEX_KEY)) ?? [];
};

const writeIndex = (entries: DraftIndexEntry[]) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(entries)); } catch { /* quota — ignore */ }
};

const upsertIndex = (id: string, label: string, updatedAt: string) => {
  const idx = readIndex().filter(e => e.draftId !== id);
  idx.unshift({ draftId: id, label, updatedAt });
  writeIndex(idx.slice(0, 20));
};

const removeFromIndex = (id: string) => {
  writeIndex(readIndex().filter(e => e.draftId !== id));
};

const buildLabel = (data: FlightDraft): string => {
  const first = data.outboundSegments?.[0];
  const last = data.outboundSegments?.[data.outboundSegments.length - 1];
  const from = first?.fromAirport?.code || "?";
  const to = last?.toAirport?.code || "?";
  return `${from} → ${to}`;
};

const cloudUpsert = async (id: string, data: FlightDraft, label: string) => {
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return;
    await supabase.from("flight_drafts" as any).upsert({
      id,
      user_id: userId,
      label,
      payload: data as any,
    });
  } catch (e) {
    // Best-effort sync — never disturb the UX
    console.debug("[flightDraftStore] cloud upsert failed", e);
  }
};

const cloudDelete = async (id: string) => {
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return;
    await supabase.from("flight_drafts" as any).delete().eq("user_id", userId).eq("id", id);
  } catch (e) {
    console.debug("[flightDraftStore] cloud delete failed", e);
  }
};

const cloudFetch = async (id: string): Promise<FlightDraft | null> => {
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return null;
    const { data, error } = await supabase
      .from("flight_drafts" as any)
      .select("payload, updated_at")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return (data as any).payload as FlightDraft;
  } catch {
    return null;
  }
};

/** Read a draft from localStorage (synchronous for instant hydration). */
export const loadDraft = (id: string): FlightDraft | null => {
  if (typeof window === "undefined") return null;
  return safeJSONParse<FlightDraft>(localStorage.getItem(KEY(id)));
};

/** Best-effort fetch from the cloud; falls back to local. */
export const loadDraftRemoteFirst = async (id: string): Promise<FlightDraft | null> => {
  const local = loadDraft(id);
  const remote = await cloudFetch(id);
  if (!remote) return local;
  if (!local) return remote;
  // Newer wins
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
};

/** Write the snapshot locally, fire-and-forget cloud upsert. */
export const saveDraft = (id: string, data: Omit<FlightDraft, "version" | "updatedAt">) => {
  if (typeof window === "undefined") return;
  const snapshot: FlightDraft = {
    ...data,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY(id), JSON.stringify(snapshot));
    const label = buildLabel(snapshot);
    upsertIndex(id, label, snapshot.updatedAt);
    void cloudUpsert(id, snapshot, label);
  } catch (e) {
    console.debug("[flightDraftStore] local save failed", e);
  }
};

export const clearDraft = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY(id));
    removeFromIndex(id);
    void cloudDelete(id);
  } catch { /* ignore */ }
};

export const listDrafts = (): DraftIndexEntry[] => readIndex();
