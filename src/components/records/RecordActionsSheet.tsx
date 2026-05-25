/**
 * RecordActionsSheet — bottom-sheet kebab menu for any record card.
 *
 * Actions: Preview · Rename · Share · Apply to milestone · Delete (with confirm).
 * Caller passes async handlers — the sheet owns the modal UI (rename input,
 * milestone picker, delete confirmation) and routes confirmed intents back.
 */
import { useEffect, useState } from "react";
import { Eye, Pencil, Share2, Link2, Trash2, X, Loader2, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useJourneyOverview } from "@/hooks/useJourneyOverview";

export interface RecordTarget {
  id: string;
  name: string;
  subtitle?: string;
  /** Whether the underlying record is editable/deletable. Demo records pass false. */
  mutable?: boolean;
}

export interface RecordActionsSheetProps {
  open: boolean;
  target: RecordTarget | null;
  onClose: () => void;
  onPreview?: () => void;
  onRename?: (newName: string) => Promise<void> | void;
  /** Open the full edit experience for the underlying entity (ticket / appointment / record). */
  onEditDetails?: () => void;
  onShare?: () => Promise<void> | void;
  /** Send this record into the AI chat as an attachment. Free on every tier. */
  onSendToChat?: () => Promise<void> | void;
  onApplyToMilestone?: (milestone: { id: string; refId: string; title: string; kind: string }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}


const RecordActionsSheet = ({
  open,
  target,
  onClose,
  onPreview,
  onRename,
  onShare,
  onSendToChat,
  onApplyToMilestone,
  onDelete,
}: RecordActionsSheetProps) => {
  const [mode, setMode] = useState<"menu" | "rename" | "milestone" | "confirmDelete">("menu");
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const { milestones } = useJourneyOverview();

  useEffect(() => {
    if (open) {
      setMode("menu");
      setDraftName(target?.name ?? "");
      setBusy(false);
    }
  }, [open, target]);

  if (!open || !target) return null;

  const mutable = target.mutable !== false;

  const handleRename = async () => {
    const name = draftName.trim();
    if (!name || name === target.name) { onClose(); return; }
    if (!onRename) { onClose(); return; }
    setBusy(true);
    try {
      await onRename(name);
      toast.success("Renamed · تم التغيير", { duration: 1800 });
      onClose();
    } catch (e: any) {
      toast.error("Could not rename · تعذّر التغيير", { description: e?.message });
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!onDelete) { onClose(); return; }
    setBusy(true);
    try {
      await onDelete();
      toast.success("Deleted · تم الحذف", { duration: 1800 });
      onClose();
    } catch (e: any) {
      toast.error("Could not delete · تعذّر الحذف", { description: e?.message });
    } finally { setBusy(false); }
  };

  const handleApply = async (m: typeof milestones[number]) => {
    if (!onApplyToMilestone) { onClose(); return; }
    setBusy(true);
    try {
      await onApplyToMilestone({ id: m.id, refId: m.refId, title: m.title, kind: m.kind });
      toast.success(`Linked to ${m.title}`, {
        description: "تم الربط بالخطوة",
        duration: 2000,
      });
      onClose();
    } catch (e: any) {
      toast.error("Could not link · تعذّر الربط", { description: e?.message });
    } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Record actions"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl pb-5 animate-slide-up"
        style={{ background: "var(--white)" }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: "var(--navy)" }}>{target.name}</p>
            {target.subtitle && (
              <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>{target.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center btn-press shrink-0"
            style={{ background: "var(--off-white)" }}
            aria-label="Close"
          >
            <X size={14} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        {mode === "menu" && (
          <div className="px-3 pb-2 space-y-1">
            <ActionRow icon={<Eye size={15} />} en="Preview" ar="معاينة" onClick={() => { onClose(); onPreview?.(); }} />
            <ActionRow
              icon={<Pencil size={15} />}
              en="Edit name"
              ar="تعديل الاسم"
              disabled={!mutable || !onRename}
              hint={!mutable ? "Demo record — read only" : undefined}
              onClick={() => setMode("rename")}
            />
            <ActionRow icon={<Share2 size={15} />} en="Share" ar="مشاركة" onClick={async () => { try { await onShare?.(); } finally { onClose(); } }} />
            <ActionRow
              icon={<MessageSquare size={15} />}
              en="Send to chat"
              ar="أرسل إلى المحادثة"
              disabled={!onSendToChat}
              onClick={async () => { try { await onSendToChat?.(); } finally { onClose(); } }}
            />
            <ActionRow
              icon={<Link2 size={15} />}
              en="Apply to milestone"
              ar="ربط بخطوة"
              disabled={!onApplyToMilestone}
              onClick={() => setMode("milestone")}
            />
            <ActionRow
              icon={<Trash2 size={15} />}
              en="Delete"
              ar="حذف"
              danger
              disabled={!mutable || !onDelete}
              hint={!mutable ? "Demo record — read only" : undefined}
              onClick={() => setMode("confirmDelete")}
            />
          </div>
        )}

        {mode === "rename" && (
          <div className="px-5 pb-4">
            <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>New name · الاسم الجديد</p>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setMode("menu")}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold btn-press"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                Back · رجوع
              </button>
              <button
                onClick={handleRename}
                disabled={busy || !draftName.trim()}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white btn-press flex items-center justify-center gap-2"
                style={{ background: "var(--teal-deep)", opacity: busy || !draftName.trim() ? 0.6 : 1 }}
              >
                {busy && <Loader2 size={13} className="animate-spin" />} Save · حفظ
              </button>
            </div>
          </div>
        )}

        {mode === "milestone" && (
          <div className="px-5 pb-4">
            <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--navy)" }}>
              Pick a milestone · اختر خطوة
            </p>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {milestones.length === 0 && (
                <p className="text-[11px] text-center py-6" style={{ color: "var(--gray)" }}>
                  No milestones yet · لا توجد خطوات بعد
                </p>
              )}
              {milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleApply(m)}
                  disabled={busy}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left btn-press"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
                >
                  <MapPin size={13} style={{ color: "var(--teal-deep)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{m.title}</p>
                    <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{m.titleAr}</p>
                  </div>
                  <span className="text-[9px] font-mono uppercase" style={{ color: "var(--gray)" }}>{m.kind}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode("menu")}
              disabled={busy}
              className="w-full mt-3 py-2.5 rounded-xl text-[12px] font-bold btn-press"
              style={{ background: "var(--off-white)", color: "var(--navy)" }}
            >
              Back · رجوع
            </button>
          </div>
        )}

        {mode === "confirmDelete" && (
          <div className="px-5 pb-4">
            <p className="text-[13px] font-bold mb-1" style={{ color: "var(--navy)" }}>
              Delete this record?
            </p>
            <p className="font-arabic text-[11px] mb-3" dir="rtl" style={{ color: "var(--gray)" }}>
              هل تريد حذف هذا السجل؟
            </p>
            <p className="text-[11px] mb-4" style={{ color: "var(--gray)" }}>
              This action cannot be undone from the app.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold btn-press"
                style={{ background: "var(--off-white)", color: "var(--navy)" }}
              >
                Cancel · إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white btn-press flex items-center justify-center gap-2"
                style={{ background: "var(--danger, #c0392b)", opacity: busy ? 0.6 : 1 }}
              >
                {busy && <Loader2 size={13} className="animate-spin" />} Delete · حذف
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionRow = ({
  icon, en, ar, onClick, danger, disabled, hint,
}: {
  icon: React.ReactNode; en: string; ar: string;
  onClick: () => void; danger?: boolean; disabled?: boolean; hint?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl btn-press text-left"
    style={{
      background: "transparent",
      color: danger ? "var(--danger, #c0392b)" : "var(--navy)",
      opacity: disabled ? 0.4 : 1,
    }}
  >
    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: danger ? "rgba(192,57,43,0.1)" : "var(--off-white)" }}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-semibold">{en}</span>
      <span className="font-arabic text-[10px] block truncate" dir="rtl" style={{ color: "var(--gray)" }}>{ar}{hint ? ` · ${hint}` : ""}</span>
    </span>
  </button>
);

export default RecordActionsSheet;
