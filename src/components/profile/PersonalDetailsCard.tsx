/**
 * PersonalDetailsCard — shows the signed-in user's gathered profile info
 * (name EN/AR, phone, email, DOB, gender, nationality, IDs) with a
 * completion meter and a single tap-to-edit affordance.
 */
import { useEffect, useState } from "react";
import { Pencil, Mail, Phone, Calendar, User2, Globe, IdCard, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props { onEdit: () => void; reloadKey?: number }

interface ProfileRow {
  full_name_en: string | null;
  full_name_ar: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  saudi_id: string | null;
  iqama_number: string | null;
  passport_number: string | null;
  rufayq_id: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const mask = (v: string | null) => v ? `•••• ${v.slice(-4)}` : "";

const Row = ({ icon, label, labelAr, value, onCopy, mono }: { icon: React.ReactNode; label: string; labelAr: string; value: string; onCopy?: () => void; mono?: boolean }) => (
  <div className="flex items-center gap-3 py-2.5 px-1">
    <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gray)" }}>{label}</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
      <p className={`text-[13px] font-semibold truncate ${mono ? "font-mono" : ""}`} style={{ color: value ? "var(--navy)" : "var(--gray)" }}>
        {value || "Not set · غير محدد"}
      </p>
    </div>
    {value && onCopy && (
      <button onClick={onCopy} className="p-1.5 rounded-full btn-press" aria-label="Copy">
        <Copy size={12} style={{ color: "var(--teal-deep)" }} />
      </button>
    )}
  </div>
);

const PersonalDetailsCard = ({ onEdit, reloadKey }: Props) => {
  const [data, setData] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const deviceId = getDeviceId();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: row } = await supabase
        .from("profiles")
        .select("full_name_en, full_name_ar, phone, email, date_of_birth, gender, nationality, saudi_id, iqama_number, passport_number, rufayq_id")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (cancelled) return;
      const meta = (session?.user?.user_metadata || {}) as Record<string, string>;
      setData({
        full_name_en: row?.full_name_en || meta.full_name || meta.name || null,
        full_name_ar: row?.full_name_ar || meta.full_name_ar || null,
        phone: row?.phone || session?.user?.phone || null,
        email: row?.email || session?.user?.email || null,
        date_of_birth: row?.date_of_birth || null,
        gender: row?.gender || null,
        nationality: row?.nationality || null,
        saudi_id: row?.saudi_id || null,
        iqama_number: row?.iqama_number || null,
        passport_number: row?.passport_number || null,
        rufayq_id: row?.rufayq_id || null,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied · تم النسخ`);
  };

  const fields = data ? [
    data.full_name_en, data.full_name_ar, data.phone, data.email,
    data.date_of_birth, data.gender, data.nationality,
    data.saudi_id || data.iqama_number, data.passport_number,
  ] : [];
  const filled = fields.filter(Boolean).length;
  const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-4 mt-3 rounded-2xl p-5 animate-pulse" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", height: 220 }} />
    );
  }

  const genderLabel = data?.gender === "male" ? "Male · ذكر" : data?.gender === "female" ? "Female · أنثى" : data?.gender ? "Prefer not to say" : "";

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      {/* Header with completion */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--gray-light)" }}>
        <div>
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>PERSONAL DETAILS</p>
          <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>بياناتك الشخصية</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-press text-[11px] font-semibold" style={{ background: "var(--teal-deep)", color: "#fff" }}>
          <Pencil size={11} /> Edit
        </button>
      </div>

      {/* Completion meter */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold" style={{ color: "var(--gray)" }}>Profile completeness</p>
          <p className="text-[11px] font-bold" style={{ color: pct >= 80 ? "#3DAA6E" : "var(--gold)" }}>{pct}%</p>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: "var(--gray-light)" }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? "#3DAA6E" : "var(--gold)" }} />
        </div>
        {data?.rufayq_id && (
          <div className="mt-2 flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: "var(--off-white)" }}>
            <span className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>RUFAYQ ID</span>
            <button onClick={() => copy(data.rufayq_id!, "RufayQ ID")} className="flex items-center gap-1 font-mono text-[11px] font-bold btn-press" style={{ color: "var(--teal-deep)" }}>
              {data.rufayq_id} <Copy size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="px-3 pb-2">
        <Row icon={<User2 size={14} />} label="NAME" labelAr="الاسم" value={data?.full_name_en || ""} onCopy={data?.full_name_en ? () => copy(data.full_name_en!, "Name") : undefined} />
        {data?.full_name_ar && (
          <div className="flex items-center gap-3 py-1.5 px-1 -mt-2">
            <span className="w-8" />
            <p className="font-arabic text-[14px]" dir="rtl" style={{ color: "var(--navy)" }}>{data.full_name_ar}</p>
          </div>
        )}
        <Row icon={<Phone size={14} />} label="PHONE" labelAr="الجوال" value={data?.phone || ""} onCopy={data?.phone ? () => copy(data.phone!, "Phone") : undefined} mono />
        <Row icon={<Mail size={14} />} label="EMAIL" labelAr="البريد" value={data?.email || ""} onCopy={data?.email ? () => copy(data.email!, "Email") : undefined} />
      </div>

      <div className="px-4 py-2 grid grid-cols-3 gap-2" style={{ background: "var(--off-white)" }}>
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>DOB</p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: data?.date_of_birth ? "var(--navy)" : "var(--gray)" }}>
            {formatDate(data?.date_of_birth ?? null) || "—"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>GENDER</p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: genderLabel ? "var(--navy)" : "var(--gray)" }}>
            {genderLabel || "—"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>NATIONALITY</p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: data?.nationality ? "var(--navy)" : "var(--gray)" }}>
            {data?.nationality || "—"}
          </p>
        </div>
      </div>

      <div className="px-3 pt-2 pb-3">
        <Row icon={<IdCard size={14} />} label="SAUDI ID" labelAr="الهوية" value={data?.saudi_id ? mask(data.saudi_id) : ""} onCopy={data?.saudi_id ? () => copy(data.saudi_id!, "Saudi ID") : undefined} mono />
        {data?.iqama_number && (
          <Row icon={<IdCard size={14} />} label="IQAMA" labelAr="الإقامة" value={mask(data.iqama_number)} onCopy={() => copy(data.iqama_number!, "Iqama")} mono />
        )}
        <Row icon={<Globe size={14} />} label="PASSPORT" labelAr="جواز السفر" value={data?.passport_number || ""} onCopy={data?.passport_number ? () => copy(data.passport_number!, "Passport") : undefined} mono />
      </div>
    </div>
  );
};

export default PersonalDetailsCard;
