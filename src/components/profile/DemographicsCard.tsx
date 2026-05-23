/**
 * DemographicsCard — focused demographics panel: DOB/age, gender,
 * nationality, city, marital status, occupation. Tap chevron to expand.
 */
import { useEffect, useState } from "react";
import { Calendar, User2, Globe, MapPin, Heart, Briefcase, Pencil, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props { onEdit: (tab?: string) => void; reloadKey?: number }

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};
const ageOf = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  const t = new Date(); let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
};

const MARITAL_LABELS: Record<string, string> = {
  single: "Single · أعزب",
  married: "Married · متزوج",
  divorced: "Divorced · مطلّق",
  widowed: "Widowed · أرمل",
};

const Cell = ({ icon, label, labelAr, value }: { icon: React.ReactNode; label: string; labelAr: string; value: string }) => (
  <div className="flex items-start gap-2.5 py-2">
    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-1.5">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{label}</p>
        <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
      <p className="text-[12.5px] font-semibold truncate" style={{ color: value ? "var(--navy)" : "var(--gray)" }}>{value || "—"}</p>
    </div>
  </div>
);

const DemographicsCard = ({ onEdit, reloadKey }: Props) => {
  const [row, setRow] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const device_id = getDeviceId();
      const { data, error } = await supabase.from("profiles")
        .select("date_of_birth, gender, nationality, city_of_residence, marital_status, occupation")
        .eq("device_id", device_id).maybeSingle();
      if (cancelled) return;
      if (error) console.warn("DemographicsCard load:", error.message);
      setRow(data || {});
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const gender = row?.gender === "male" ? "Male · ذكر" : row?.gender === "female" ? "Female · أنثى" : row?.gender || "";
  const age = ageOf(row?.date_of_birth || null);
  const dob = formatDate(row?.date_of_birth || null);
  const marital = row?.marital_status ? (MARITAL_LABELS[row.marital_status] || row.marital_status) : "";

  return (
    <div className="mt-4 mx-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>DEMOGRAPHICS · الخصائص</p>
        <div className="flex items-center gap-3">
          <button onClick={() => onEdit("demo")} className="text-[10px] font-bold btn-press flex items-center gap-1" style={{ color: "var(--teal-deep)" }}>
            <Pencil size={10} /> Edit
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="w-6 h-6 rounded-full flex items-center justify-center btn-press"
            style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
          >
            <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left rounded-2xl px-3 py-2 btn-press"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      >
        <div className="grid grid-cols-2 gap-x-2">
          <Cell icon={<Calendar size={13} />} label="DOB" labelAr="الميلاد" value={dob + (age != null ? ` · ${age}y` : "")} />
          <Cell icon={<User2 size={13} />} label="GENDER" labelAr="الجنس" value={gender} />
          <Cell icon={<Globe size={13} />} label="NATIONALITY" labelAr="الجنسية" value={row?.nationality || ""} />
          <Cell icon={<MapPin size={13} />} label="CITY" labelAr="المدينة" value={row?.city_of_residence ? `${row.city_of_residence}${row?.nationality ? ` · ${row.nationality}` : ""}` : ""} />
          {expanded && (
            <>
              <Cell icon={<Heart size={13} />} label="MARITAL" labelAr="الحالة الاجتماعية" value={marital} />
              <Cell icon={<Briefcase size={13} />} label="OCCUPATION" labelAr="المهنة" value={row?.occupation || ""} />
            </>
          )}
        </div>
      </button>
    </div>
  );
};

export default DemographicsCard;
