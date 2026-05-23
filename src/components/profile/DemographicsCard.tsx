/**
 * DemographicsCard — focused demographics panel: DOB/age, gender,
 * nationality, language, marital status (if present), with one tap edit.
 */
import { useEffect, useState } from "react";
import { Calendar, User2, Globe, Languages, Heart, Pencil } from "lucide-react";
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
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const device_id = getDeviceId();
      const { data } = await supabase.from("profiles")
        .select("date_of_birth, gender, nationality, preferred_language")
        .eq("device_id", device_id).maybeSingle();
      if (cancelled) return;
      setRow(data || {});
      setLanguage((data as any)?.preferred_language || (typeof localStorage !== "undefined" ? localStorage.getItem("rufayq.language") : null));
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const gender = row?.gender === "male" ? "Male · ذكر" : row?.gender === "female" ? "Female · أنثى" : row?.gender || "";
  const age = ageOf(row?.date_of_birth || null);
  const dob = formatDate(row?.date_of_birth || null);
  const langLabel = language === "ar" ? "العربية · Arabic" : language === "en" ? "English · الإنجليزية" : (language || "");
  const residence = [row?.city, row?.country_of_residence].filter(Boolean).join(", ");

  return (
    <div className="mt-4 mx-4">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>DEMOGRAPHICS · الخصائص</p>
        <button onClick={() => onEdit("demo")} className="text-[10px] font-bold btn-press flex items-center gap-1" style={{ color: "var(--teal-deep)" }}>
          <Pencil size={10} /> Edit
        </button>
      </div>
      <div className="rounded-2xl px-3 py-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
        <div className="grid grid-cols-2 gap-x-2">
          <Cell icon={<Calendar size={13} />} label="DOB" labelAr="الميلاد" value={dob + (age != null ? ` · ${age}y` : "")} />
          <Cell icon={<User2 size={13} />} label="GENDER" labelAr="الجنس" value={gender} />
          <Cell icon={<Globe size={13} />} label="NATIONALITY" labelAr="الجنسية" value={row?.nationality || ""} />
          <Cell icon={<Heart size={13} />} label="MARITAL" labelAr="الحالة" value={row?.marital_status || ""} />
          <Cell icon={<Languages size={13} />} label="LANGUAGE" labelAr="اللغة" value={langLabel} />
          <Cell icon={<Globe size={13} />} label="RESIDENCE" labelAr="الإقامة" value={residence} />
        </div>
      </div>
    </div>
  );
};

export default DemographicsCard;
