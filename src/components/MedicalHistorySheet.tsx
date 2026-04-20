import { useEffect, useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { toast } from "sonner";

type Tab = "past" | "surgical" | "family";

interface PastRow { condition: string; year: string; status: string; notes: string }
interface SurgicalRow { procedure: string; year: string; hospital: string; notes: string }
interface FamilyRow { relation: string; condition: string; age_of_onset: string; notes: string }

interface Props { onClose: () => void }

const emptyPast: PastRow = { condition: "", year: "", status: "", notes: "" };
const emptySurg: SurgicalRow = { procedure: "", year: "", hospital: "", notes: "" };
const emptyFam: FamilyRow = { relation: "", condition: "", age_of_onset: "", notes: "" };

const MedicalHistorySheet = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("past");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState<PastRow[]>([]);
  const [surg, setSurg] = useState<SurgicalRow[]>([]);
  const [fam, setFam] = useState<FamilyRow[]>([]);

  useEffect(() => {
    (async () => {
      const device_id = getDeviceId();
      const { data } = await supabase
        .from("medical_profiles")
        .select("past_medical_history, surgical_history, family_history")
        .eq("device_id", device_id)
        .maybeSingle();
      if (data) {
        setPast(((data.past_medical_history as any) || []) as PastRow[]);
        setSurg(((data.surgical_history as any) || []) as SurgicalRow[]);
        setFam(((data.family_history as any) || []) as FamilyRow[]);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const device_id = getDeviceId();
    const cleanPast = past.filter((r) => r.condition.trim());
    const cleanSurg = surg.filter((r) => r.procedure.trim());
    const cleanFam = fam.filter((r) => r.condition.trim() && r.relation.trim());

    const { error } = await supabase.from("medical_profiles").upsert({
      device_id,
      past_medical_history: cleanPast as any,
      surgical_history: cleanSurg as any,
      family_history: cleanFam as any,
    } as any, { onConflict: "device_id" });

    setSaving(false);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Medical history saved · حُفظ التاريخ الطبي");
    onClose();
  };

  const Field = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2.5 py-1.5 rounded-md text-[12px] outline-none"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
    />
  );

  const RowCard = ({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) => (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      <div className="flex items-center justify-end">
        <button onClick={onRemove} className="p-1 btn-press" aria-label="Remove">
          <Trash2 size={14} style={{ color: "var(--error)" }} />
        </button>
      </div>
      {children}
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--off-white)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--navy)", color: "white" }}>
        <button onClick={onClose} className="btn-press" aria-label="Close"><X size={20} /></button>
        <p className="font-display text-base">Medical History</p>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 btn-press" style={{ background: "var(--gold)", color: "var(--navy)" }}>
          <Save size={12} /> {saving ? "..." : "Save"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}>
        {([
          { k: "past", label: "Past", labelAr: "السابق" },
          { k: "surgical", label: "Surgical", labelAr: "جراحي" },
          { k: "family", label: "Family", labelAr: "عائلي" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="flex-1 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              color: tab === t.k ? "var(--teal-deep)" : "var(--gray)",
              borderBottom: tab === t.k ? "2px solid var(--teal-deep)" : "2px solid transparent",
            }}
          >
            {t.label}
            <span className="font-arabic text-[10px] block" dir="rtl">{t.labelAr}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-[12px]" style={{ color: "var(--gray)" }}>Loading…</p>}

        {!loading && tab === "past" && (
          <>
            {past.map((row, i) => (
              <RowCard key={i} onRemove={() => setPast(past.filter((_, idx) => idx !== i))}>
                <Field value={row.condition} onChange={(v) => setPast(past.map((r, idx) => idx === i ? { ...r, condition: v } : r))} placeholder="Condition (e.g. Hypertension)" />
                <div className="grid grid-cols-2 gap-2">
                  <Field value={row.year} onChange={(v) => setPast(past.map((r, idx) => idx === i ? { ...r, year: v } : r))} placeholder="Year" />
                  <Field value={row.status} onChange={(v) => setPast(past.map((r, idx) => idx === i ? { ...r, status: v } : r))} placeholder="Status (active/resolved)" />
                </div>
                <Field value={row.notes} onChange={(v) => setPast(past.map((r, idx) => idx === i ? { ...r, notes: v } : r))} placeholder="Notes (optional)" />
              </RowCard>
            ))}
            <button onClick={() => setPast([...past, { ...emptyPast }])} className="w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press" style={{ background: "var(--white)", border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}>
              <Plus size={14} /> Add Condition
            </button>
          </>
        )}

        {!loading && tab === "surgical" && (
          <>
            {surg.map((row, i) => (
              <RowCard key={i} onRemove={() => setSurg(surg.filter((_, idx) => idx !== i))}>
                <Field value={row.procedure} onChange={(v) => setSurg(surg.map((r, idx) => idx === i ? { ...r, procedure: v } : r))} placeholder="Procedure (e.g. Appendectomy)" />
                <div className="grid grid-cols-2 gap-2">
                  <Field value={row.year} onChange={(v) => setSurg(surg.map((r, idx) => idx === i ? { ...r, year: v } : r))} placeholder="Year" />
                  <Field value={row.hospital} onChange={(v) => setSurg(surg.map((r, idx) => idx === i ? { ...r, hospital: v } : r))} placeholder="Hospital" />
                </div>
                <Field value={row.notes} onChange={(v) => setSurg(surg.map((r, idx) => idx === i ? { ...r, notes: v } : r))} placeholder="Notes (optional)" />
              </RowCard>
            ))}
            <button onClick={() => setSurg([...surg, { ...emptySurg }])} className="w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press" style={{ background: "var(--white)", border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}>
              <Plus size={14} /> Add Surgery
            </button>
          </>
        )}

        {!loading && tab === "family" && (
          <>
            {fam.map((row, i) => (
              <RowCard key={i} onRemove={() => setFam(fam.filter((_, idx) => idx !== i))}>
                <div className="grid grid-cols-2 gap-2">
                  <Field value={row.relation} onChange={(v) => setFam(fam.map((r, idx) => idx === i ? { ...r, relation: v } : r))} placeholder="Relation (Father)" />
                  <Field value={row.condition} onChange={(v) => setFam(fam.map((r, idx) => idx === i ? { ...r, condition: v } : r))} placeholder="Condition (Diabetes)" />
                </div>
                <Field value={row.age_of_onset} onChange={(v) => setFam(fam.map((r, idx) => idx === i ? { ...r, age_of_onset: v } : r))} placeholder="Age of onset (optional)" />
                <Field value={row.notes} onChange={(v) => setFam(fam.map((r, idx) => idx === i ? { ...r, notes: v } : r))} placeholder="Notes (optional)" />
              </RowCard>
            ))}
            <button onClick={() => setFam([...fam, { ...emptyFam }])} className="w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press" style={{ background: "var(--white)", border: "1px dashed var(--teal-deep)", color: "var(--teal-deep)" }}>
              <Plus size={14} /> Add Family Condition
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MedicalHistorySheet;
