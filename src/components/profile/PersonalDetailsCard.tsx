/**
 * PersonalDetailsCard — shows the signed-in user's gathered profile info
 * (name EN/AR, phone, email, DOB, gender, nationality, IDs) with a
 * completion meter, a missing-fields checklist, prominent RufayQ ID
 * with copy + share, and a single tap-to-edit affordance.
 */
import { useEffect, useState } from "react";
import { Pencil, Mail, Phone, User2, Globe, IdCard, Copy, Share2, Check, Circle, QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props { onEdit: (tab?: string) => void; reloadKey?: number; onShareId?: () => void }

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

const PersonalDetailsCard = ({ onEdit, reloadKey, onShareId }: Props) => {
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

  const shareId = async () => {
    if (!data?.rufayq_id) return;
    const text = `My RufayQ ID: ${data.rufayq_id}`;
    if (onShareId) { onShareId(); return; }
    if (navigator.share) {
      try { await navigator.share({ title: "RufayQ ID", text }); return; } catch { /* cancelled */ }
    }
    copy(data.rufayq_id, "RufayQ ID");
  };

  // Checklist of profile fields (ordered by importance)
  const checklist = data ? [
    { key: "name", label: "Full name", labelAr: "الاسم الكامل", done: !!data.full_name_en, tab: "identity" },
    { key: "nameAr", label: "Arabic name", labelAr: "الاسم بالعربية", done: !!data.full_name_ar, tab: "identity" },
    { key: "phone", label: "Phone number", labelAr: "رقم الجوال", done: !!data.phone, tab: "contact" },
    { key: "email", label: "Email address", labelAr: "البريد الإلكتروني", done: !!data.email, tab: "contact" },
    { key: "dob", label: "Date of birth", labelAr: "تاريخ الميلاد", done: !!data.date_of_birth, tab: "demo" },
    { key: "gender", label: "Gender", labelAr: "الجنس", done: !!data.gender, tab: "demo" },
    { key: "nationality", label: "Nationality", labelAr: "الجنسية", done: !!data.nationality, tab: "demo" },
    { key: "ids", label: "National ID or Iqama", labelAr: "الهوية أو الإقامة", done: !!(data.saudi_id || data.iqama_number), tab: "ids" },
    { key: "passport", label: "Passport number", labelAr: "جواز السفر", done: !!data.passport_number, tab: "ids" },
  ] : [];
  const filled = checklist.filter((c) => c.done).length;
  const pct = checklist.length ? Math.round((filled / checklist.length) * 100) : 0;
  const missing = checklist.filter((c) => !c.done);

  if (loading) {
    return (
      <div className="mx-4 mt-3 rounded-2xl p-5 animate-pulse" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", height: 220 }} />
    );
  }

  const genderLabel = data?.gender === "male" ? "Male · ذكر" : data?.gender === "female" ? "Female · أنثى" : data?.gender ? "Prefer not to say" : "";

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--gray-light)" }}>
        <div>
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>PERSONAL DETAILS</p>
          <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>بياناتك الشخصية</p>
        </div>
        <button onClick={() => onEdit()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full btn-press text-[11px] font-semibold" style={{ background: "var(--teal-deep)", color: "#fff" }}>
          <Pencil size={11} /> Edit
        </button>
      </div>

      {/* Prominent RufayQ ID hero */}
      {data?.rufayq_id && (
        <div className="px-4 pt-3">
          <div className="rounded-xl p-3 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--navy) 100%)" }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <QrCode size={11} style={{ color: "var(--gold)" }} />
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>RUFAYQ ID</p>
                </div>
                <p className="font-mono text-[18px] font-bold truncate mt-0.5" style={{ color: "#fff", letterSpacing: "0.05em" }}>{data.rufayq_id}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Share to connect · شارك للتواصل</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => copy(data.rufayq_id!, "RufayQ ID")} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)" }} aria-label="Copy ID">
                  <Copy size={14} style={{ color: "#fff" }} />
                </button>
                <button onClick={shareId} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gold)" }} aria-label="Share ID">
                  <Share2 size={14} style={{ color: "var(--navy)" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion meter */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold" style={{ color: "var(--gray)" }}>Profile completeness · اكتمال الملف</p>
          <p className="text-[11px] font-bold" style={{ color: pct >= 80 ? "#3DAA6E" : "var(--gold)" }}>{filled}/{checklist.length} · {pct}%</p>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: "var(--gray-light)" }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? "#3DAA6E" : "var(--gold)" }} />
        </div>
      </div>

      {/* Missing-fields checklist */}
      {missing.length > 0 && (
        <div className="mx-4 mb-2 rounded-xl p-2.5" style={{ background: "var(--off-white)", border: "1px dashed var(--gray-light)" }}>
          <p className="text-[10px] font-semibold mb-1.5 px-1" style={{ color: "var(--navy)" }}>
            Next steps · الخطوات التالية
          </p>
          <div className="space-y-1">
            {missing.slice(0, 4).map((m) => (
              <button key={m.key} onClick={() => onEdit(m.tab)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg btn-press text-left transition-colors hover:bg-white">
                <Circle size={12} style={{ color: "var(--gold)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{m.label}</p>
                  <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{m.labelAr}</p>
                </div>
                <span className="text-[10px] font-bold" style={{ color: "var(--teal-deep)" }}>Add →</span>
              </button>
            ))}
            {missing.length > 4 && (
              <p className="text-[10px] text-center pt-1" style={{ color: "var(--gray)" }}>
                +{missing.length - 4} more · المزيد
              </p>
            )}
          </div>
        </div>
      )}
      {missing.length === 0 && (
        <div className="mx-4 mb-2 rounded-xl p-2.5 flex items-center gap-2" style={{ background: "rgba(61,170,110,0.08)", border: "1px solid rgba(61,170,110,0.2)" }}>
          <Check size={14} style={{ color: "#3DAA6E" }} />
          <p className="text-[11px] font-semibold" style={{ color: "#3DAA6E" }}>Profile complete · الملف مكتمل</p>
        </div>
      )}

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
        {(() => {
          const isSaudi = (data?.nationality || "").toLowerCase().includes("saudi");
          const idLabel = isSaudi ? "SAUDI ID" : "NATIONAL ID";
          const idLabelAr = isSaudi ? "الهوية" : "الهوية الوطنية";
          return (
            <Row icon={<IdCard size={14} />} label={idLabel} labelAr={idLabelAr} value={data?.saudi_id ? mask(data.saudi_id) : ""} onCopy={data?.saudi_id ? () => copy(data.saudi_id!, idLabel) : undefined} mono />
          );
        })()}
        {data?.iqama_number && (
          <Row icon={<IdCard size={14} />} label="IQAMA" labelAr="الإقامة" value={mask(data.iqama_number)} onCopy={() => copy(data.iqama_number!, "Iqama")} mono />
        )}
        <Row icon={<Globe size={14} />} label="PASSPORT" labelAr="جواز السفر" value={data?.passport_number || ""} onCopy={data?.passport_number ? () => copy(data.passport_number!, "Passport") : undefined} mono />
      </div>
    </div>
  );
};

export default PersonalDetailsCard;
