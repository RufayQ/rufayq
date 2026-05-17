/**
 * Push notifications — end-to-end registration + handler.
 *
 * Hardened: every native call is wrapped so a misconfigured Firebase /
 * missing google-services.json / missing plugin can NEVER crash app
 * startup. Returns a structured PushRegistrationResult.
 *
 * Listener order: ALL listeners are attached BEFORE PushNotifications.register()
 * so the token-registration event cannot be missed.
 *
 * [RufayqStartup] markers emitted, in order:
 *   - Push registration attempt
 *   - Push permission result: granted|denied
 *   - Push listener setup success | Push listener setup failed safely
 *   - Push native register success | Push native register failed safely: <reason>
 *   - Push token received
 *   - Push token upsert success | Push token upsert failed safely
 *   - Push registration failed safely: <reason>   (terminal, failure path only)
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, platform } from "./index";
import { parseDeepLink, type DeepLinkTarget } from "./deepLinks";
import { getDeviceId } from "@/hooks/useDeviceId";

export type PushFailureReason =
  | "web"
  | "not_native"
  | "missing_plugin"
  | "permission_denied"
  | "firebase_not_configured"
  | "registration_failed"
  | "token_upsert_failed"
  | "listener_setup_failed"
  | "already_registered"
  | "unknown";

export type PushRegistrationResult =
  | { ok: true }
  | { ok: false; reason: PushFailureReason; message?: string };

let registered = false;

function classifyError(err: unknown): PushFailureReason {
  const m = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  if (
    m.includes("firebase") ||
    m.includes("google-services") ||
    m.includes("google_app_id") ||
    m.includes("default firebaseapp") ||
    m.includes("firebasemessaging") ||
    m.includes("service_not_available")
  ) {
    return "firebase_not_configured";
  }
  if (m.includes("not implemented") || m.includes("plugin")) return "missing_plugin";
  if (m.includes("permission")) return "permission_denied";
  return "registration_failed";
}

export async function registerPush(opts: {
  rolePref: "patient" | "doctor";
  onDeepLink?: (t: DeepLinkTarget) => void;
}): Promise<PushRegistrationResult> {
  console.info("[RufayqStartup] Push registration attempt");

  if (!isNative) {
    console.info("[RufayqStartup] Push registration failed safely: web");
    return { ok: false, reason: "web" };
  }
  if (registered) {
    console.info("[RufayqStartup] Push registration failed safely: already_registered");
    return { ok: false, reason: "already_registered" };
  }

  // Dynamically import so a missing native plugin can never break the JS bundle
  // on browsers or shells where the native module is not wired up.
  let PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications;
  try {
    PushNotifications = (await import("@capacitor/push-notifications")).PushNotifications;
  } catch (err) {
    console.warn("[RufayqStartup] Push registration failed safely: missing_plugin", err);
    return { ok: false, reason: "missing_plugin", message: String(err) };
  }

  // --- Permissions ---------------------------------------------------------
  try {
    const perm = await PushNotifications.requestPermissions();
    console.info("[RufayqStartup] Push permission result:", perm.receive);
    if (perm.receive !== "granted") {
      console.info("[RufayqStartup] Push registration failed safely: permission_denied");
      return { ok: false, reason: "permission_denied" };
    }
  } catch (err) {
    console.warn("[RufayqStartup] Push registration failed safely: permission_denied (threw)", err);
    return { ok: false, reason: "permission_denied", message: String(err) };
  }

  // --- Listeners (BEFORE register so token event cannot be missed) ---------
  try {
    PushNotifications.addListener("registration", async (token) => {
      console.info("[RufayqStartup] Push token received");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.info("[RufayqStartup] Push token upsert skipped: no session");
          return;
        }
        const { error } = await supabase.from("device_push_tokens").upsert(
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
        if (error) {
          console.warn("[RufayqStartup] Push token upsert failed safely", error.message);
        } else {
          console.info("[RufayqStartup] Push token upsert success");
        }
      } catch (e) {
        console.warn("[RufayqStartup] Push token upsert failed safely", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[RufayqStartup] Push native register failed safely (registrationError event)", err);
    });

    PushNotifications.addListener("pushNotificationReceived", (notif) => {
      try {
        toast(notif.title ?? "Rufayq", { description: notif.body, duration: 5000 });
      } catch (e) {
        console.warn("[push] toast failed", e);
      }
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      try {
        const url = (action.notification.data as { url?: string })?.url;
        if (!url || !opts.onDeepLink) return;
        const target = parseDeepLink(url);
        if (target) opts.onDeepLink(target);
      } catch (e) {
        console.warn("[push] deep-link from notification failed", e);
      }
    });
    console.info("[RufayqStartup] Push listener setup success");
  } catch (err) {
    console.warn("[RufayqStartup] Push listener setup failed safely", err);
    console.warn("[RufayqStartup] Push registration failed safely: listener_setup_failed");
    return { ok: false, reason: "listener_setup_failed", message: String(err) };
  }

  // --- Best-effort device_id backfill (never blocks startup) ---------------
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

  // --- Native register -----------------------------------------------------
  try {
    await PushNotifications.register();
    console.info("[RufayqStartup] Push native register success");
  } catch (err) {
    const reason = classifyError(err);
    console.warn(`[RufayqStartup] Push native register failed safely: ${reason}`, err);
    console.warn(`[RufayqStartup] Push registration failed safely: ${reason}`);
    return { ok: false, reason, message: String(err) };
  }

  registered = true;
  return { ok: true };
}
