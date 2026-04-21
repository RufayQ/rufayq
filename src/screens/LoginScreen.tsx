import { useEffect, useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";
import OtpInput from "@/components/OtpInput";
import {
  Eye, EyeOff, Check, ArrowLeft, Shield, MessageCircle, Mail,
  UserCircle2, Loader2, RefreshCw, Fingerprint, Phone, KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

type AuthView = "welcome" | "login" | "register" | "medical" | "otp" | "recover" | "newpass";
type OtpChannel = "whatsapp" | "sms" | "email";

interface LoginScreenProps { onLogin: () => void }

const BIOMETRIC_KEY = "rufayq_bio_email";

// ---------- helpers ----------
const phoneToE164 = (raw: string, defaultCountry = "+966") => {
  const trimmed = (raw || "").trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${defaultCountry}${trimmed.replace(/^0+/, "")}`;
};
const phoneToEmail = (e164: string) => `${e164.replace(/[^\d]/g, "")}@phone.rufayq.local`;
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [view, setView] = useState<AuthView>("welcome");

  // Sign-in state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRemembered, setBioRemembered] = useState<string | null>(null);

  // Sign-up state
  const [reg, setReg] = useState({
    name: "", nameAr: "", id: "", dob: "", gender: "male",
    email: "", phone: "", nationality: "Saudi Arabia",
    password: "", confirmPassword: "",
    channel: "whatsapp" as OtpChannel,
    acceptTerms: false, acceptPrivacy: false,
  });

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState(false);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("whatsapp");
  const [otpRecipient, setOtpRecipient] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"signup" | "recover">("signup");
  const [countdown, setCountdown] = useState(45);

  // New-password (after recovery) state
  const [newPass, setNewPass] = useState("");
  const [newPassConfirm, setNewPassConfirm] = useState("");

  // Medical step (unchanged structure)
  const [med, setMed] = useState({
    bloodType: "", allergies: "", chronic: "", currentMeds: "",
    emName: "", emPhone: "", emRelation: "",
    insurer: "", policy: "",
  });
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

  // ---------- biometric availability ----------
  useEffect(() => {
    const supported = typeof window !== "undefined" && !!(window as any).PublicKeyCredential;
    setBioAvailable(supported);
    setBioRemembered(localStorage.getItem(BIOMETRIC_KEY));
  }, []);

  const startCountdown = () => {
    setCountdown(45);
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
  };

  // ============================================================
  // SIGN-IN (phone + password)
  // ============================================================
  const handleSignIn = async () => {
    const e164 = phoneToE164(phone);
    if (!e164 || e164.length < 8) { toast.error("Enter your mobile number"); return; }
    if (!password) { toast.error("Enter your password"); return; }
    setSubmitting(true);
    const signInEmail = phoneToEmail(e164);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password });
    setSubmitting(false);
    if (error) {
      toast.error("Sign-in failed", { description: "Check your number & password, or use 'Forgot password'." });
      return;
    }
    // Remember for next-time biometrics
    localStorage.setItem(BIOMETRIC_KEY, signInEmail);
    setBioRemembered(signInEmail);
    toast.success("Welcome back · مرحباً بعودتك");
    setTimeout(onLogin, 300);
  };

  const handleBiometric = async () => {
    if (!bioRemembered) {
      toast.info("Sign in once with your password — biometrics activates after that.");
      return;
    }
    if (!bioAvailable) { toast.error("Biometric authentication not supported on this device."); return; }
    try {
      // NOTE: this is a UX-level biometric prompt. True passwordless WebAuthn requires server-side
      // credential registration; for now we use it as a local "unlock" gate that re-runs the last sign-in.
      const cred = await (navigator.credentials as any).get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: "required",
        },
      }).catch(() => null);
      if (!cred) {
        toast.error("Biometric prompt cancelled");
        return;
      }
      toast.success("Unlocked · تم الفتح");
      // The app still needs a valid Supabase session — if cookies are stale, fall through to manual.
      const { data } = await supabase.auth.getSession();
      if (data.session) onLogin();
      else toast.info("Session expired — please sign in once with your password.");
    } catch {
      toast.error("Biometric unlock failed");
    }
  };

  // ============================================================
  // SIGN-UP / OTP send + verify
  // ============================================================
  const resolveSignupRecipient = (): { channel: OtpChannel; to: string } | null => {
    if (reg.channel === "email") {
      if (!isValidEmail(reg.email)) { toast.error("Enter a valid email"); return null; }
      return { channel: "email", to: reg.email.trim().toLowerCase() };
    }
    const e164 = phoneToE164(reg.phone || phone);
    if (!e164) { toast.error("Enter your mobile number"); return null; }
    return { channel: reg.channel, to: e164 };
  };

  const handleSendOtp = async (channel: OtpChannel, to: string, purpose: "signup" | "recover") => {
    setOtpChannel(channel);
    setOtpRecipient(to);
    setOtpPurpose(purpose);
    setView("otp");
    setOtp(["", "", "", "", "", ""]);
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("send-otp", { body: { channel, to } });
    setSubmitting(false);
    if (error || (data && data.error)) {
      const msg = (data && data.error) || error?.message || "Failed to send code";
      toast.error("Couldn't send code · لم نتمكن من إرسال الرمز", { description: msg });
      return;
    }
    startCountdown();
    const lbl = channel === "email" ? "Email" : channel === "sms" ? "SMS" : "WhatsApp";
    toast.success(`${lbl} code sent`);
  };

  const submitOtp = async (code: string) => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { to: otpRecipient, code, channel: otpChannel },
    });
    if (error || !data?.approved) {
      setSubmitting(false);
      toast.error("Incorrect or expired code · رمز غير صحيح", {
        description: data?.error || error?.message || "Request a new code and try again",
      });
      setOtp(["", "", "", "", "", ""]);
      setOtpError(true);
      setTimeout(() => setOtpError(false), 500);
      return;
    }

    // Sign in with the one-time temp password verify-otp issued
    if (data.signInEmail && data.password) {
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: data.signInEmail, password: data.password,
      });
      if (sErr) {
        setSubmitting(false);
        toast.error("Sign-in failed", { description: sErr.message });
        return;
      }
    }

    const userId = data.userId as string | undefined;

    if (otpPurpose === "recover") {
      // Land on the set-new-password screen — user is signed in via temp pw,
      // updateUser({ password }) will replace it permanently.
      setSubmitting(false);
      toast.success("Verified · set a new password");
      setView("newpass");
      return;
    }

    // SIGN-UP path: persist profile + medical now that we have a real auth user.
    // Re-key local device id to `auth_${userId}` so header-based RLS allows the writes.
    if (userId) {
      const newDeviceId = `auth_${userId}`;
      try { localStorage.setItem("rufayq_device_id", newDeviceId); } catch {}
      // Override the user's password with the one they chose at sign-up
      if (reg.password) {
        await supabase.auth.updateUser({ password: reg.password });
      }
      localStorage.setItem(BIOMETRIC_KEY, data.signInEmail);

      const now = new Date().toISOString();
      const { error: pErr } = await supabase.from("profiles").upsert({
        device_id: newDeviceId,
        full_name_en: reg.name.trim(),
        full_name_ar: reg.nameAr.trim() || null,
        saudi_id: reg.id.trim().length === 10 ? reg.id.trim() : null,
        passport_number: reg.id.trim().length !== 10 ? reg.id.trim() : null,
        date_of_birth: reg.dob || null,
        gender: reg.gender,
        phone: phoneToE164(reg.phone) || null,
        email: reg.email.trim() || null,
        nationality: reg.nationality,
        terms_accepted_at: now,
        privacy_accepted_at: now,
      }, { onConflict: "device_id" });

      if (pErr) console.error("[signup] profile upsert error", pErr);

      const cleanPast = pastHistory.filter((p) => p.condition.trim());
      const cleanSurgical = surgicalHistory.filter((p) => p.procedure.trim());
      const cleanFamily = familyHistory.filter((p) => p.condition.trim());

      const { error: mErr } = await supabase.from("medical_profiles").upsert({
        device_id: newDeviceId,
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

      if (mErr) console.error("[signup] medical upsert error", mErr);
    }

    setSubmitting(false);
    toast.success("Welcome to RufayQ · أهلاً بك");
    setTimeout(onLogin, 400);
  };

  // ============================================================
  // SIGN-UP submit (validation + profile insert + send OTP)
  // ============================================================
  const validateRegister = () => {
    if (!reg.name.trim() || !reg.id.trim() || !reg.dob) {
      toast.error("Please fill required fields · يرجى تعبئة الحقول المطلوبة"); return false;
    }
    if (!reg.phone.trim()) { toast.error("Mobile number is required"); return false; }
    if (reg.channel === "email" && !isValidEmail(reg.email)) {
      toast.error("Email is required for Email OTP"); return false;
    }
    if (!reg.password || reg.password.length < 8) {
      toast.error("Password must be at least 8 characters"); return false;
    }
    if (reg.password !== reg.confirmPassword) {
      toast.error("Passwords don't match"); return false;
    }
    if (!reg.acceptTerms || !reg.acceptPrivacy) {
      toast.error("You must accept the Terms and Privacy Policy"); return false;
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
      phone: phoneToE164(reg.phone) || null,
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
    toast.success("Profile saved · Verifying your contact next");

    const r = resolveSignupRecipient();
    if (r) handleSendOtp(r.channel, r.to, "signup");
  };

  // ============================================================
  // RECOVER (forgot password) — sends OTP, verify-otp resets temp pw
  // ============================================================
  const handleForgot = async () => {
    const e164 = phoneToE164(phone);
    if (!e164) { toast.error("Enter your mobile number first"); return; }
    handleSendOtp("whatsapp", e164, "recover");
  };

  // ============================================================
  // RENDER
  // ============================================================

  // ----- WELCOME -----
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

        <button onClick={() => setView("register")}
          className="w-full py-4 rounded-2xl font-bold text-white btn-press flex flex-col items-center"
          style={{ background: "var(--gold)", boxShadow: "0 8px 24px rgba(197,150,90,0.3)" }}>
          <span className="text-[15px]">Create your account</span>
          <span className="font-arabic text-[12px] mt-0.5" dir="rtl">أنشئ حسابك<span className="font-arabic" dir="rtl"> · مع تحقق برمز</span></span>
        </button>

        <button onClick={() => setView("login")}
          className="w-full mt-3 py-3.5 rounded-2xl font-semibold btn-press"
          style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}>
          Sign in · <span className="font-arabic">تسجيل الدخول</span>
        </button>

        <div className="flex items-center my-5">
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
          <span className="px-3 text-[10px] tracking-widest font-mono" style={{ color: "var(--gray)" }}>OR<span className="font-arabic" dir="rtl"> · أو</span></span>
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        </div>

        <button onClick={() => { localStorage.setItem("rufayq_guest_ok", "1"); toast.info("Continuing as guest · Some features need a registered account"); onLogin(); }}
          className="w-full py-3.5 rounded-2xl btn-press flex items-center justify-center gap-2"
          style={{ background: "transparent", color: "var(--gray)", border: "1px dashed var(--gray-light)" }}>
          <UserCircle2 size={16} />
          <span className="text-[13px] font-medium">Continue as guest · <span className="font-arabic">متابعة كزائر</span></span>
        </button>
        <p className="text-[10px] text-center mt-2" style={{ color: "var(--gray)" }}>
          Explore the app first. You can register anytime.
        </p>

        <div className="mt-auto pt-6 text-center">
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>
            By continuing you accept our{" "}
            <Link to="/terms" target="_blank" className="font-semibold" style={{ color: "var(--teal-deep)" }}>Terms</Link>{" "}&amp;{" "}
            <Link to="/privacy" target="_blank" className="font-semibold" style={{ color: "var(--teal-deep)" }}>Privacy</Link>
          </p>
          <p className="text-[9px] mt-1" style={{ color: "var(--gray)" }}>PDPL · DHA · HIPAA · GDPR compliant</p>
        </div>
      </div>
    );
  }

  // ----- LOGIN (phone + password, optional biometrics) -----
  if (view === "login") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-10 pb-6" style={{ background: "var(--off-white)" }}>
        <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-xs mb-3 self-start" style={{ color: "var(--teal-deep)" }}>
          <ArrowLeft size={14} /> Back<span className="font-arabic" dir="rtl"> · رجوع</span>

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
                inputMode="tel" autoComplete="tel"
                className="flex-1 h-full px-2 text-sm outline-none" style={{ background: "transparent", color: "var(--navy)" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                Password <span className="font-arabic" style={{ color: "var(--gray)" }}>· كلمة المرور</span>
              </label>
              <button onClick={handleForgot} className="text-[10px]" style={{ color: "var(--teal-mid)" }}>
                Forgot?<span className="font-arabic" dir="rtl"> · نسيت؟</span>

              </button>
            </div>
            <div className="flex items-center mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)", height: 52 }}>
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                autoComplete="current-password" placeholder="••••••••"
                className="flex-1 h-full px-3 text-sm outline-none" style={{ background: "transparent", color: "var(--navy)" }} />
              <button onClick={() => setShowPass(!showPass)} className="pr-3" style={{ color: "var(--gray)" }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleSignIn} disabled={submitting}
          className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
          style={{ background: "var(--teal-deep)", height: 52, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {submitting ? "Signing in…" : "Sign in · تسجيل الدخول"}
        </button>

        {bioAvailable && bioRemembered && (
          <button onClick={handleBiometric}
            className="w-full mt-3 py-3 rounded-xl font-semibold btn-press flex items-center justify-center gap-2"
            style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}>
            <Fingerprint size={18} />
            Use biometrics<span className="font-arabic" dir="rtl"> · استخدم البصمة</span>

          </button>
        )}

        <div className="flex items-center my-4">
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
          <span className="px-3 text-xs" style={{ color: "var(--gray)" }}>or<span className="font-arabic" dir="rtl"> · أو</span></span>
          <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        </div>

        <button onClick={() => { localStorage.setItem("rufayq_guest_ok", "1"); toast.info("Continuing as guest"); onLogin(); }}
          className="w-full py-3 rounded-xl btn-press flex items-center justify-center gap-2"
          style={{ background: "transparent", color: "var(--gray)", border: "1px dashed var(--gray-light)" }}>
          <UserCircle2 size={14} />
          <span className="text-[12px]">Continue as guest · <span className="font-arabic">متابعة كزائر</span></span>
        </button>

        <p className="text-center text-xs mt-5" style={{ color: "var(--gray)" }}>
          Don't have an account?{" "}
          <button onClick={() => setView("register")} className="font-semibold" style={{ color: "var(--teal-deep)" }}>
            Register<span className="font-arabic" dir="rtl"> · سجّل الآن</span>

          </button>
        </p>
      </div>
    );
  }

  // ----- OTP -----
  if (view === "otp") {
    const masked = otpChannel === "email"
      ? otpRecipient.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : otpRecipient.replace(/(\+\d{3})\d+(\d{3})/, "$1•••$2");
    const channelMeta = otpChannel === "email"
      ? { Icon: Mail, label: "Email", color: "var(--teal-deep)" }
      : otpChannel === "sms"
      ? { Icon: Phone, label: "SMS", color: "var(--teal-deep)" }
      : { Icon: MessageCircle, label: "WhatsApp", color: "#25D366" };
    const ChannelIcon = channelMeta.Icon;
    const canResend = countdown === 0 && !submitting;

    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-10 pb-8" style={{ background: "var(--off-white)" }}>
        <button onClick={() => setView(otpPurpose === "signup" ? "medical" : "login")}
          className="flex items-center gap-1 text-xs mb-4 self-start" style={{ color: "var(--teal-deep)" }}>
          <ArrowLeft size={14} /> Back<span className="font-arabic" dir="rtl"> · رجوع</span>

        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
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

        <OtpInput value={otp} onChange={setOtp} onComplete={submitOtp} disabled={submitting} error={otpError} />

        {submitting && (
          <p className="flex items-center justify-center gap-2 text-xs mt-4" style={{ color: "var(--teal-deep)" }}>
            <Loader2 size={12} className="animate-spin" /> Verifying…
          </p>
        )}

        <div className="mt-6 flex flex-col items-center">
          {countdown > 0 ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--gray-light)" strokeWidth="3" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--teal-deep)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={(2 * Math.PI * 24) * (1 - countdown / 45)}
                    style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[12px] font-bold"
                  style={{ color: "var(--navy)" }}>
                  0:{countdown.toString().padStart(2, "0")}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>Didn't get it?<span className="font-arabic" dir="rtl"> · لم يصلك الرمز؟</span></p>
            </div>
          ) : (
            <button onClick={() => handleSendOtp(otpChannel, otpRecipient, otpPurpose)} disabled={!canResend}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold btn-press disabled:opacity-50"
              style={{ background: "var(--teal-deep)", color: "white" }}>
              <RefreshCw size={12} /> Resend code<span className="font-arabic" dir="rtl"> · إعادة إرسال</span>

            </button>
          )}
        </div>

        <p className="text-[10px] text-center mt-6" style={{ color: "var(--gray)" }}>
          No code? Contact{" "}
          <a href="mailto:customersupport@rufayq.com" className="font-semibold underline" style={{ color: "var(--teal-deep)" }}>
            customersupport@rufayq.com
          </a>{" "}for a manual code.
        </p>
      </div>
    );
  }

  // ----- MEDICAL (step 2 of signup) -----
  if (view === "medical") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-6 pb-6" style={{ background: "var(--off-white)" }}>
        <button onClick={() => setView("register")} className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--teal-deep)" }}>
          <ArrowLeft size={14} /> Back<span className="font-arabic" dir="rtl"> · رجوع</span>

        </button>
        <div className="text-center mb-5">
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 2 OF 2</p>
          <h2 className="font-display text-2xl mt-1" style={{ color: "var(--navy)" }}>Medical Profile</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>الملف الطبي</p>
          <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>Optional but helps RufayQ personalize your care<span className="font-arabic" dir="rtl"> · اختياري</span></p>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Blood Type<span className="font-arabic" dir="rtl"> · فصيلة الدم</span></label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bt) => (
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
            { k: "currentMeds", l: "Current Medications", lAr: "الأدوية الحالية", p: "Metformin 500mg..." },
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

          {/* histories */}
          {[
            { title: "PAST MEDICAL HISTORY · التاريخ المرضي", list: pastHistory, add: addPast, remove: removePast, fields: (p: any, i: number) => (
              <>
                <input value={p.condition} onChange={(e) => updatePast(i, "condition", e.target.value)} placeholder="Condition (e.g. Hypertension)"
                  className="w-full px-2.5 py-2 rounded-lg text-xs outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={p.year} onChange={(e) => updatePast(i, "year", e.target.value)} placeholder="Year"
                    className="px-2.5 py-2 rounded-lg text-xs outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
                  <select value={p.status} onChange={(e) => updatePast(i, "status", e.target.value)}
                    className="px-2.5 py-2 rounded-lg text-xs outline-none" style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }}>
                    <option value="active">Active<span className="font-arabic" dir="rtl"> · نشط</span></option>
                    <option value="resolved">Resolved<span className="font-arabic" dir="rtl"> · شُفي</span></option>
                    <option value="chronic">Chronic<span className="font-arabic" dir="rtl"> · مزمن</span></option>
                  </select>
                </div>
              </>
            ) },
          ].map((sec) => (
            <div key={sec.title} className="pt-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
              <div className="flex items-center justify-between mb-1.5 mt-2">
                <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{sec.title}</p>
                <button onClick={sec.add} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>+ Add</button>
              </div>
              {sec.list.length === 0 && <p className="text-[10px] italic" style={{ color: "var(--gray)" }}>None recorded<span className="font-arabic" dir="rtl"> · لا يوجد</span></p>}
              {sec.list.map((p: any, i: number) => (
                <div key={i} className="rounded-xl p-2.5 mb-2 space-y-1.5" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>#{i + 1}</span>
                    <button onClick={() => sec.remove(i)} className="text-[10px]" style={{ color: "var(--error)" }}>Remove</button>
                  </div>
                  {sec.fields(p, i)}
                </div>
              ))}
            </div>
          ))}

          <div className="pt-1" style={{ borderTop: "1px dashed var(--gray-light)" }}>
            <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>EMERGENCY CONTACT<span className="font-arabic" dir="rtl"> · جهة الطوارئ</span></p>
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
            <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>INSURANCE<span className="font-arabic" dir="rtl"> · التأمين</span></p>
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
          <span>Encrypted · PDPL · DHA · HIPAA · GDPR compliant</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={handleCompleteSignup} disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm btn-press"
            style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
            Skip & verify
          </button>
          <button onClick={handleCompleteSignup} disabled={submitting}
            className="flex-[2] py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "var(--gold)", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Saving…" : "Complete & verify · إكمال"}
          </button>
        </div>
      </div>
    );
  }

  // ----- REGISTER (step 1 of 2) -----
  const canContinue = reg.name && reg.id && reg.dob && reg.phone && reg.password.length >= 8
    && reg.password === reg.confirmPassword && reg.acceptTerms && reg.acceptPrivacy
    && (reg.channel !== "email" || isValidEmail(reg.email));

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 pt-6 pb-6" style={{ background: "var(--off-white)" }}>
      <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-xs mb-2 self-start" style={{ color: "var(--teal-deep)" }}>
        <ArrowLeft size={14} /> Back<span className="font-arabic" dir="rtl"> · رجوع</span>

      </button>
      <div className="text-center mb-4">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>STEP 1 OF 2</p>
        <h2 className="font-display text-2xl mt-1" style={{ color: "var(--navy)" }}>Create your account</h2>
        <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أنشئ حسابك</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
        {/* Personal */}
        {[
          { label: "Full Name *", labelAr: "الاسم الكامل", placeholder: "Mohammed Al-Rashidi", key: "name" },
          { label: "الاسم بالعربي", labelAr: "", placeholder: "محمد الراشدي", key: "nameAr", rtl: true },
          { label: "ID / Passport *", labelAr: "الهوية / الجواز", placeholder: "1234567890", key: "id" },
          { label: "Date of Birth *", labelAr: "تاريخ الميلاد", placeholder: "1990-01-15", key: "dob", type: "date" },
          { label: "Mobile Number *", labelAr: "رقم الجوال", placeholder: "+966 5X XXX XXXX", key: "phone", type: "tel" },
          { label: "Nationality", labelAr: "الجنسية", placeholder: "Saudi Arabia / UAE / Qatar / …", key: "nationality" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
              {f.label} {f.labelAr && <span className="font-arabic text-xs" style={{ color: "var(--gray)" }}> · {f.labelAr}</span>}
            </label>
            <input type={(f as any).type || "text"} value={(reg as any)[f.key]}
              onChange={(e) => setReg({ ...reg, [f.key]: e.target.value })}
              placeholder={f.placeholder} dir={(f as any).rtl ? "rtl" : "ltr"}
              className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Gender<span className="font-arabic" dir="rtl"> · الجنس</span></label>
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

        {/* Verification channel selector */}
        <div className="pt-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
          <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>VERIFICATION<span className="font-arabic" dir="rtl"> · التحقق</span></p>
          <p className="text-[11px] mb-2" style={{ color: "var(--gray)" }}>How should we send your one-time code?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "whatsapp" as OtpChannel, Icon: MessageCircle, label: "WhatsApp", color: "#25D366" },
              { v: "sms" as OtpChannel, Icon: Phone, label: "SMS", color: "var(--teal-deep)" },
              { v: "email" as OtpChannel, Icon: Mail, label: "Email", color: "var(--teal-deep)" },
            ].map((c) => {
              const active = reg.channel === c.v;
              return (
                <button key={c.v} type="button" onClick={() => setReg({ ...reg, channel: c.v })}
                  className="py-2.5 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 btn-press"
                  style={{
                    background: active ? "var(--teal-deep)" : "var(--off-white)",
                    color: active ? "#fff" : "var(--navy)",
                    border: `1px solid ${active ? "var(--teal-deep)" : "var(--gray-light)"}`,
                  }}>
                  <c.Icon size={16} color={active ? "#fff" : c.color} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Email field appears ONLY when Email is selected */}
          {reg.channel === "email" && (
            <div className="mt-3">
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                Email * <span className="font-arabic text-xs" style={{ color: "var(--gray)" }}>· البريد الإلكتروني</span>
              </label>
              <input type="email" value={reg.email}
                onChange={(e) => setReg({ ...reg, email: e.target.value })}
                placeholder="email@example.com" autoComplete="email"
                className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none"
                style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
            </div>
          )}
          {reg.channel !== "email" && (
            <p className="text-[10px] mt-2" style={{ color: "var(--gray)" }}>
              Code will be sent to your mobile number above.
            </p>
          )}
        </div>

        {/* Password */}
        <div className="pt-2" style={{ borderTop: "1px dashed var(--gray-light)" }}>
          <p className="font-mono text-[9px] tracking-widest mt-2 mb-1.5" style={{ color: "var(--gold)" }}>PASSWORD<span className="font-arabic" dir="rtl"> · كلمة المرور</span></p>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Password * (min 8 chars)</label>
            <input type="password" value={reg.password}
              onChange={(e) => setReg({ ...reg, password: e.target.value })}
              autoComplete="new-password" placeholder="••••••••"
              className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Confirm password *</label>
            <input type="password" value={reg.confirmPassword}
              onChange={(e) => setReg({ ...reg, confirmPassword: e.target.value })}
              autoComplete="new-password" placeholder="••••••••"
              className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                border: `1px solid ${reg.confirmPassword && reg.password !== reg.confirmPassword ? "var(--error)" : "var(--gray-light)"}`,
                background: "var(--white)", color: "var(--navy)",
              }} />
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

      <button onClick={handleNextToMedical} disabled={!canContinue}
        className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
        style={{ background: "var(--gold)", opacity: canContinue ? 1 : 0.5, height: 52 }}>
        Continue → Medical info<span className="font-arabic" dir="rtl"> · متابعة</span>

      </button>
      <button onClick={() => setView("login")} className="mt-3 text-center text-xs" style={{ color: "var(--gray)" }}>
        Already have an account? <span style={{ color: "var(--teal-deep)" }} className="font-semibold">Sign In</span>
      </button>
    </div>
  );
};

export default LoginScreen;
