import { useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";
import OtpInput from "@/components/OtpInput";
import { Eye, EyeOff, Check, ArrowLeft, Shield, MessageCircle, Mail, UserCircle2, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

type AuthView = "welcome" | "login" | "register" | "medical" | "otp";
type OtpChannel = "whatsapp" | "email";

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [view, setView] = useState<AuthView>("welcome");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState(false);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("whatsapp");
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

  // Structured histories (persisted as JSONB)
  const [pastHistory, setPastHistory] = useState<{ condition: string; year: string; status: string; notes: string }[]>([]);
  const [surgicalHistory, setSurgicalHistory] = useState<{ procedure: string; year: string; hospital: string; notes: string }[]>([]);
  const [familyHistory, setFamilyHistory] = useState<{ relation: string; condition: string; age_of_onset: string; notes: string }[]>([]);

  const addPast = () => setPastHistory([...pastHistory, { condition: "", year: "", status: "active", notes: "" }]);
  const updatePast = (i: number, k: string, v: string) => { const n = [...pastHistory]; (n[i] as any)[k] = v; setPastHistory(n); };
  const removePast = (i: number) => setPastHistory(pastHistory.filter((_, idx) => idx !== i));

  const addSurgical = () => setSurgicalHistory([...surgicalHistory, { procedure: "", year: "", hospital: "", notes: "" }]);
  const updateSurgical = (i: number, k: string, v: string) => { const n = [...surgicalHistory]; (n[i] as any)[k] = v; setSurgicalHistory(n); };
  const removeSurgical = (i: number) => setSurgicalHistory(surgicalHistory.filter((_, idx) => idx !== i));

  const addFamily = () => setFamilyHistory([...familyHistory, { relation: "Father", condition: "", age_of_onset: "", notes: "" }]);
  const updateFamily = (i: number, k: string, v: string) => { const n = [...familyHistory]; (n[i] as any)[k] = v; setFamilyHistory(n); };
  const removeFamily = (i: number) => setFamilyHistory(familyHistory.filter((_, idx) => idx !== i));

  const startCountdown = () => {
    setCountdown(45);
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  // Resolve the verification recipient based on channel.
  // For WhatsApp/SMS: prefer reg.phone (signup) → fallback to phone (login). Force E.164 with +966.
  const resolveRecipient = (channel: OtpChannel): string => {
    if (channel === "email") return reg.email.trim();
    const raw = (reg.phone || phone || "").trim().replace(/\s+/g, "");
    if (!raw) return "";
    if (raw.startsWith("+")) return raw;
    // strip leading 0 then prefix +966
    return `+966${raw.replace(/^0+/, "")}`;
  };

  const handleSendOtp = async (channel: OtpChannel) => {
    const to = resolveRecipient(channel);
    if (!to) {
      toast.error(channel === "email" ? "Enter your email first" : "Enter your phone number first");
      return;
    }
    setOtpChannel(channel);
    setView("otp");
    setOtp(["", "", "", "", "", ""]);
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { channel: channel === "whatsapp" ? "whatsapp" : channel, to },
    });
    setSubmitting(false);
    if (error || (data && data.error)) {
      const msg = (data && data.error) || error?.message || "Failed to send code";
      toast.error("Couldn't send code · لم نتمكن من إرسال الرمز", { description: msg });
      return;
    }
    startCountdown();
    if (channel === "whatsapp") toast.success(`WhatsApp code sent to ${to}`);
    else if (channel === "email") toast.success(`Email code sent to ${to}`);
    else toast.success(`SMS code sent to ${to}`);
  };

  const submitOtp = async (code: string) => {
    const to = resolveRecipient(otpChannel);
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { to, code },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Verification failed", { description: error.message });
      setOtp(["", "", "", "", "", ""]);
      setOtpError(true);
      setTimeout(() => setOtpError(false), 500);
      return;
    }
    if (!data?.approved) {
      toast.error("Incorrect or expired code · رمز غير صحيح", {
        description: data?.error || "Request a new code and try again",
      });
      setOtp(["", "", "", "", "", ""]);
      setOtpError(true);
      setTimeout(() => setOtpError(false), 500);
      return;
    }
    if (data.signInEmail && data.password) {
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: data.signInEmail, password: data.password,
      });
      if (sErr) {
        toast.error("Sign-in failed", { description: sErr.message });
        return;
      }
    }
    toast.success("Verified · تم التحقق");
    setTimeout(onLogin, 500);
  };

  // Kept for backwards compat with any leftover refs (no longer used by inputs).
  const handleOtp = (_index: number, _value: string) => {};

  const handleGuestContinue = () => {
    toast.info("Continuing as guest · المتابعة كزائر", {
      description: "Some features need a registered account",
    });
    onLogin();
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

    const cleanPast = pastHistory.filter((p) => p.condition.trim());
    const cleanSurgical = surgicalHistory.filter((p) => p.procedure.trim());
    const cleanFamily = familyHistory.filter((p) => p.condition.trim());

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
      past_medical_history: cleanPast as any,
      surgical_history: cleanSurgical as any,
      family_history: cleanFamily as any,
    } as any, { onConflict: "device_id" });

    setSubmitting(false);
    if (mErr) { toast.error("Medical info failed: " + mErr.message); return; }
    toast.success("Account created · تم إنشاء الحساب", { description: "Verify your contact next" });
    // Move to OTP verification step
    handleSendOtp(reg.email ? "email" : "whatsapp");
  };

  // ============ WELCOME / GATE VIEW ============
  if (view === "welcome") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-12 pb-6" style={{ background: "var(--off-white)" }}>
        <div className="flex flex-col items-center mb-8">
          <RufayQLogo size={72} variant="dark" />
          <div className="mt-3"><RufayQWordmark size="md" variant="dark" /></div>
          <h2 className="font-display text-2xl mt-5 text-center" style={{ color: "var(--navy)" }}>Welcome to RufayQ</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أهلاً بك في رُفَيِّق</p>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--gray)" }}>
            Your AI medical companion across the Gulf and beyond
          </p>
        </div>

        {/* Primary: register */}
        <button
          onClick={() => setView("register")}
          className="w-full py-4 rounded-2xl font-bold text-white btn-press flex flex-col items-center"
          style={{ background: "var(--gold)", boxShadow: "0 8px 24px rgba(197,150,90,0.3)" }}
        >
          <span className="text-[15px]">Create your account</span>
          <span className="font-arabic text-[12px] mt-0.5" dir="rtl">أنشئ حسابك · مع تحقق برسالة</span>
        </button>

        {/* Secondary: existing login */}
        <button
          onClick={() => setView("login")}
          className="w-full mt-3 py-3.5 rounded-2xl font-semibold btn-press"
          style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
        >
          Sign in with existing account · <span className="font-arabic">تسجيل الدخول</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
          <span className="px-3 text-[10px] tracking-widest font-mono" style={{ color: "var(--gray)" }}>OR · أو</span>
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        </div>

        {/* Already have a support code */}
        <button
          onClick={() => { setView("login"); setTimeout(() => setView("otp"), 0); setOtpChannel("whatsapp"); setOtp(["","","","","",""]); }}
          className="w-full py-3 rounded-2xl btn-press flex items-center justify-center gap-2 mb-2"
          style={{ background: "transparent", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
        >
          <Shield size={14} />
          <span className="text-[12px] font-semibold">I have a code from support · لدي رمز من الدعم</span>
        </button>

        {/* Guest pathway */}
        <button
          onClick={handleGuestContinue}
          className="w-full py-3.5 rounded-2xl btn-press flex items-center justify-center gap-2"
          style={{ background: "transparent", color: "var(--gray)", border: "1px dashed var(--gray-light)" }}
        >
          <UserCircle2 size={16} />
          <span className="text-[13px] font-medium">Continue as guest · <span className="font-arabic">متابعة كزائر</span></span>
        </button>
        <p className="text-[10px] text-center mt-2" style={{ color: "var(--gray)" }}>
          Explore the app first. You can register anytime to save your data securely.
        </p>

        <div className="mt-auto pt-6 text-center">
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>
            By continuing you accept our{" "}
            <Link to="/terms" target="_blank" className="font-semibold" style={{ color: "var(--teal-deep)" }}>Terms</Link>
            {" "}&amp;{" "}
            <Link to="/privacy" target="_blank" className="font-semibold" style={{ color: "var(--teal-deep)" }}>Privacy</Link>
          </p>
          <p className="text-[9px] mt-1" style={{ color: "var(--gray)" }}>PDPL · DHA · HIPAA · GDPR compliant</p>
        </div>
      </div>
    );
  }

  // ============ OTP VIEW (redesigned) ============
  if (view === "otp") {
    const recipient = resolveRecipient(otpChannel) || "your contact";
    const masked = otpChannel === "email"
      ? recipient.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : recipient.replace(/(\+\d{3})\d+(\d{3})/, "$1•••$2");
    const channelMeta = otpChannel === "whatsapp"
      ? { Icon: MessageCircle, label: "WhatsApp", color: "#25D366" }
      : { Icon: Mail, label: "Email", color: "var(--teal-deep)" };
    const ChannelIcon = channelMeta.Icon;
    const canResend = countdown === 0 && !submitting;

    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-10 pb-8" style={{ background: "var(--off-white)" }}>
        <button
          onClick={() => setView(reg.acceptTerms ? "medical" : "login")}
          className="flex items-center gap-1 text-xs mb-4 self-start"
          style={{ color: "var(--teal-deep)" }}
        >
          <ArrowLeft size={14} /> Back · رجوع
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <ChannelIcon size={14} color={channelMeta.color} />
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--navy)" }}>
              {channelMeta.label} · {masked}
            </span>
          </div>
          <h2 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Enter your code</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أدخل رمز التحقق</p>
          <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>
            We sent a 6-digit code. It expires in 10 minutes.
          </p>
        </div>

        {/* OTP slots — auto-advance, paste, backspace nav, shake on error */}
        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={submitOtp}
          disabled={submitting}
          error={otpError}
        />

        {/* Submitting indicator */}
        {submitting && (
          <p className="flex items-center justify-center gap-2 text-xs mt-4" style={{ color: "var(--teal-deep)" }}>
            <Loader2 size={12} className="animate-spin" /> Verifying…
          </p>
        )}

        {/* Resend block — circular countdown */}
        <div className="mt-6 flex flex-col items-center">
          {countdown > 0 ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--gray-light)" strokeWidth="3" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="var(--teal-deep)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={(2 * Math.PI * 24) * (1 - countdown / 45)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center font-mono text-[12px] font-bold"
                  style={{ color: "var(--navy)" }}
                >
                  0:{countdown.toString().padStart(2, "0")}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>
                Didn't get it? · لم يصلك الرمز؟
              </p>
            </div>
          ) : (
            <button
              onClick={() => handleSendOtp(otpChannel)}
              disabled={!canResend}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold btn-press disabled:opacity-50"
              style={{ background: "var(--teal-deep)", color: "white" }}
            >
              <RefreshCw size={12} /> Resend code · إعادة إرسال
            </button>
          )}
        </div>

        {/* Change recipient (number/email) */}
        <button
          onClick={() => { setOtp(["","","","","",""]); setOtpError(false); setView(reg.acceptTerms ? "register" : "login"); }}
          className="mt-3 mx-auto block text-[11px] font-semibold underline"
          style={{ color: "var(--gray)" }}
        >
          Change {otpChannel === "email" ? "email" : "number"} · تغيير {otpChannel === "email" ? "البريد" : "الرقم"}
        </button>

        {/* Channel switcher */}
        <div className="mt-7 pt-5" style={{ borderTop: "1px dashed var(--gray-light)" }}>
          <p className="text-[10px] text-center mb-2.5 uppercase tracking-widest" style={{ color: "var(--gray)" }}>
            Try another method · جرب طريقة أخرى
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSendOtp("whatsapp")}
              disabled={otpChannel === "whatsapp" || submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 btn-press disabled:opacity-40"
              style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
            >
              <MessageCircle size={13} color="#25D366" /> WhatsApp
            </button>
            <button
              onClick={() => handleSendOtp("email")}
              disabled={otpChannel === "email" || submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 btn-press disabled:opacity-40"
              style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
            >
              <Mail size={13} color="var(--teal-deep)" /> Email
            </button>
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: "var(--gray)" }}>
            Still nothing? Tip: check spam, or contact{" "}
            <a href="mailto:customersupport@rufayq.com" className="font-semibold underline" style={{ color: "var(--teal-deep)" }}>
              customersupport@rufayq.com
            </a>{" "}for a manual code.
          </p>
        </div>
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
          <span>Encrypted at rest · PDPL · DHA · HIPAA · GDPR compliant</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => handleSendOtp(reg.email ? "email" : "whatsapp")} className="flex-1 py-3 rounded-xl text-sm btn-press"
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
        <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-xs mb-2 self-start" style={{ color: "var(--teal-deep)" }}>
          <ArrowLeft size={14} /> Back · رجوع
        </button>
        <div className="text-center mb-4">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 1 OF 2</p>
          <h2 className="font-display text-2xl mt-1" style={{ color: "var(--navy)" }}>Create your account</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أنشئ حسابك</p>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          {[
            { label: "Full Name *", labelAr: "الاسم الكامل", placeholder: "Mohammed Al-Rashidi", key: "name" },
            { label: "الاسم بالعربي", labelAr: "", placeholder: "محمد الراشدي", key: "nameAr", rtl: true },
            { label: "ID / Passport *", labelAr: "الهوية / الجواز", placeholder: "1234567890", key: "id" },
            { label: "Date of Birth *", labelAr: "تاريخ الميلاد", placeholder: "1990-01-15", key: "dob", type: "date" },
            { label: "Mobile Number", labelAr: "رقم الجوال", placeholder: "+966 / +971 / +974 / +965 …", key: "phone" },
            { label: "Email", labelAr: "البريد الإلكتروني", placeholder: "email@example.com", key: "email", type: "email" },
            { label: "Nationality", labelAr: "الجنسية", placeholder: "Saudi Arabia / UAE / Qatar / …", key: "nationality" },
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
              { k: "acceptPrivacy", text: "I agree to the", linkText: "Privacy Policy (PDPL · DHA · HIPAA · GDPR)", linkHref: "/privacy", textAr: "أوافق على سياسة الخصوصية" },
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
      <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-xs mb-3 self-start" style={{ color: "var(--teal-deep)" }}>
        <ArrowLeft size={14} /> Back · رجوع
      </button>
      <div className="flex flex-col items-center mb-6">
        <RufayQLogo size={56} variant="dark" />
        <div className="mt-2"><RufayQWordmark size="md" variant="dark" /></div>
        <h2 className="font-display text-2xl mt-3" style={{ color: "var(--navy)" }}>Welcome back</h2>
        <p className="font-arabic text-base" dir="rtl" style={{ color: "var(--gray)" }}>مرحباً بعودتك</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
            Mobile Number <span className="font-arabic" style={{ color: "var(--gray)" }}>· رقم الجوال</span>
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
            <button onClick={() => toast.info("Password reset by OTP coming soon · قريباً")} className="text-[10px]" style={{ color: "var(--teal-mid)" }}>Forgot?</button>
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

      {/* Two OTP options */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => handleSendOtp("whatsapp")} className="py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-1.5"
          style={{ background: "#25D366", height: 52 }}>
          <MessageCircle size={15} /> WhatsApp OTP
        </button>
        <button onClick={() => handleSendOtp("email")} className="py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-1.5"
          style={{ background: "var(--teal-deep)", height: 52 }}>
          <Mail size={15} /> Email OTP
        </button>
      </div>
      <p className="text-center text-[10px] mt-2" style={{ color: "var(--gray)" }}>
        We'll send a 6-digit code · سنرسل رمزاً مكوناً من 6 أرقام
      </p>

      <div className="flex items-center my-4">
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        <span className="px-3 text-xs" style={{ color: "var(--gray)" }}>or · أو</span>
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
      </div>

      <button onClick={handleGuestContinue}
        className="w-full py-3 rounded-xl btn-press flex items-center justify-center gap-2"
        style={{ background: "transparent", color: "var(--gray)", border: "1px dashed var(--gray-light)" }}>
        <UserCircle2 size={14} />
        <span className="text-[12px]">Continue as guest · <span className="font-arabic">متابعة كزائر</span></span>
      </button>

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
