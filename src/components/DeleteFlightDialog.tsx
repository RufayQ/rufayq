import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Receives `true` when the user opted to also soft-delete related attachments. */
  onConfirm: (alsoDeleteDocs: boolean) => void;
}

/**
 * Branded delete-flight confirmation that makes the documents-stay-in-vault
 * contract explicit. Adds an optional opt-in toggle so users can purge the
 * attachments alongside the ticket if they really want to.
 *
 * Default: documents are preserved (the safe choice). Files are never removed
 * from storage from this path — purge means soft-delete on the row, leaving the
 * underlying object recoverable from the bucket.
 */
const DeleteFlightDialog = ({ open, onClose, onConfirm }: Props) => {
  const [alsoDelete, setAlsoDelete] = useState(false);

  if (!open) return null;

  const close = () => {
    setAlsoDelete(false);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-6" onClick={close}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(7,18,30,0.55)" }} />
      <div
        className="relative w-full rounded-2xl p-5 animate-scale-in"
        style={{ background: "var(--white)", maxWidth: 360, boxShadow: "0 24px 48px rgba(7,18,30,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center btn-press"
          style={{ background: "var(--off-white)" }}
        >
          <X size={14} style={{ color: "var(--gray)" }} />
        </button>

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(217,79,79,0.12)" }}
        >
          <AlertTriangle size={22} style={{ color: "var(--error)" }} />
        </div>

        <h3 className="font-display text-lg" style={{ color: "var(--navy)" }}>
          Delete flight ticket?
        </h3>
        <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
          حذف تذكرة الطيران؟
        </p>

        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: "var(--gray)" }}>
          This removes the ticket from your timeline. Related documents stay in your document vault unless you remove them separately.
        </p>
        <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
          سيتم حذف التذكرة من رحلتك. تبقى المستندات المرفقة في خزانة المستندات ما لم تحذفها بشكل منفصل.
        </p>

        <label
          className="mt-4 flex items-start gap-2 cursor-pointer select-none rounded-xl px-3 py-2.5"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
        >
          <input
            type="checkbox"
            checked={alsoDelete}
            onChange={(e) => setAlsoDelete(e.target.checked)}
            className="mt-0.5 accent-current"
            style={{ accentColor: "var(--gold)" }}
          />
          <span className="text-[12px] leading-snug" style={{ color: "var(--navy)" }}>
            Also delete related documents
            <span className="block font-arabic text-[11px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
              حذف المستندات المرفقة أيضاً
            </span>
          </span>
        </label>

        <div className="flex gap-2 mt-5">
          <button
            onClick={close}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold btn-press"
            style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
          >
            Cancel · <span className="font-arabic">إلغاء</span>
          </button>
          <button
            onClick={() => { onConfirm(alsoDelete); close(); }}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white btn-press"
            style={{ background: "linear-gradient(135deg, var(--error), #B33A3A)" }}
          >
            Delete · <span className="font-arabic">حذف</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteFlightDialog;
