/**
 * Push notifications — end-to-end registration + handler.
 *
 * Flow on Android (FCM):
 *   1. App calls `registerPush()` once after sign-in + role selection.
 *   2. Plugin requests POST_NOTIFICATIONS permission (API 33+).
 *   3. On success the device receives an FCM token, which we POST to the
 *      backend (`device_push_tokens` table) so server-side jobs (medication
 *      reminders, journey alerts, refund status) can target the device.
 *   4. Foreground messages → in-app sonner toast.
 *      Background taps → routed via deep-link handler if `data.url` is set.
 *
 * Web is a no-op — the existing `NotificationBell` covers in-app inbox.
 */
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from "@capacitor/push-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, platform } from "./index";
import { parseDeepLink, type DeepLinkTarget } from "./deepLinks";
import { getDeviceId } from "@/hooks/useDeviceId";

let registered = false;

export async function registerPush(opts: {
  rolePref: "patient" | "doctor";
  onDeepLink?: (t: DeepLinkTarget) => void;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isNative) return { ok: false, reason: "web" };
  if (registered) return { ok: true };

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return { ok: false, reason: "denied" };

  // One-shot backfill: claim any pre-existing rows for this user+platform that
  // were inserted before `device_id` existed. Safe because IS NULL guard means
  // we never overwrite another device's claim.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("device_push_tokens")
        .update({ device_id: getDeviceId() })
        .eq("user_id", session.user.id)
        .eq("platform", platform)
        .is("device_id", null);
    }
  } catch (e) {
    console.warn("[push] device_id backfill failed", e);
  }

  await PushNotifications.register();
  registered = true;

  PushNotifications.addListener("registration", async (token: Token) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("device_push_tokens").upsert(
      {
        user_id: session.user.id,
        device_id: getDeviceId(),
        token: token.value,
        platform,
        role_pref: opts.rolePref,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("[push] registration failed", err);
  });

  PushNotifications.addListener(
    "pushNotificationReceived",
    (notif: PushNotificationSchema) => {
      toast(notif.title ?? "Rufayq", {
        description: notif.body,
        duration: 5000,
      });
    },
  );

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      const url = (action.notification.data as { url?: string })?.url;
      if (!url || !opts.onDeepLink) return;
      const target = parseDeepLink(url);
      if (target) opts.onDeepLink(target);
    },
  );

  return { ok: true };
}
