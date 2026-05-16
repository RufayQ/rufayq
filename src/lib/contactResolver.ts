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
  const initials = name.trim().slice(0, 1).toUpperCase() || "?";

  return { name, nameAr, avatarUrl, initials, source, otherDeviceId };
}
