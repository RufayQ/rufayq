import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  confirmLabel?: string;
  confirmLabelAr?: string;
  cancelLabel?: string;
  cancelLabelAr?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Branded confirm modal that replaces window.confirm.
 * Renders inside the mobile shell (absolute), respects theme tokens.
 */
const ConfirmDialog = ({
  open, title, titleAr, description, descriptionAr,
  confirmLabel = "Confirm", confirmLabelAr = "تأكيد",
  cancelLabel = "Cancel", cancelLabelAr = "إلغاء",
  destructive = false, onConfirm, onClose,
}: ConfirmDialogProps) => {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(7,18,30,0.55)" }} />
      <div
        className="relative w-full rounded-2xl p-5 animate-scale-in"
        style={{ background: "var(--white)", maxWidth: 340, boxShadow: "0 24px 48px rgba(7,18,30,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center btn-press"
          style={{ background: "var(--off-white)" }}
        >
          <X size={14} style={{ color: "var(--gray)" }} />
        </button>

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{
            background: destructive ? "rgba(217,79,79,0.12)" : "var(--gold-pale)",
          }}
        >
          <AlertTriangle size={22} style={{ color: destructive ? "var(--error)" : "var(--gold)" }} />
        </div>

        <h3 className="font-display text-lg" style={{ color: "var(--navy)" }}>{title}</h3>
        {titleAr && (
          <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
        )}
        {description && (
          <p className="text-[12px] mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>{description}</p>
        )}
        {descriptionAr && (
          <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>{descriptionAr}</p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
          >
            {cancelLabel} · <span className="font-arabic">{cancelLabelAr}</span>
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white btn-press"
            style={{
              background: destructive
                ? "linear-gradient(135deg, var(--error), #B33A3A)"
                : "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))",
            }}
          >
            {confirmLabel} · <span className="font-arabic">{confirmLabelAr}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
