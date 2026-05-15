import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  providerLabel: string;
  providerLabelAr: string;
  email?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const UnlinkConfirmDialog = ({
  open,
  providerLabel,
  providerLabelAr,
  email,
  busy,
  onCancel,
  onConfirm,
}: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      style={{ background: "rgba(7,18,33,0.55)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[360px] rounded-2xl overflow-hidden"
        style={{
          background: "var(--white)",
          border: "1px solid var(--gray-light)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--gray-light)" }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: "var(--error)" }} />
            <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
              Unlink {providerLabel}? · فصل {providerLabelAr}؟
            </p>
          </div>
          <button onClick={onCancel} disabled={busy} aria-label="Close" className="p-1">
            <X size={14} style={{ color: "var(--gray)" }} />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {email && (
            <p
              className="text-[12px] font-mono break-all"
              style={{ color: "var(--navy)" }}
              dir="ltr"
            >
              {email}
            </p>
          )}
          <p className="text-[12px] leading-snug" style={{ color: "var(--gray)" }}>
            You'll need another sign-in method to access this account.
          </p>
          <p
            className="text-[12px] leading-snug"
            style={{ color: "var(--gray)" }}
            dir="rtl"
            lang="ar"
          >
            ستحتاج إلى وسيلة تسجيل دخول أخرى للوصول إلى حسابك.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--gray-light)" }}
        >
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md btn-press"
            style={{
              border: "1px solid var(--gray-light)",
              color: "var(--navy)",
              background: "var(--white)",
            }}
          >
            Cancel · إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md btn-press inline-flex items-center gap-1.5"
            style={{
              background: "var(--error)",
              color: "white",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            Unlink · فصل
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlinkConfirmDialog;
