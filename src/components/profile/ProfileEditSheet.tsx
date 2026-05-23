/**
 * ProfileEditSheet — comprehensive profile editor.
 * Sections: Identity (avatar + name EN/AR), Contact (phone/email),
 * Demographics (DOB, gender, nationality), IDs (Saudi ID, Iqama, Passport).
 * Writes to public.profiles via upsert keyed on device_id.
 */
import { useEffect, useMemo, useState } from "react";
import { X, Check, Loader2, User, Phone as PhoneIcon, Globe, IdCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import AvatarUploader from "@/components/profile/AvatarUploader";

interface Props { onClose: () => void; onSaved?: () => void; }

const Field = ({
  label, labelAr, value, onChange, placeholder, type = "text", dir,
}: {
  label: string; labelAr: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: "ltr" | "rtl";
}) => (
  <div className="mb-3">
    <div className="flex items-baseline justify-between mb-1 px-1">
      <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{label}</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <input
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} dir={dir}
      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-shadow focus:ring-2"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
    />
  </div>
);

const Select = ({
  label, labelAr, value, onChange, options,
}: { label: string; labelAr: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
  <div className="mb-3">
    <div className="flex items-baseline justify-between mb-1 px-1">
      <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{label}</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none appearance-none"
      style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
      <option value="">—</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Section = ({ icon, title, titleAr, children }: { icon: React.ReactNode; title: string; titleAr: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2 px-1">
      <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{icon}</span>
      <div>
        <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{title}</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
      </div>
    </div>
    <div className="rounded-xl p-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      {children}
    </div>
  </div>
);

const NATIONALITIES = ["Saudi Arabia", "United Arab Emirates", "Kuwait", "Bahrain", "Qatar", "Oman", "Egypt", "Jordan", "Other"];

const ProfileEditSheet = ({ onClose, onSaved }: Props) => {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"identity" | "contact" | "demo" | "ids">("identity");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [nationality, setNationality] = useState("");
  const [saudiId, setSaudiId] = useState("");
  const [iqama, setIqama] = useState("");
  const [passport, setPassport] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data } = await supabase
        .from("profiles")
        .select("full_name_en, full_name_ar, phone, email, date_of_birth, gender, nationality, saudi_id, iqama_number, passport_number")
        .eq("device_id", deviceId)
        .maybeSingle();
      if (cancelled) return;
      const meta = (session?.user?.user_metadata || {}) as Record<string, string>;
      setNameEn(data?.full_name_en || meta.full_name || meta.name || "");
      setNameAr(data?.full_name_ar || meta.full_name_ar || "");
      setPhone(data?.phone || session?.user?.phone || "");
      setEmail(data?.email || session?.user?.email || "");
      setDob(data?.date_of_birth || "");
      setGender(data?.gender || "");
      setNationality(data?.nationality || "Saudi Arabia");
      setSaudiId(data?.saudi_id || "");
      setIqama(data?.iqama_number || "");
      setPassport(data?.passport_number || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [deviceId]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        device_id: deviceId,
        full_name_en: nameEn.trim() || null,
        full_name_ar: nameAr.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        date_of_birth: dob || null,
        gender: gender || null,
        nationality: nationality || null,
        saudi_id: saudiId.trim() || null,
        iqama_number: iqama.trim() || null,
        passport_number: passport.trim() || null,
      }, { onConflict: "device_id" });
      if (error) throw error;
      toast.success("Profile updated · تم التحديث");
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Save failed · فشل الحفظ");
    } finally { setSaving(false); }
  };

  const tabs: { id: typeof tab; label: string; icon: React.ReactNode }[] = [
    { id: "identity", label: "Identity", icon: <User size={13} /> },
    { id: "contact", label: "Contact", icon: <PhoneIcon size={13} /> },
    { id: "demo", label: "Demographics", icon: <Globe size={13} /> },
    { id: "ids", label: "IDs", icon: <IdCard size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.65)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-t-3xl pb-6 pt-3 px-5 max-h-[94vh] overflow-y-auto" style={{ background: "var(--off-white)" }}>
        <div className="mx-auto w-10 h-1 rounded-full mb-3" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-[18px]" style={{ color: "var(--navy)" }}>Edit profile</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>تعديل الملف الشخصي</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--gray-light)" }}><X size={16} /></button>
        </div>

        <div className="flex flex-col items-center mb-4 py-4 rounded-xl" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <AvatarUploader />
          <p className="text-[10px] mt-2" style={{ color: "var(--gray)" }}>Tap to change photo · غيّر الصورة</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold btn-press transition-all"
              style={{ background: tab === t.id ? "var(--teal-deep)" : "transparent", color: tab === t.id ? "#fff" : "var(--gray)" }}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="animate-spin" size={18} style={{ color: "var(--teal-deep)" }} /></div>
        ) : (
          <>
            {tab === "identity" && (
              <Section icon={<User size={13} />} title="Your name" titleAr="اسمك">
                <Field label="FULL NAME (EN)" labelAr="الاسم بالإنجليزية" value={nameEn} onChange={setNameEn} placeholder="Your full name" />
                <Field label="FULL NAME (AR)" labelAr="الاسم بالعربية" value={nameAr} onChange={setNameAr} placeholder="اسمك الكامل" dir="rtl" />
              </Section>
            )}
            {tab === "contact" && (
              <Section icon={<PhoneIcon size={13} />} title="Contact details" titleAr="بيانات التواصل">
                <Field label="PHONE" labelAr="رقم الجوال" value={phone} onChange={setPhone} placeholder="+966 5X XXX XXXX" type="tel" />
                <Field label="EMAIL" labelAr="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
              </Section>
            )}
            {tab === "demo" && (
              <Section icon={<Globe size={13} />} title="Demographics" titleAr="البيانات الديموغرافية">
                <Field label="DATE OF BIRTH" labelAr="تاريخ الميلاد" value={dob} onChange={setDob} type="date" />
                <Select label="GENDER" labelAr="الجنس" value={gender} onChange={setGender}
                  options={[{ v: "male", l: "Male · ذكر" }, { v: "female", l: "Female · أنثى" }, { v: "other", l: "Prefer not to say" }]} />
                <Select label="NATIONALITY" labelAr="الجنسية" value={nationality} onChange={setNationality}
                  options={NATIONALITIES.map((n) => ({ v: n, l: n }))} />
              </Section>
            )}
            {tab === "ids" && (
              <Section icon={<IdCard size={13} />} title="Identity documents" titleAr="وثائق الهوية">
                <Field label="SAUDI NATIONAL ID" labelAr="رقم الهوية الوطنية" value={saudiId} onChange={setSaudiId} placeholder="10 digits" />
                <Field label="IQAMA NUMBER" labelAr="رقم الإقامة" value={iqama} onChange={setIqama} placeholder="Optional" />
                <Field label="PASSPORT NUMBER" labelAr="رقم جواز السفر" value={passport} onChange={setPassport} placeholder="e.g. K482916" />
              </Section>
            )}

            <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 btn-press mt-2 shadow-lg" style={{ background: "var(--teal-deep)", opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Save changes · حفظ التغييرات
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileEditSheet;
