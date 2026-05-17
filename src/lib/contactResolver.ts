import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export type ResolvedContact = {
  name: string;
  nameAr: string | null;
  avatarUrl: string | null;
  initials: string;
  source: "upload" | "google" | "initials";
  otherDeviceId: string | null;
};

/**
 * Resolve the other participant of a chat thread for display in
 * Contact info, chat header and inbox row. Avatar priority:
 *   1. profiles.avatar_url  (user-uploaded)
 *   2. profiles.google_picture_url  (linked Google account)
 *   3. initials fallback
 *
 * Name priority: chat_participants.display_name → profiles.full_name_en
 *   → profiles.rufayq_id → "Conversation".
 */
export async function resolveContact(
  threadId: string,
  kind: "direct" | "provider",
): Promise<ResolvedContact> {
  const me = getDeviceId();
  const { data: parts } = await supabase
    .from("chat_participants")
    .select("device_id, display_name")
    .eq("thread_id", threadId);

  const other = (parts ?? []).find((p) => p.device_id && p.device_id !== me);
  const otherDeviceId = other?.device_id ?? null;
  let name = other?.display_name ?? "";
  let nameAr: string | null = null;
  let rufayqId: string | null = null;
  let avatarUrl: string | null = null;
  let source: ResolvedContact["source"] = "initials";

  if (otherDeviceId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name_en, full_name_ar, rufayq_id, avatar_url, google_picture_url")
      .eq("device_id", otherDeviceId)
      .maybeSingle();
    if (profile) {
      if (!name) name = profile.full_name_en ?? profile.rufayq_id ?? "";
      nameAr = profile.full_name_ar ?? null;
      rufayqId = profile.rufayq_id ?? null;
      if (profile.avatar_url) {
        avatarUrl = profile.avatar_url;
        source = "upload";
      } else if (profile.google_picture_url) {
        avatarUrl = profile.google_picture_url;
        source = "google";
      }
    }
  }

  if (!name) name = kind === "provider" ? "Care provider" : "Conversation";
  const initials = computeInitials(name, nameAr, rufayqId, otherDeviceId);

  return { name, nameAr, avatarUrl, initials, source, otherDeviceId };
}

/**
 * Always returns 1–2 readable letters for an avatar fallback. Used both by
 * resolved chat threads and by raw people-search results.
 *
 * Tries, in order: name (EN) → nameAr → rufayqId → deviceId → "?".
 * Strips emoji, digits and punctuation so we never render junk inside the
 * circle (e.g. `🌙 Dr. Sara` → `DS`, `أحمد محمد` → `أم`, `!!!` → rufayq_id
 * letters, falling all the way to device-id hash if needed).
 *
 * Exported so search results, contact suggestions, etc. share the exact
 * same fallback chain as the inbox.
 */
export function computeInitialsFrom(args: {
  name?: string | null;
  nameAr?: string | null;
  rufayqId?: string | null;
  deviceId?: string | null;
}): string {
  const LETTER = /\p{L}/u;
  const cleanWords = (s: string) =>
    s
      .normalize("NFKD")
      .split(/[\s._\-]+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter((w) => w.length > 0 && LETTER.test(w));

  const fromWords = (s: string): string => {
    const words = cleanWords(s);
    if (words.length === 0) return "";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const GENERIC = new Set(["conversation", "careprovider", "care provider", "user", "unknown"]);
  const name = (args.name ?? "").trim();
  if (name && !GENERIC.has(name.toLowerCase())) {
    const ini = fromWords(name);
    if (ini) return ini;
  }
  if (args.nameAr) {
    const ini = fromWords(args.nameAr);
    if (ini) return ini;
  }
  if (args.rufayqId) {
    const letters = args.rufayqId.replace(/[^\p{L}]/gu, "");
    if (letters) return letters.slice(0, 2).toUpperCase();
    const alnum = args.rufayqId.replace(/[^\p{L}\p{N}]/gu, "");
    if (alnum) return alnum.slice(0, 2).toUpperCase();
  }
  if (args.deviceId) {
    const hex = args.deviceId.replace(/[^a-zA-Z0-9]/g, "");
    if (hex) return hex.slice(0, 2).toUpperCase();
  }
  // Last resort: any letter at all in the original (possibly generic) name.
  const anyLetter = name.match(/\p{L}/u)?.[0];
  return (anyLetter ?? "?").toUpperCase();
}

function computeInitials(
  name: string,
  nameAr: string | null,
  rufayqId: string | null,
  deviceId: string | null,
): string {
  return computeInitialsFrom({ name, nameAr, rufayqId, deviceId });
}
