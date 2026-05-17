/**
 * Push notifications — end-to-end registration + handler.
 *
 * Hardened: every native call is wrapped so a misconfigured Firebase /
 * missing google-services.json / missing plugin can NEVER crash app
 * startup. Returns a structured PushRegistrationResult.
 *
 * Order of [RufayqStartup] markers:
 *   - Push registration attempt
 *   - Push permission result: granted/denied
 *   - Push register failed safely: <reason>
 *   - Push registration success
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, platform } from "./index";
import { parseDeepLink, type DeepLinkTarget } from "./deepLinks";
import { getDeviceId } from "@/hooks/useDeviceId";

export type PushRegistrationResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "web"
        | "not_native"
        | "missing_plugin"
        | "permission_denied"
        | "firebase_not_configured"
        | "registration_failed"
        | "listener_setup_failed"
        | "already_registered"
        | "unknown";
      message?: string;
    };

let registered = false;

function classifyError(err: unknown): PushRegistrationResult["ok"] extends true ? never : Extract<PushRegistrationResult, { ok: false }>["reason"] {
  const m = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  if (m.includes("firebase") || m.includes("google-services") || m.includes("default firebaseapp")) return "firebase_not_configured";
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
    console.info("[RufayqStartup] Push register failed safely: web");
    return { ok: false, reason: "web" };
  }
  if (registered) {
    console.info("[RufayqStartup] Push register failed safely: already_registered");
    return { ok: false, reason: "already_registered" };
  }

  // Dynamically import so a missing plugin can never break the JS bundle on
  // browsers / shells where the native module isn't wired up.
  let PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications;
  try {
    PushNotifications = (await import("@capacitor/push-notifications")).PushNotifications;
  } catch (err) {
    console.warn("[RufayqStartup] Push register failed safely: missing_plugin", err);
    return { ok: false, reason: "missing_plugin", message: String(err) };
  }

  try {
    const perm = await PushNotifications.requestPermissions();
    console.info("[RufayqStartup] Push permission result:", perm.receive);
    if (perm.receive !== "granted") {
      console.info("[RufayqStartup] Push register failed safely: permission_denied");
      return { ok: false, reason: "permission_denied" };
    }
  } catch (err) {
    console.warn("[RufayqStartup] Push register failed safely: permission_denied (threw)", err);
    return { ok: false, reason: "permission_denied", message: String(err) };
  }

  // Best-effort backfill — never let a network/auth failure escape startup.
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

  try {
    await PushNotifications.register();
  } catch (err) {
    const reason = classifyError(err);
    console.warn(`[RufayqStartup] Push register failed safely: ${reason}`, err);
    return { ok: false, reason, message: String(err) };
  }

  try {
    PushNotifications.addListener("registration", async (token) => {
      try {
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
      } catch (e) {
        console.warn("[push] token upsert failed", e);
      }
    });
    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registrationError event", err);
    });
    PushNotifications.addListener("pushNotificationReceived", (notif) => {
      toast(notif.title ?? "Rufayq", { description: notif.body, duration: 5000 });
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = (action.notification.data as { url?: string })?.url;
      if (!url || !opts.onDeepLink) return;
      const target = parseDeepLink(url);
      if (target) opts.onDeepLink(target);
    });
  } catch (err) {
    console.warn("[RufayqStartup] Push register failed safely: listener_setup_failed", err);
    return { ok: false, reason: "listener_setup_failed", message: String(err) };
  }

  registered = true;
  console.info("[RufayqStartup] Push registration success");
  return { ok: true };
}
