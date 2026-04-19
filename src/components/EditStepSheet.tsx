import { useState, useEffect } from "react";
import { X, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { JourneyStep } from "@/constants/data";
import ConfirmDialog from "./ConfirmDialog";

interface EditStepSheetProps {
  open: boolean;
  step: JourneyStep | null;
  onClose: () => void;
  onSave: (step: JourneyStep) => void;
  onDelete?: (stepId: number) => void;
}

const statusOptions: JourneyStep["status"][] = ["pending", "active", "done"];
const phaseOptions: JourneyStep["phase"][] = ["before", "during", "after"];

const EditStepSheet = ({ open, step, onClose, onSave, onDelete }: EditStepSheetProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<JourneyStep["status"]>("pending");
  const [phase, setPhase] = useState<JourneyStep["phase"]>("before");
  const [details, setDetails] = useState("");
  const [detailsAr, setDetailsAr] = useState("");

  useEffect(() => {
    if (step) {
      setTitleEn(step.titleEn);
      setTitleAr(step.titleAr);
      setDate(step.date);
      setStatus(step.status);
      setPhase(step.phase);
      setDetails(step.details || "");
      setDetailsAr(step.detailsAr || "");
    }
  }, [step]);

  if (!open || !step) return null;

  const handleSave = () => {
    if (!titleEn.trim()) {
      toast.error("Title is required");
      return;
    }
    onSave({
      ...step,
      titleEn: titleEn.trim(),
      titleAr: titleAr.trim() || titleEn.trim(),
      date: date.trim() || "TBD",
      status, phase,
      details: details.trim() || undefined,
      detailsAr: detailsAr.trim() || undefined,
    });
    toast.success("Step updated · تم تحديث الخطوة");
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete(step.id);
    toast.success("Step removed · تم حذف الخطوة");
    onClose();
  };

  return (
    <>
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col"
        style={{ background: "var(--white)", maxHeight: "85%" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 shrink-0">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <Edit3 size={18} style={{ color: "var(--teal-deep)" }} /> Edit Step
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الخطوة</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>TITLE (EN)</label>
            <input value={titleEn} onChange={e => setTitleEn(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </div>
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>TITLE (AR) · بالعربية</label>
            <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none font-arabic"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </div>
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>DATE · التاريخ</label>
            <input value={date} onChange={e => setDate(e.target.value)} placeholder="Apr 15"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </div>

          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>STATUS · الحالة</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {statusOptions.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className="py-2 rounded-lg text-[11px] font-bold uppercase btn-press"
                  style={{
                    background: status === s ? "var(--teal-deep)" : "var(--off-white)",
                    color: status === s ? "white" : "var(--navy)",
                    border: status === s ? "none" : "1px solid var(--gray-light)",
                  }}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>PHASE · المرحلة</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {phaseOptions.map(p => (
                <button key={p} onClick={() => setPhase(p)}
                  className="py-2 rounded-lg text-[11px] font-bold uppercase btn-press"
                  style={{
                    background: phase === p ? "var(--gold)" : "var(--off-white)",
                    color: phase === p ? "white" : "var(--navy)",
                    border: phase === p ? "none" : "1px solid var(--gray-light)",
                  }}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>DETAILS</label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </div>
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>DETAILS (AR)</label>
            <textarea value={detailsAr} onChange={e => setDetailsAr(e.target.value)} rows={2} dir="rtl"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none font-arabic"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </div>
        </div>

        <div className="px-5 py-3 shrink-0 flex gap-2" style={{ borderTop: "1px solid var(--gray-light)" }}>
          {onDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="w-12 h-12 rounded-xl flex items-center justify-center btn-press shrink-0"
              style={{ background: "rgba(217,79,79,0.1)", border: "1px solid var(--error)" }}>
              <Trash2 size={16} style={{ color: "var(--error)" }} />
            </button>
          )}
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
            Save Step · حفظ
          </button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={confirmDelete}
      onClose={() => setConfirmDelete(false)}
      onConfirm={handleDelete}
      destructive
      title="Delete this step?"
      titleAr="حذف هذه الخطوة؟"
      description={`"${titleEn || step.titleEn}" will be removed from your journey. This can't be undone.`}
      descriptionAr="سيتم حذف هذه الخطوة من رحلتك. لا يمكن التراجع."
      confirmLabel="Delete"
      confirmLabelAr="حذف"
    />
    </>
  );
};

export default EditStepSheet;
