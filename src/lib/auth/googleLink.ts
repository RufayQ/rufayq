/**
 * On every Supabase auth change, if the active session was established via
 * Google OAuth, persist the Google linkage onto the user's `profiles` row
 * (keyed by device_id `auth_${userId}`) so the link survives across devices.
 *
 * Idempotent — only writes when the stored values differ from the session.
 */
import { supabase } from "@/integrations/supabase/client";

export async function syncGoogleLinkage(userId: string): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user || user.id !== userId) return;

    const identities = (user.identities || []) as Array<{
      provider: string;
      identity_data?: Record<string, any>;
      id?: string;
    }>;
    const providers = Array.from(new Set(identities.map((i) => i.provider).filter(Boolean)));
    const google = identities.find((i) => i.provider === "google");

    const deviceId = `auth_${userId}`;
    try { localStorage.setItem("rufayq_device_id", deviceId); } catch { /* ignore */ }

    const { data: existing } = await supabase
      .from("profiles")
      .select("device_id, google_sub, google_email, auth_providers")
      .eq("device_id", deviceId)
      .maybeSingle();

    const googleSub = google?.identity_data?.sub || google?.id || null;
    const googleEmail = google?.identity_data?.email || user.email || null;

    const next: Record<string, any> = {
      device_id: deviceId,
      auth_providers: providers,
    };
    if (google) {
      next.google_sub = googleSub;
      next.google_email = googleEmail;
      if (!existing?.google_sub) next.google_linked_at = new Date().toISOString();
    }

    // Skip the write if nothing meaningful changed.
    if (
      existing &&
      existing.google_sub === googleSub &&
      existing.google_email === googleEmail &&
      JSON.stringify(existing.auth_providers || []) === JSON.stringify(providers)
    ) {
      return;
    }

    const { error } = await supabase.from("profiles").upsert(next as any, { onConflict: "device_id" });
    if (error) console.warn("[google-link] upsert failed", error.message);
  } catch (e) {
    console.warn("[google-link] sync error", e);
  }
}
