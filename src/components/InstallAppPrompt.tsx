import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const DISMISS_KEY = "rufayq.install.dismissedAt";
const DISMISS_DAYS = 7;

const wasRecentlyDismissed = () => {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 86400 * 1000;
  } catch {
    return false;
  }
};

interface Props {
  isAr?: boolean;
}

export default function InstallAppPrompt({ isAr = false }: Props) {
  const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (installed) return;
    if (wasRecentlyDismissed()) return;
    if (canInstall || isIOS) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, [canInstall, installed, isIOS]);

  if (installed || !visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
    setShowIOSHelp(false);
  };

  const onInstall = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") setVisible(false);
      return;
    }
    if (isIOS) setShowIOSHelp(true);
  };

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label={isAr ? "تثبيت تطبيق RufayQ" : "Install RufayQ app"}
        className="fixed left-1/2 -translate-x-1/2 z-[100] w-[min(420px,calc(100vw-24px))]"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div
          className="rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 p-3"
          style={{
            background: "rgba(11, 42, 58, 0.92)",
            border: "1px solid rgba(197,150,90,0.35)",
            color: "#F4ECDD",
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(197,150,90,0.18)", border: "1px solid rgba(197,150,90,0.4)" }}
          >
            <img
              src="/app-icon.png"
              alt=""
              className="w-9 h-9 rounded-lg"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight truncate">
              {isAr ? "ثبّت RufayQ" : "Install RufayQ"}
            </p>
            <p className="text-[11px] opacity-80 leading-tight mt-0.5 truncate">
              {isAr
                ? "وصول أسرع وتجربة كاملة الشاشة"
                : "Faster access · full-screen experience"}
            </p>
          </div>
          <button
            onClick={onInstall}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition active:scale-95"
            style={{ background: "#C5965A", color: "#0B2A3A" }}
          >
            <Download className="w-3.5 h-3.5" />
            {isAr ? "تثبيت" : "Install"}
          </button>
          <button
            onClick={dismiss}
            aria-label={isAr ? "إغلاق" : "Dismiss"}
            className="shrink-0 p-1.5 rounded-md opacity-70 hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSHelp && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isAr ? "إضافة إلى الشاشة الرئيسية" : "Add to Home Screen"}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: "#0B2A3A",
              border: "1px solid rgba(197,150,90,0.35)",
              color: "#F4ECDD",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl" style={{ fontWeight: 400 }}>
                {isAr ? "أضِف إلى الشاشة الرئيسية" : "Add to Home Screen"}
              </h3>
              <button
                onClick={() => setShowIOSHelp(false)}
                aria-label={isAr ? "إغلاق" : "Close"}
                className="p-1 opacity-70 hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                  style={{ background: "rgba(197,150,90,0.25)" }}
                >
                  1
                </span>
                <span className="flex-1 inline-flex items-center gap-1.5 flex-wrap">
                  {isAr ? "اضغط زر المشاركة" : "Tap the Share button"}
                  <Share className="w-4 h-4 inline" style={{ color: "#C5965A" }} />
                  {isAr ? "في Safari" : "in Safari"}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                  style={{ background: "rgba(197,150,90,0.25)" }}
                >
                  2
                </span>
                <span className="flex-1 inline-flex items-center gap-1.5 flex-wrap">
                  {isAr ? "اختر" : "Choose"}
                  <strong className="inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    {isAr ? "إضافة إلى الشاشة الرئيسية" : "Add to Home Screen"}
                  </strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                  style={{ background: "rgba(197,150,90,0.25)" }}
                >
                  3
                </span>
                <span className="flex-1">
                  {isAr ? 'اضغط "إضافة" لإنهاء التثبيت' : 'Tap "Add" to finish installing'}
                </span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: "#C5965A", color: "#0B2A3A" }}
            >
              {isAr ? "تم" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
