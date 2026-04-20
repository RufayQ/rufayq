import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Stethoscope, Package, Shield, Upload, CheckCircle2, FileText, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A", TEAL = "#1FB6A7";

type OrgType = "hospital" | "clinic" | "vendor" | "insurance" | "patient_org" | "other";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const Providers = () => {
  const { mode } = useLanguage();
  const showEn = mode !== "ar";
  const showAr = mode !== "en";

  const t = {
    eyebrow: { en: "FOR PROVIDERS", ar: "للمزودين" },
    h1: { en: "Onboard your organization", ar: "سجّل مؤسستك" },
    intro: {
      en: "Hospitals, clinics, physicians, vendors and insurance companies can apply to follow up with their patients on RufayQ — send health instructions, update medications, and schedule appointments.",
      ar: "تستطيع المستشفيات والعيادات والأطباء والموردون وشركات التأمين التقدّم لمتابعة مرضاهم عبر رُفَيِّق — إرسال التعليمات الصحية، وتحديث الأدوية، وجدولة المواعيد.",
    },
    orgType: { en: "Organization type", ar: "نوع المؤسسة" },
    orgName: { en: "Organization name", ar: "اسم المؤسسة" },
    orgNameAr: { en: "Organization name (Arabic)", ar: "اسم المؤسسة (بالعربية)" },
    country: { en: "Country", ar: "الدولة" },
    website: { en: "Website", ar: "الموقع الإلكتروني" },
    email: { en: "Contact email", ar: "البريد الإلكتروني للتواصل" },
    phone: { en: "Contact phone", ar: "رقم الهاتف" },
    contactName: { en: "Primary contact name", ar: "اسم جهة الاتصال الأساسية" },
    role: { en: "Role / title", ar: "المسمى الوظيفي" },
    notes: { en: "Notes", ar: "ملاحظات" },
    notesPh: { en: "Tell us about your organization, patient base, intended use…", ar: "أخبرنا عن مؤسستك، وقاعدة المرضى، والاستخدام المتوقع…" },
    agreement: { en: "Signed agreement", ar: "الاتفاقية الموقعة" },
    registration: { en: "Commercial registration", ar: "السجل التجاري" },
    fileNote: { en: "PDF, JPG or PNG · Max 10 MB each. Documents are reviewed by our compliance team only.", ar: "PDF أو JPG أو PNG · بحدّ أقصى 10 ميجابايت لكل ملف. تُراجع المستندات من قبل فريق الامتثال فقط." },
    submit: { en: "Submit application", ar: "إرسال الطلب" },
    submitting: { en: "Submitting…", ar: "جارٍ الإرسال…" },
    received: { en: "Application received", ar: "تم استلام طلبك" },
    reviewMsg: { en: "Our partnerships team will review your submission and contact you within 3–5 business days.", ar: "سيراجع فريق الشراكات طلبك ويتواصل معك خلال 3 إلى 5 أيام عمل." },
    backHome: { en: "Back to home", ar: "العودة للرئيسية" },
    back: { en: "Back to home", ar: "العودة للرئيسية" },
    upload: { en: "Upload", ar: "رفع" },
    fillRequired: { en: "Please fill in all required fields", ar: "يرجى تعبئة جميع الحقول المطلوبة" },
    docsRequired: { en: "Both documents are required (PDF/JPG/PNG, max 10MB each)", ar: "كلا المستندين مطلوبان (PDF/JPG/PNG، بحد أقصى 10 ميجابايت)" },
    success: { en: "Application submitted", ar: "تم إرسال الطلب" },
    failed: { en: "Submission failed", ar: "فشل الإرسال" },
  };
  const tx = (k: keyof typeof t) => mode === "ar" ? t[k].ar : mode === "en" ? t[k].en : `${t[k].en} · ${t[k].ar}`;

  const TYPES: { value: OrgType; en: string; ar: string; Icon: typeof Building2 }[] = [
    { value: "hospital", en: "Hospital", ar: "مستشفى", Icon: Building2 },
    { value: "clinic", en: "Clinic / Physician", ar: "عيادة / طبيب", Icon: Stethoscope },
    { value: "vendor", en: "Vendor", ar: "مورّد", Icon: Package },
    { value: "insurance", en: "Insurance", ar: "شركة تأمين", Icon: Shield },
  ];

  const [orgType, setOrgType] = useState<OrgType>("hospital");
  const [orgName, setOrgName] = useState("");
  const [orgNameAr, setOrgNameAr] = useState("");
  const [country, setCountry] = useState("Saudi Arabia");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [notes, setNotes] = useState("");
  const [agreement, setAgreement] = useState<File | null>(null);
  const [registration, setRegistration] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);

  const validFile = (f: File | null) => {
    if (!f) return false;
    if (f.size > MAX_BYTES) return false;
    return /pdf|jpe?g|png/i.test(f.type) || /\.(pdf|jpe?g|png)$/i.test(f.name);
  };

  const upload = async (file: File, appId: string, kind: "agreement" | "registration") => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `applications/${appId}/${kind}.${ext.toLowerCase()}`;
    const { error } = await supabase.storage.from("provider-docs").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    // Bucket is private — store the storage path. Admins generate signed URLs on review.
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !email.trim() || !contactName.trim()) {
      toast.error(tx("fillRequired"));
      return;
    }
    if (!validFile(agreement) || !validFile(registration)) {
      toast.error(tx("docsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: row, error: insErr } = await supabase
        .from("provider_applications")
        .insert({
          status: "pending",
          org_type: orgType,
          org_name: orgName.trim(),
          org_name_ar: orgNameAr.trim() || null,
          country: country.trim() || null,
          contact_email: email.trim(),
          contact_phone: phone.trim() || null,
          website: website.trim() || null,
          contact_person_name: contactName.trim(),
          contact_person_role: contactRole.trim() || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (insErr || !row) throw insErr || new Error("Failed to create application");

      const [agreementUrl, registrationUrl] = await Promise.all([
        upload(agreement!, row.id, "agreement"),
        upload(registration!, row.id, "registration"),
      ]);

      const { error: updErr } = await supabase
        .from("provider_applications")
        .update({ agreement_url: agreementUrl, registration_url: registrationUrl })
        .eq("id", row.id);
      if (updErr) throw updErr;

      setRefId(row.id);
      toast.success(tx("success"));
    } catch (err: any) {
      toast.error(err?.message || tx("failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (refId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={mode === "ar" ? "rtl" : "ltr"}>
        <div className="max-w-md text-center rounded-2xl p-8" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(31,182,167,0.15)" }}>
            <CheckCircle2 size={32} color={TEAL} />
          </div>
          {showEn && <h1 className="font-display text-2xl mb-2">{t.received.en}</h1>}
          {showAr && <p className="font-arabic mb-4" dir="rtl" style={{ color: GOLD }}>{t.received.ar}</p>}
          {showEn && <p className="text-sm mb-2" style={{ color: MUTED }}>{t.reviewMsg.en}</p>}
          {showAr && <p className="font-arabic text-xs mb-6" dir="rtl" style={{ color: MUTED }}>{t.reviewMsg.ar}</p>}
          <p className="text-[11px] font-mono mb-6" style={{ color: GOLD }}>REF · {refId.slice(0, 8).toUpperCase()}</p>
          <Link to="/" className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold" style={{ background: GOLD, color: "#06101A" }}>
            {tx("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={mode === "ar" ? "rtl" : "ltr"}>
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <ArrowLeft size={16} color={TEXT} />
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg"><span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/" className="text-xs hidden sm:block" style={{ color: MUTED }}>{tx("back")}</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: GOLD }}>
          {showEn && t.eyebrow.en}{showEn && showAr && " · "}{showAr && <span className="font-arabic">{t.eyebrow.ar}</span>}
        </p>
        {showEn && (
          <h1 className="font-display text-4xl md:text-5xl mb-3 tracking-tight" style={{ fontWeight: 300 }}>{t.h1.en}</h1>
        )}
        {showAr && (
          <p className="font-arabic text-lg mb-2" dir="rtl" style={{ color: GOLD }}>{t.h1.ar}</p>
        )}
        {showEn && <p className="text-sm mb-2" style={{ color: MUTED }}>{t.intro.en}</p>}
        {showAr && <p className="font-arabic text-sm mb-10" dir="rtl" style={{ color: MUTED }}>{t.intro.ar}</p>}
        {!showAr && <div className="mb-10" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-3" style={{ color: MUTED }}>{tx("orgType")} *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPES.map(({ value, en, ar, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrgType(value)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: orgType === value ? "rgba(197,150,90,0.12)" : BG2,
                    border: `1px solid ${orgType === value ? GOLD : BORDER}`,
                  }}
                >
                  <Icon size={18} color={orgType === value ? GOLD : MUTED} />
                  {showEn && <p className="text-xs font-semibold mt-2" style={{ color: TEXT }}>{en}</p>}
                  {showAr && <p className="font-arabic text-[10px]" dir="rtl" style={{ color: showEn ? MUTED : TEXT }}>{ar}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Org details */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={`${tx("orgName")} *`} value={orgName} onChange={setOrgName} placeholder="King Faisal Specialist Hospital" />
            <Field label={tx("orgNameAr")} value={orgNameAr} onChange={setOrgNameAr} placeholder="مستشفى الملك فيصل التخصصي" rtl />
            <Field label={tx("country")} value={country} onChange={setCountry} />
            <Field label={tx("website")} value={website} onChange={setWebsite} placeholder="https://" />
          </div>

          {/* Contact */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={`${tx("email")} *`} type="email" value={email} onChange={setEmail} />
            <Field label={tx("phone")} value={phone} onChange={setPhone} placeholder="+966…" />
            <Field label={`${tx("contactName")} *`} value={contactName} onChange={setContactName} />
            <Field label={tx("role")} value={contactRole} onChange={setContactRole} placeholder="Partnerships Manager" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>{tx("notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
              placeholder={tx("notesPh")}
            />
          </div>

          {/* Files */}
          <div className="grid md:grid-cols-2 gap-4">
            <FileField label={`${tx("agreement")} *`} uploadLabel={tx("upload")} file={agreement} onChange={setAgreement} />
            <FileField label={`${tx("registration")} *`} uploadLabel={tx("upload")} file={registration} onChange={setRegistration} />
          </div>
          <p className="text-[11px]" style={{ color: MUTED }}>{tx("fileNote")}</p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: GOLD, color: "#06101A" }}
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> {tx("submitting")}</> : tx("submit")}
          </button>
        </form>
      </main>
    </div>
  );
};

const Field = ({
  label, value, onChange, type = "text", placeholder, rtl,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; rtl?: boolean }) => (
  <div>
    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={rtl ? "rtl" : "ltr"}
      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
      style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
    />
  </div>
);

const FileField = ({
  label, uploadLabel, file, onChange,
}: { label: string; uploadLabel: string; file: File | null; onChange: (f: File | null) => void }) => {
  const id = label.replace(/\s+/g, "-");
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>{label}</label>
      {file ? (
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: BG2, border: `1px solid ${GOLD}` }}>
          <FileText size={14} color={GOLD} />
          <span className="text-xs flex-1 truncate" style={{ color: TEXT }}>{file.name}</span>
          <span className="text-[10px]" style={{ color: MUTED }}>{(file.size / 1024 / 1024).toFixed(1)}MB</span>
          <button type="button" onClick={() => onChange(null)} className="p-0.5"><X size={12} color={MUTED} /></button>
        </div>
      ) : (
        <label htmlFor={id} className="rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer"
          style={{ background: BG2, border: `1px dashed ${BORDER}` }}>
          <Upload size={14} color={MUTED} />
          <span className="text-xs" style={{ color: MUTED }}>{uploadLabel}</span>
        </label>
      )}
      <input
        id={id} type="file" className="hidden" accept={ACCEPTED}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
};

export default Providers;
