import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { isNative } from "@/lib/native";
import { registerPush } from "@/lib/native/push";
import { getStoredRole } from "@/screens/RoleSelectorScreen";
import type { DeepLinkTarget } from "@/lib/native/deepLinks";

const FLAG = "rufayq_push_prompted_v1";

interface Props {
  onDeepLink: (t: DeepLinkTarget) => void;
}

/**
 * One-time soft prompt asking the user to enable native push notifications.
 *  - Web: never shown (no native push to request).
 *  - Native: shown once after sign-in; the user can Enable or Skip.
 *  - We store the dismissal flag locally so users aren't nagged.
 *
 * The actual OS permission dialog is only triggered by the user tap.
 */
export default function PushPermissionPrompt({ onDeepLink }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    console.info("[RufayqStartup] Push prompt mounted");
    if (!isNative) return;
    if (localStorage.getItem(FLAG)) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const dismiss = (granted: boolean) => {
    localStorage.setItem(FLAG, granted ? "granted" : "skipped");
    setShow(false);
  };

  const enable = async () => {
    try {
      const role = (getStoredRole() ?? "patient") as "patient" | "doctor";
      const res = await registerPush({ rolePref: role, onDeepLink });
      if (res.ok === true) {
        toast.success("Notifications enabled · تم تفعيل التنبيهات");
        dismiss(true);
        return;
      }
      const reason: string = (res as { reason: string }).reason;
      if (reason === "permission_denied") {
        toast.error("Permission denied · تم رفض الإذن", {
          description: "You can enable it later from your device settings.",
        });
      } else if (reason === "firebase_not_configured") {
        toast.error("Notifications unavailable · التنبيهات غير متاحة", {
          description: "Push service is not configured on this build.",
        });
      }
      dismiss(false);
    } catch (e) {
      console.warn("[RufayqStartup] Push registration failed safely: unknown", e);
      toast.error("Couldn't enable notifications · تعذر تفعيل التنبيهات");
      dismiss(false);
    }
  };

  return (
    <div className="fixed bottom-20 inset-x-3 z-[150]">
      <div
        className="mx-auto max-w-[380px] rounded-2xl p-3.5 flex items-start gap-3"
        style={{
          background: "var(--white)",
          border: "1px solid var(--gray-light)",
          boxShadow: "0 14px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--teal-deep)" }}
        >
          <Bell size={16} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>
            Stay updated · ابقَ على اطلاع
          </p>
          <p className="text-[11.5px] opacity-75 mt-0.5">
            Get instant alerts for new messages, appointments and medication reminders.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={enable}
              className="text-[12px] px-3 py-1.5 rounded-full font-semibold"
              style={{ background: "var(--teal-deep)", color: "#fff" }}
            >
              Enable
            </button>
            <button
              onClick={() => dismiss(false)}
              className="text-[12px] px-3 py-1.5 rounded-full"
              style={{ background: "var(--off-white)", color: "var(--ink)" }}
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={() => dismiss(false)} aria-label="Close" className="opacity-50">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
