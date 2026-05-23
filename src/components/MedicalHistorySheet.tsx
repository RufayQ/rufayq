/**
 * MedicalHistorySheet — bilingual editor for the user's medical profile.
 *
 * Tabs:
 *   - Vitals     → blood type (8 standard + Unknown)
 *   - Allergies  → CRUD against the `allergies` table (insert / soft-delete)
 *   - Past       → past_medical_history JSON
 *   - Surgical   → surgical_history JSON
 *   - Family     → family_history JSON
 *
 * Everything is committed in a single Save action so the user gets one
 * predictable confirmation.
 */
import { useEffect, useState } from "react";
import { X, Plus, Trash2, Save, Droplet, AlertTriangle, History, Scissors, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { toast } from "sonner";

type Tab = "vitals" | "allergies" | "past" | "surgical" | "family";

interface PastRow { condition: string; year: string; status: string; notes: string }
interface SurgicalRow { procedure: string; year: string; hospital: string; notes: string }
interface FamilyRow { relation: string; condition: string; age_of_onset: string; notes: string }
interface AllergyRow {
  id?: string;
  allergen: string;
  severity: string;
  reaction: string;
  notes: string;
  _new?: boolean;
}

interface Props { onClose: () => void }

const emptyPast: PastRow = { condition: "", year: "", status: "", notes: "" };
const emptySurg: SurgicalRow = { procedure: "", year: "", hospital: "", notes: "" };
const emptyFam: FamilyRow = { relation: "", condition: "", age_of_onset: "", notes: "" };
const emptyAllergy: AllergyRow = { allergen: "", severity: "", reaction: "", notes: "", _new: true };

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;
const SEVERITY_OPTIONS = [
  { v: "", l: "Severity · الشدة" },
  { v: "mild", l: "Mild · خفيف" },
  { v: "moderate", l: "Moderate · متوسط" },
  { v: "severe", l: "Severe · شديد" },
  { v: "anaphylaxis", l: "Anaphylaxis · صدمة تحسسية" },
];

const MedicalHistorySheet = ({ onClose }: Props) => {
  const [tab, setTab] = useState<Tab>("vitals");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bloodType, setBloodType] = useState<string>("");
  const [past, setPast] = useState<PastRow[]>([]);
  const [surg, setSurg] = useState<SurgicalRow[]>([]);
  const [fam, setFam] = useState<FamilyRow[]>([]);
  const [allergies, setAllergies] = useState<AllergyRow[]>([]);
  const [removedAllergyIds, setRemovedAllergyIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const device_id = getDeviceId();
      const [{ data: mp }, { data: al }] = await Promise.all([
        supabase
          .from("medical_profiles")
          .select("blood_type, past_medical_history, surgical_history, family_history")
          .eq("device_id", device_id)
          .maybeSingle(),
        supabase
          .from("allergies")
          .select("id, allergen, severity, reaction, notes")
          .eq("device_id", device_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ]);
      if (mp) {
        setBloodType((mp as any).blood_type || "");
        setPast(((mp.past_medical_history as any) || []) as PastRow[]);
        setSurg(((mp.surgical_history as any) || []) as SurgicalRow[]);
        setFam(((mp.family_history as any) || []) as FamilyRow[]);
      }
      setAllergies(((al as any) || []).map((r: any) => ({
        id: r.id,
        allergen: r.allergen || "",
        severity: r.severity || "",
        reaction: r.reaction || "",
        notes: r.notes || "",
      })));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const device_id = getDeviceId();
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id ?? null;

    const cleanPast = past.filter((r) => r.condition.trim());
    const cleanSurg = surg.filter((r) => r.procedure.trim());
    const cleanFam = fam.filter((r) => r.condition.trim() && r.relation.trim());

    const mpRes = await supabase.from("medical_profiles").upsert({
      device_id,
      blood_type: bloodType || null,
      past_medical_history: cleanPast as any,
      surgical_history: cleanSurg as any,
      family_history: cleanFam as any,
    } as any, { onConflict: "device_id" });

    // Allergies: insert new rows + soft-delete removed + update edited existing rows.
    const allergyOps: Promise<{ error: unknown } | unknown>[] = [];
    if (removedAllergyIds.length) {
      allergyOps.push(
        Promise.resolve(
          supabase.from("allergies")
            .update({ deleted_at: new Date().toISOString() })
            .in("id", removedAllergyIds),
        ),
      );
    }
    for (const a of allergies) {
      if (!a.allergen.trim()) continue;
      if (a._new || !a.id) {
        allergyOps.push(
          Promise.resolve(
            supabase.from("allergies").insert({
              device_id,
              user_id,
              allergen: a.allergen.trim(),
              severity: a.severity || null,
              reaction: a.reaction.trim() || null,
              notes: a.notes.trim() || null,
              source: "manual",
            }),
          ),
        );
      } else {
        allergyOps.push(
          Promise.resolve(
            supabase.from("allergies").update({
              allergen: a.allergen.trim(),
              severity: a.severity || null,
              reaction: a.reaction.trim() || null,
              notes: a.notes.trim() || null,
            }).eq("id", a.id),
          ),
        );
      }
    }
    const results = await Promise.all(allergyOps);
    setSaving(false);

    const firstErr = (mpRes as any)?.error || (results.find((r: any) => r?.error) as any)?.error;
    if (firstErr) { toast.error("Save failed: " + firstErr.message); return; }
    toast.success("Medical profile saved · حُفظ الملف الطبي");
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

  const TABS: { k: Tab; label: string; labelAr: string; icon: React.ReactNode }[] = [
    { k: "vitals", label: "Vitals", labelAr: "حيوية", icon: <Droplet size={11} /> },
    { k: "allergies", label: "Allergies", labelAr: "حساسية", icon: <AlertTriangle size={11} /> },
    { k: "past", label: "Past", labelAr: "السابق", icon: <History size={11} /> },
    { k: "surgical", label: "Surgical", labelAr: "جراحي", icon: <Scissors size={11} /> },
    { k: "family", label: "Family", labelAr: "عائلي", icon: <Users size={11} /> },
  ];

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--off-white)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--navy)", color: "white" }}>
        <button onClick={onClose} className="btn-press" aria-label="Close"><X size={20} /></button>
        <p className="font-display text-base">Medical Profile</p>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 btn-press" style={{ background: "var(--gold)", color: "var(--navy)" }}>
          <Save size={12} /> {saving ? "..." : "Save"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}>
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="flex-1 min-w-[64px] py-2.5 text-[11.5px] font-semibold transition-all flex flex-col items-center gap-0.5"
            style={{
              color: tab === t.k ? "var(--teal-deep)" : "var(--gray)",
              borderBottom: tab === t.k ? "2px solid var(--teal-deep)" : "2px solid transparent",
            }}
          >
            <span className="flex items-center gap-1">{t.icon}{t.label}</span>
            <span className="font-arabic text-[10px]" dir="rtl">{t.labelAr}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-[12px]" style={{ color: "var(--gray)" }}>Loading…</p>}

        {!loading && tab === "vitals" && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div>
              <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>BLOOD TYPE · فصيلة الدم</p>
              <div className="grid grid-cols-3 gap-2">
                {BLOOD_TYPES.map((bt) => {
                  const active = bloodType === bt;
                  return (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setBloodType(active ? "" : bt)}
                      className="py-2.5 rounded-lg text-[13px] font-bold btn-press transition-all"
                      style={{
                        background: active ? "rgba(217,79,79,0.1)" : "var(--off-white)",
                        border: active ? "1.5px solid #D94F4F" : "1px solid var(--gray-light)",
                        color: active ? "#D94F4F" : "var(--navy)",
                      }}
                    >
                      {bt}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px]" style={{ color: "var(--gray)" }}>
                Tap to select — tap again to clear · اضغط للاختيار أو الإلغاء
              </p>
            </div>
          </div>
        )}

        {!loading && tab === "allergies" && (
          <>
            {allergies.map((row, i) => (
              <RowCard
                key={row.id || `new-${i}`}
                onRemove={() => {
                  if (row.id && !row._new) setRemovedAllergyIds((ids) => [...ids, row.id!]);
                  setAllergies(allergies.filter((_, idx) => idx !== i));
                }}
              >
                <Field
                  value={row.allergen}
                  onChange={(v) => setAllergies(allergies.map((r, idx) => idx === i ? { ...r, allergen: v } : r))}
                  placeholder="Allergen (e.g. Penicillin, Peanuts)"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={row.severity}
                    onChange={(e) => setAllergies(allergies.map((r, idx) => idx === i ? { ...r, severity: e.target.value } : r))}
                    className="w-full px-2.5 py-1.5 rounded-md text-[12px] outline-none"
                    style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                  >
                    {SEVERITY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  <Field
                    value={row.reaction}
                    onChange={(v) => setAllergies(allergies.map((r, idx) => idx === i ? { ...r, reaction: v } : r))}
                    placeholder="Reaction (rash, swelling…)"
                  />
                </div>
                <Field
                  value={row.notes}
                  onChange={(v) => setAllergies(allergies.map((r, idx) => idx === i ? { ...r, notes: v } : r))}
                  placeholder="Notes (optional)"
                />
              </RowCard>
            ))}
            <button
              onClick={() => setAllergies([...allergies, { ...emptyAllergy }])}
              className="w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1 btn-press"
              style={{ background: "var(--white)", border: "1px dashed #D94F4F", color: "#D94F4F" }}
            >
              <Plus size={14} /> Add Allergy · أضف حساسية
            </button>
          </>
        )}

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
