/**
 * ProfileEditSheet — comprehensive profile editor.
 * Sections: Identity (avatar + name EN/AR), Contact (phone/email),
 * Demographics (DOB, gender, nationality), IDs (Saudi ID, Iqama, Passport).
 * Writes to public.profiles via upsert keyed on device_id.
 * Includes inline validation + formatting for phone, DOB, and IDs.
 */
import { useEffect, useMemo, useState } from "react";
import { X, Check, Loader2, User, Phone as PhoneIcon, Globe, IdCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import AvatarUploader from "@/components/profile/AvatarUploader";
import {
  formatPhone, validatePhone, validateDob, validateSaudiId,
  validateIqama, validatePassport, validateEmail,
  validateArabicName, validateEnglishName,
} from "@/lib/profile/validation";

interface Props { onClose: () => void; onSaved?: () => void; initialTab?: TabId }
type TabId = "identity" | "contact" | "demo" | "ids";

const Field = ({
  label, labelAr, value, onChange, onBlur, placeholder, type = "text", dir, error, hint, maxLength, inputMode,
}: {
  label: string; labelAr: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; type?: string; dir?: "ltr" | "rtl";
  error?: string | null; hint?: string; maxLength?: number;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal" | "search" | "url" | "none";
}) => (
  <div className="mb-3.5">
    <div className="flex items-baseline justify-between mb-1.5 px-0.5">
      <p className="font-mono text-[9.5px] tracking-[0.18em] font-bold" style={{ color: "var(--gold)" }}>{label}</p>
      <p className="font-arabic text-[10.5px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <input
      value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
      type={type} dir={dir} maxLength={maxLength} inputMode={inputMode}
      className={`w-full px-3.5 py-3 rounded-xl text-[14px] outline-none transition-all focus:ring-2 focus:ring-offset-0 ${dir === "rtl" ? "font-arabic text-right" : ""}`}
      style={{
        background: "#ffffff",
        border: `1.5px solid ${error ? "#E5564A" : "rgba(11,26,42,0.18)"}`,
        color: "var(--navy)",
        minHeight: 46,
        boxShadow: "0 1px 2px rgba(11,26,42,0.04)",
      }}
    />
    {error ? (
      <p className="flex items-center gap-1 mt-1.5 px-1 text-[10.5px] font-semibold" style={{ color: "#E5564A" }}>
        <AlertCircle size={11} /> {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 px-1 text-[10.5px]" style={{ color: "var(--gray)" }}>{hint}</p>
    ) : null}
  </div>
);

const Select = ({
  label, labelAr, value, onChange, options,
}: { label: string; labelAr: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) => (
  <div className="mb-3.5">
    <div className="flex items-baseline justify-between mb-1.5 px-0.5">
      <p className="font-mono text-[9.5px] tracking-[0.18em] font-bold" style={{ color: "var(--gold)" }}>{label}</p>
      <p className="font-arabic text-[10.5px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-3 rounded-xl text-[14px] outline-none appearance-none"
      style={{ background: "#ffffff", border: "1.5px solid var(--gray-light)", color: "var(--navy)", boxShadow: "0 1px 2px rgba(11,26,42,0.04)" }}>
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

const ProfileEditSheet = ({ onClose, onSaved, initialTab }: Props) => {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>(initialTab || "identity");
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
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const setErr = (k: string, v: string | null) => setErrors((p) => ({ ...p, [k]: v }));

  // Today as ISO for date input max
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
      setPhone(formatPhone(data?.phone || session?.user?.phone || ""));
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

  const validateAll = () => {
    const isSaudi = (nationality || "").toLowerCase().includes("saudi");
    const next: Record<string, string | null> = {
      nameEn: validateEnglishName(nameEn, true).error,
      nameAr: validateArabicName(nameAr, true).error,
      phone: validatePhone(phone).error,
      email: validateEmail(email).error,
      dob: validateDob(dob).error,
      saudiId: isSaudi ? validateSaudiId(saudiId).error : null,
      iqama: validateIqama(iqama).error,
      passport: validatePassport(passport).error,
    };
    setErrors(next);
    return Object.values(next).every((e) => !e);
  };

  const save = async () => {
    if (!validateAll()) {
      toast.error("Please fix the highlighted fields · صحّح الحقول");
      // Jump to first invalid tab
      if (errors.nameEn || errors.nameAr) setTab("identity");
      else if (errors.phone || errors.email) setTab("contact");
      else if (errors.dob) setTab("demo");
      else if (errors.saudiId || errors.iqama || errors.passport) setTab("ids");
      return;
    }
    setSaving(true);
    try {
      // Normalize Arabic name: trim, collapse internal whitespace, strip
      // zero-width chars so a saved value is never visually blank.
      const normalizeAr = (s: string) =>
        s.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
         .replace(/\s+/g, " ")
         .trim();
      const normalizeEn = (s: string) => s.replace(/\s+/g, " ").trim();
      const nameArClean = normalizeAr(nameAr);
      const nameEnClean = normalizeEn(nameEn);
      const { error } = await supabase.from("profiles").upsert({
        device_id: deviceId,
        full_name_en: nameEnClean || null,
        full_name_ar: nameArClean || null,
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
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
    } catch (e: any) {
      console.error("Profile save error:", e);
      const msg = e?.message || e?.error_description || "Unknown error";
      toast.error(`Save failed · ${msg}`);
    } finally { setSaving(false); }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; hasError: boolean }[] = [
    { id: "identity", label: "Identity", icon: <User size={13} />, hasError: !!(errors.nameEn || errors.nameAr) },
    { id: "contact", label: "Contact", icon: <PhoneIcon size={13} />, hasError: !!(errors.phone || errors.email) },
    { id: "demo", label: "Demographics", icon: <Globe size={13} />, hasError: !!errors.dob },
    { id: "ids", label: "IDs", icon: <IdCard size={13} />, hasError: !!(errors.saudiId || errors.iqama || errors.passport) },
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
            <button key={t.id} onClick={() => setTab(t.id)} className="relative flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold btn-press transition-all"
              style={{ background: tab === t.id ? "var(--teal-deep)" : "transparent", color: tab === t.id ? "#fff" : "var(--gray)" }}>
              {t.icon}<span>{t.label}</span>
              {t.hasError && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#E5564A" }} />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader2 className="animate-spin" size={18} style={{ color: "var(--teal-deep)" }} /></div>
        ) : (
          <>
            {tab === "identity" && (
              <Section icon={<User size={13} />} title="Your name" titleAr="اسمك">
                <Field
                  label="FULL NAME (EN)" labelAr="الاسم بالإنجليزية"
                  value={nameEn}
                  onChange={(v) => { setNameEn(v); if (errors.nameEn) setErr("nameEn", null); }}
                  onBlur={() => setErr("nameEn", validateEnglishName(nameEn, true).error)}
                  placeholder="Your full name" maxLength={80}
                  error={errors.nameEn} hint="English letters only · required"
                />
                <Field
                  label="FULL NAME (AR)" labelAr="الاسم بالعربية"
                  value={nameAr}
                  onChange={(v) => { setNameAr(v); if (errors.nameAr) setErr("nameAr", null); }}
                  onBlur={() => setErr("nameAr", validateArabicName(nameAr, true).error)}
                  placeholder="اسمك الكامل" dir="rtl" maxLength={80}
                  error={errors.nameAr} hint="أحرف عربية فقط · مطلوب"
                />
              </Section>
            )}
            {tab === "contact" && (
              <Section icon={<PhoneIcon size={13} />} title="Contact details" titleAr="بيانات التواصل">
                <Field
                  label="PHONE" labelAr="رقم الجوال"
                  value={phone}
                  onChange={(v) => { setPhone(formatPhone(v)); if (errors.phone) setErr("phone", null); }}
                  onBlur={() => setErr("phone", validatePhone(phone).error)}
                  placeholder="+966 5X XXX XXXX" type="tel" inputMode="tel"
                  error={errors.phone} hint="Saudi format auto-applied"
                />
                <Field
                  label="EMAIL" labelAr="البريد الإلكتروني"
                  value={email}
                  onChange={(v) => { setEmail(v); if (errors.email) setErr("email", null); }}
                  onBlur={() => setErr("email", validateEmail(email).error)}
                  placeholder="you@example.com" type="email" inputMode="email"
                  error={errors.email}
                />
              </Section>
            )}
            {tab === "demo" && (
              <Section icon={<Globe size={13} />} title="Demographics" titleAr="البيانات الديموغرافية">
                <Field
                  label="DATE OF BIRTH" labelAr="تاريخ الميلاد"
                  value={dob}
                  onChange={(v) => { setDob(v); setErr("dob", validateDob(v).error); }}
                  type="date" maxLength={10} error={errors.dob}
                  hint="Must be a past date"
                />
                <Select label="GENDER" labelAr="الجنس" value={gender} onChange={setGender}
                  options={[{ v: "male", l: "Male · ذكر" }, { v: "female", l: "Female · أنثى" }, { v: "other", l: "Prefer not to say" }]} />
                <Select label="NATIONALITY" labelAr="الجنسية" value={nationality} onChange={setNationality}
                  options={NATIONALITIES.map((n) => ({ v: n, l: n }))} />
              </Section>
            )}
            {tab === "ids" && (() => {
              const isSaudi = (nationality || "").toLowerCase().includes("saudi");
              const isGcc = ["united arab emirates","kuwait","bahrain","qatar","oman"].some(c => (nationality||"").toLowerCase().includes(c));
              const idLabel = isSaudi ? "SAUDI NATIONAL ID" : "NATIONAL ID";
              const idLabelAr = isSaudi ? "رقم الهوية الوطنية" : "رقم الهوية الوطنية / بطاقة الجنسية";
              const idPlaceholder = isSaudi
                ? "10 digits starting with 1 or 2"
                : "Enter your national ID";
              const idHint = isSaudi
                ? "Citizens: 1•••, residents: 2•••"
                : `For ${nationality || "your country"} — as printed on your ID card`;
              return (
              <Section icon={<IdCard size={13} />} title="Identity documents" titleAr="وثائق الهوية">
                <Field
                  label={idLabel} labelAr={idLabelAr}
                  value={saudiId}
                  onChange={(v) => {
                    const cleaned = isSaudi
                      ? v.replace(/\D+/g, "").slice(0, 10)
                      : v.replace(/[^A-Za-z0-9\-\s]/g, "").slice(0, 20);
                    setSaudiId(cleaned);
                    if (errors.saudiId) setErr("saudiId", null);
                  }}
                  onBlur={() => isSaudi && setErr("saudiId", validateSaudiId(saudiId).error)}
                  placeholder={idPlaceholder}
                  inputMode={isSaudi ? "numeric" : "text"}
                  maxLength={isSaudi ? 10 : 20}
                  error={isSaudi ? errors.saudiId : null}
                  hint={idHint}
                />
                {(isSaudi || isGcc) && (
                  <Field
                    label="IQAMA NUMBER" labelAr="رقم الإقامة"
                    value={iqama}
                    onChange={(v) => {
                      const cleaned = v.replace(/\D+/g, "").slice(0, 10);
                      setIqama(cleaned);
                      if (errors.iqama) setErr("iqama", null);
                    }}
                    onBlur={() => setErr("iqama", validateIqama(iqama).error)}
                    placeholder="10 digits (optional)"
                    inputMode="numeric" maxLength={10}
                    error={errors.iqama}
                    hint="For residents of Saudi Arabia"
                  />
                )}
                <Field
                  label="PASSPORT NUMBER" labelAr="رقم جواز السفر"
                  value={passport}
                  onChange={(v) => {
                    const cleaned = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9);
                    setPassport(cleaned);
                    if (errors.passport) setErr("passport", null);
                  }}
                  onBlur={() => setErr("passport", validatePassport(passport).error)}
                  placeholder="e.g. K4829167"
                  maxLength={9}
                  error={errors.passport} hint="6–9 letters/digits"
                />
              </Section>
              );
            })()}

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
