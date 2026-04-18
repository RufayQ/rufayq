import { useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";
import { Eye, EyeOff, Check, ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

type AuthView = "login" | "register" | "medical" | "otp";

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [view, setView] = useState<AuthView>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  const [reg, setReg] = useState({
    name: "", nameAr: "", id: "", dob: "", gender: "male",
    email: "", phone: "", nationality: "Saudi Arabia",
    acceptTerms: false, acceptPrivacy: false,
  });

  const [med, setMed] = useState({
    bloodType: "", allergies: "", chronic: "", currentMeds: "",
    emName: "", emPhone: "", emRelation: "",
    insurer: "", policy: "",
  });

  const handleLogin = () => {
    setView("otp");
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  const handleOtp = (index: number, value: string) => {
    if (value.length > 1) return;
    const next = [...otp]; next[index] = value; setOtp(next);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    if (next.every((d) => d !== "")) setTimeout(onLogin, 500);
  };

  const validateRegister = () => {
    if (!reg.name.trim() || !reg.id.trim() || !reg.dob) {
      toast.error("Please fill required fields · يرجى تعبئة الحقول المطلوبة"); return false;
    }
    if (!reg.acceptTerms || !reg.acceptPrivacy) {
      toast.error("You must accept the Terms and Privacy Policy · يجب الموافقة على الشروط"); return false;
    }
    return true;
  };

  const handleNextToMedical = () => { if (validateRegister()) setView("medical"); };

  const handleCompleteSignup = async () => {
    setSubmitting(true);
    const device_id = getDeviceId();
    const now = new Date().toISOString();

    const { error: pErr } = await supabase.from("profiles").upsert({
      device_id,
      full_name_en: reg.name.trim(),
      full_name_ar: reg.nameAr.trim() || null,
      saudi_id: reg.id.trim().length === 10 ? reg.id.trim() : null,
      passport_number: reg.id.trim().length !== 10 ? reg.id.trim() : null,
      date_of_birth: reg.dob || null,
      gender: reg.gender,
      phone: reg.phone || phone,
      email: reg.email.trim() || null,
      nationality: reg.nationality,
      terms_accepted_at: now,
      privacy_accepted_at: now,
    }, { onConflict: "device_id" });

    if (pErr) { setSubmitting(false); toast.error("Signup failed: " + pErr.message); return; }

    const { error: mErr } = await supabase.from("medical_profiles").upsert({
      device_id,
      blood_type: med.bloodType || null,
      allergies: med.allergies ? med.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      chronic_conditions: med.chronic ? med.chronic.split(",").map((s) => s.trim()).filter(Boolean) : [],
      current_medications: med.currentMeds ? med.currentMeds.split(",").map((s) => s.trim()).filter(Boolean) : [],
      emergency_contact_name: med.emName || null,
      emergency_contact_phone: med.emPhone || null,
      emergency_contact_relation: med.emRelation || null,
      insurance_provider: med.insurer || null,
      insurance_policy_number: med.policy || null,
    }, { onConflict: "device_id" });

    setSubmitting(false);
    if (mErr) { toast.error("Medical info failed: " + mErr.message); return; }
    toast.success("Account created · تم إنشاء الحساب", { description: "Welcome to RufayQ" });
    onLogin();
  };

  // ============ OTP VIEW ============
  if (view === "otp") {
    return (
      <div className="flex flex-col h-full px-6 pt-12" style={{ background: "var(--off-white)" }}>
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Enter verification code</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أدخل رمز التحقق</p>
          <p className="text-xs mt-3" style={{ color: "var(--gray)" }}>Sent to +966 {phone || "5X XXX XXXX"}</p>
        </div>
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((d, i) => (
            <input key={i} id={`otp-${i}`} value={d} onChange={(e) => handleOtp(i, e.target.value)} maxLength={1}
              className="w-11 h-11 text-center text-lg font-semibold rounded-lg outline-none transition-all"
              style={{ border: `1px solid ${d ? "var(--teal-deep)" : "var(--gray-light)"}`, background: "var(--white)", color: "var(--navy)" }}
            />
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: countdown > 0 ? "var(--gray)" : "var(--teal-mid)" }}>
          {countdown > 0 ? `Resend in 0:${countdown.toString().padStart(2, "0")}` : "Resend code · إعادة إرسال الرمز"}
        </p>
      </div>
    );
  }

  // ============ MEDICAL PROFILE VIEW ============
  if (view === "medical") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-6 pb-6" style={{ background: "var(--off-white)" }}>
        <button onClick={() => setView("register")} className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--teal-deep)" }}>
          <ArrowLeft size={14} /> Back · رجوع
        </button>
        <div className="text-center mb-5">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 2 OF 2</p>
          <h2 className="font-display text-2xl mt-1" style={{ color: "var(--navy)" }}>Medical Profile</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>الملف الطبي</p>
          <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>Helps RufayQ personalize reminders and AI guidance · اختياري لكن يساعد كثيراً</p>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Blood Type · فصيلة الدم</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                <button key={bt} onClick={() => setMed({ ...med, bloodType: bt })}
                  className="py-2 rounded-lg text-xs font-semibold btn-press"
                  style={{
                    background: med.bloodType === bt ? "var(--teal-deep)" : "var(--off-white)",
                    color: med.bloodType === bt ? "#fff" : "var(--navy)",
                    border: `1px solid ${med.bloodType === bt ? "var(--teal-deep)" : "var(--gray-light)"}`,
                  }}>{bt}</button>
              ))}
            </div>
          </div>

          {[
            { k: "allergies", l: "Allergies", lAr: "الحساسية", p: "Penicillin, peanuts (comma-separated)" },
            { k: "chronic", l: "Chronic Conditions", lAr: "الأمراض المزمنة", p: "Diabetes, hypertension..." },
            { k: "currentMeds", l: "Current Medications", lAr: "الأدوية الحالية", p: "Metformin 500mg, Aspirin 81mg..." },
          ].map((f) => (
            <div key={f.k}>
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                {f.l} <span className="font-arabic text-xs" style={{ color: "var(--gray)" }}>· {f.lAr}</span>
              </label>
              <textarea value={(med as any)[f.k]} onChange={(e) => setMed({ ...med, [f.k]: e.target.value })}
                placeholder={f.p} rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
            </div>
          ))}

          <div className="pt-1" style={{ borderTop: "1px dashed var(--gray-light)" }}>
            <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>EMERGENCY CONTACT · جهة الطوارئ</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={med.emName} onChange={(e) => setMed({ ...med, emName: e.target.value })} placeholder="Name · الاسم"
                className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
              <input value={med.emRelation} onChange={(e) => setMed({ ...med, emRelation: e.target.value })} placeholder="Relation"
                className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
            </div>
            <input value={med.emPhone} onChange={(e) => setMed({ ...med, emPhone: e.target.value })} placeholder="Phone · الهاتف"
              className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
          </div>

          <div className="pt-1" style={{ borderTop: "1px dashed var(--gray-light)" }}>
            <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>INSURANCE · التأمين</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={med.insurer} onChange={(e) => setMed({ ...med, insurer: e.target.value })} placeholder="Provider"
                className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
              <input value={med.policy} onChange={(e) => setMed({ ...med, policy: e.target.value })} placeholder="Policy #"
                className="px-3 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 px-1 text-[10px]" style={{ color: "var(--gray)" }}>
          <Shield size={12} style={{ color: "var(--success)" }} />
          <span>Encrypted at rest · PDPL & HIPAA compliant</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onLogin} className="flex-1 py-3 rounded-xl text-sm btn-press"
            style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
            Skip for now
          </button>
          <button onClick={handleCompleteSignup} disabled={submitting}
            className="flex-[2] py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "var(--gold)", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Creating…" : "Complete signup · إنشاء الحساب"}
          </button>
        </div>
      </div>
    );
  }

  // ============ REGISTER VIEW ============
  if (view === "register") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-6 pb-6" style={{ background: "var(--off-white)" }}>
        <div className="text-center mb-4">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 1 OF 2</p>
          <h2 className="font-display text-2xl mt-1" style={{ color: "var(--navy)" }}>Create your account</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أنشئ حسابك</p>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          {[
            { label: "Full Name *", labelAr: "الاسم الكامل", placeholder: "Mohammed Al-Rashidi", key: "name" },
            { label: "الاسم بالعربي", labelAr: "", placeholder: "محمد الراشدي", key: "nameAr", rtl: true },
            { label: "Saudi ID / Passport *", labelAr: "الهوية / الجواز", placeholder: "1234567890", key: "id" },
            { label: "Date of Birth *", labelAr: "تاريخ الميلاد", placeholder: "1990-01-15", key: "dob", type: "date" },
            { label: "Mobile Number", labelAr: "رقم الجوال", placeholder: "+966 5X XXX XXXX", key: "phone" },
            { label: "Email (optional)", labelAr: "البريد الإلكتروني", placeholder: "email@example.com", key: "email", type: "email" },
            { label: "Nationality", labelAr: "الجنسية", placeholder: "Saudi Arabia", key: "nationality" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                {f.label} {f.labelAr && <span className="font-arabic text-xs" style={{ color: "var(--gray)" }}> · {f.labelAr}</span>}
              </label>
              <input
                type={(f as any).type || "text"}
                value={(reg as any)[f.key]}
                onChange={(e) => setReg({ ...reg, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                dir={f.rtl ? "rtl" : "ltr"}
                className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Gender · الجنس</label>
            <div className="flex gap-2 mt-1">
              {[["male", "Male · ذكر"], ["female", "Female · أنثى"]].map(([val, label]) => (
                <button key={val} onClick={() => setReg({ ...reg, gender: val })}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all btn-press"
                  style={{
                    background: reg.gender === val ? "var(--teal-deep)" : "var(--off-white)",
                    color: reg.gender === val ? "var(--white)" : "var(--gray)",
                    border: `1px solid ${reg.gender === val ? "var(--teal-deep)" : "var(--gray-light)"}`,
                  }}>{label}</button>
              ))}
            </div>
          </div>

          {/* T&C checkboxes */}
          <div className="pt-2 space-y-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
            {[
              { k: "acceptTerms", text: "I agree to the", linkText: "Terms of Service", linkHref: "/terms", textAr: "أوافق على شروط الاستخدام" },
              { k: "acceptPrivacy", text: "I agree to the", linkText: "Privacy Policy (PDPL · HIPAA · GDPR)", linkHref: "/privacy", textAr: "أوافق على سياسة الخصوصية" },
            ].map((c) => (
              <label key={c.k} className="flex items-start gap-2.5 cursor-pointer">
                <button type="button" onClick={() => setReg({ ...reg, [c.k]: !(reg as any)[c.k] })}
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{
                    background: (reg as any)[c.k] ? "var(--teal-deep)" : "var(--white)",
                    border: `2px solid ${(reg as any)[c.k] ? "var(--teal-deep)" : "var(--gray-light)"}`,
                  }}>
                  {(reg as any)[c.k] && <Check size={13} color="#fff" strokeWidth={3} />}
                </button>
                <div className="flex-1">
                  <p className="text-[11px] leading-snug" style={{ color: "var(--navy)" }}>
                    {c.text}{" "}
                    <Link to={c.linkHref} target="_blank" className="font-semibold underline" style={{ color: "var(--teal-deep)" }}>
                      {c.linkText}
                    </Link>
                  </p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{c.textAr}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleNextToMedical}
          className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press"
          style={{ background: "var(--gold)", opacity: (reg.acceptTerms && reg.acceptPrivacy) ? 1 : 0.5, height: 52 }}>
          Continue → Medical info · متابعة
        </button>
        <button onClick={() => setView("login")} className="mt-3 text-center text-xs" style={{ color: "var(--gray)" }}>
          Already have an account? <span style={{ color: "var(--teal-deep)" }} className="font-semibold">Sign In</span>
        </button>
      </div>
    );
  }

  // ============ LOGIN VIEW ============
  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 pt-10 pb-6" style={{ background: "var(--off-white)" }}>
      <div className="flex flex-col items-center mb-8">
        <RufayQLogo size={60} variant="dark" />
        <div className="mt-2"><RufayQWordmark size="md" variant="dark" /></div>
        <h2 className="font-display text-2xl mt-4" style={{ color: "var(--navy)" }}>Welcome back</h2>
        <p className="font-arabic text-base" dir="rtl" style={{ color: "var(--gray)" }}>مرحباً بعودتك</p>
        <p className="text-xs mt-1" style={{ color: "var(--gray)" }}>Sign in to your RufayQ companion · سجّل دخولك إلى رُفَيِّق</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
            Saudi Mobile Number <span className="font-arabic" style={{ color: "var(--gray)" }}>· رقم الجوال السعودي</span>
          </label>
          <div className="flex items-center mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)", height: 52 }}>
            <span className="pl-3 pr-2 text-sm" style={{ color: "var(--gray)" }}>🇸🇦 +966</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5X XXX XXXX"
              className="flex-1 h-full px-2 text-sm outline-none" style={{ background: "transparent", color: "var(--navy)" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
              Password <span className="font-arabic" style={{ color: "var(--gray)" }}>· كلمة المرور</span>
            </label>
            <button className="text-[10px]" style={{ color: "var(--teal-mid)" }}>Forgot?</button>
          </div>
          <div className="flex items-center mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)", height: 52 }}>
            <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="flex-1 h-full px-3 text-sm outline-none" style={{ background: "transparent", color: "var(--navy)" }} />
            <button onClick={() => setShowPass(!showPass)} className="pr-3" style={{ color: "var(--gray)" }}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <button onClick={handleLogin} className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press"
        style={{ background: "var(--teal-deep)", height: 52 }}>
        Sign In · تسجيل الدخول
      </button>

      <div className="flex items-center my-4">
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        <span className="px-3 text-xs" style={{ color: "var(--gray)" }}>or · أو</span>
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[{ icon: "🍎", label: "Apple" }, { icon: "🔵", label: "Google" }].map((s) => (
          <button key={s.label} onClick={onLogin}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm btn-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <p className="text-center text-xs mt-5" style={{ color: "var(--gray)" }}>
        Don't have an account?{" "}
        <button onClick={() => setView("register")} className="font-semibold" style={{ color: "var(--teal-deep)" }}>
          Register · سجّل الآن
        </button>
      </p>
    </div>
  );
};

export default LoginScreen;
