/**
 * MedicalSummaryCard — expanded medical box showing blood type, top
 * conditions, top allergies with quick View (open history) / Edit actions.
 */
import { useEffect, useState } from "react";
import { Droplet, Activity, AlertTriangle, ChevronRight, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props {
  onOpenHistory: () => void;
  reloadKey?: number;
}

interface Condition { condition: string; status?: string }

const MedicalSummaryCard = ({ onOpenHistory, reloadKey }: Props) => {
  const [loading, setLoading] = useState(true);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [allergies, setAllergies] = useState<{ allergen: string; severity?: string | null }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const device_id = getDeviceId();
      const [mp, al] = await Promise.all([
        supabase.from("medical_profiles")
          .select("blood_type, past_medical_history")
          .eq("device_id", device_id).maybeSingle(),
        supabase.from("allergies")
          .select("allergen, severity")
          .eq("device_id", device_id)
          .is("deleted_at", null)
          .limit(8),
      ]);
      if (cancelled) return;
      setBloodType((mp.data as any)?.blood_type || null);
      const past = ((mp.data as any)?.past_medical_history || []) as Condition[];
      setConditions(past.filter((p) => p?.condition));
      setAllergies(((al.data as any) || []) as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const sevColor = (s?: string | null) => {
    const v = (s || "").toLowerCase();
    if (v.includes("severe") || v.includes("anaph")) return "#D94F4F";
    if (v.includes("moderate")) return "var(--gold)";
    return "var(--teal-deep)";
  };

  return (
    <div className="mt-4 mx-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>MEDICAL · طبي</p>
        <button onClick={onOpenHistory} className="text-[10px] font-bold btn-press flex items-center gap-1" style={{ color: "var(--teal-deep)" }}>
          <Pencil size={10} /> Edit
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
        {/* Blood type hero strip */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(217,79,79,0.08), rgba(217,79,79,0.02))", borderBottom: "1px solid var(--gray-light)" }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(217,79,79,0.12)", color: "#D94F4F" }}>
            <Droplet size={16} />
          </span>
          <div className="flex-1">
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gray)" }}>BLOOD TYPE · فصيلة الدم</p>
            <p className="text-[18px] font-bold leading-none mt-0.5" style={{ color: bloodType ? "#D94F4F" : "var(--gray)" }}>
              {bloodType || "Not set"}
            </p>
          </div>
          <button onClick={onOpenHistory} className="px-3 py-1.5 rounded-full text-[11px] font-semibold btn-press" style={{ background: "var(--off-white)", color: "var(--navy)" }}>
            {bloodType ? "Edit" : "Add"}
          </button>
        </div>

        {/* Conditions */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--gray-light)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity size={12} style={{ color: "var(--teal-deep)" }} />
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>CONDITIONS · الحالات</p>
              <span className="font-mono text-[9px] px-1.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{conditions.length}</span>
            </div>
          </div>
          {loading ? (
            <p className="text-[11px]" style={{ color: "var(--gray)" }}>Loading…</p>
          ) : conditions.length === 0 ? (
            <button onClick={onOpenHistory} className="text-[11px] font-semibold btn-press" style={{ color: "var(--teal-deep)" }}>+ Add condition · أضف حالة</button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {conditions.slice(0, 5).map((c, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
                  {c.condition}{c.status ? ` · ${c.status}` : ""}
                </span>
              ))}
              {conditions.length > 5 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--gray)" }}>
                  +{conditions.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Allergies */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} style={{ color: "#D94F4F" }} />
              <p className="font-mono text-[9px] tracking-widest" style={{ color: "#D94F4F" }}>ALLERGIES · الحساسية</p>
              <span className="font-mono text-[9px] px-1.5 rounded-full" style={{ background: "rgba(217,79,79,0.1)", color: "#D94F4F" }}>{allergies.length}</span>
            </div>
          </div>
          {loading ? (
            <p className="text-[11px]" style={{ color: "var(--gray)" }}>Loading…</p>
          ) : allergies.length === 0 ? (
            <button onClick={onOpenHistory} className="text-[11px] font-semibold btn-press" style={{ color: "var(--teal-deep)" }}>+ Add allergy · أضف حساسية</button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allergies.slice(0, 6).map((a, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(217,79,79,0.08)", color: sevColor(a.severity), border: `1px solid ${sevColor(a.severity)}33` }}>
                  {a.allergen}{a.severity ? ` · ${a.severity}` : ""}
                </span>
              ))}
              {allergies.length > 6 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--off-white)", color: "var(--gray)" }}>
                  +{allergies.length - 6}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="grid grid-cols-2 border-t" style={{ borderColor: "var(--gray-light)" }}>
          <button onClick={onOpenHistory} className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold btn-press" style={{ color: "var(--navy)", borderRight: "1px solid var(--gray-light)" }}>
            <Eye size={13} /> View all
          </button>
          <button onClick={onOpenHistory} className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold btn-press" style={{ color: "var(--teal-deep)" }}>
            <Pencil size={13} /> Manage
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalSummaryCard;
