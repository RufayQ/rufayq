import { useEffect, useState } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import RufayQWordmark from "@/components/RufayQWordmark";
import OtpInput from "@/components/OtpInput";
import {
  Eye, EyeOff, ArrowLeft, Shield, MessageCircle, Mail,
  UserCircle2, Loader2, RefreshCw, Fingerprint, Phone, KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { biometric } from "@/lib/native/biometric";
import { phoneToEmail, composeE164 } from "@/lib/auth/phoneEmail";
import { detectDialCountry, getStoredDialCountry } from "@/lib/auth/phoneCountries";
import PhoneInput from "@/components/auth/PhoneInput";
import PasswordStrength, { evaluatePassword, fairAndAbovePass } from "@/components/auth/PasswordStrength";
import { lovable } from "@/integrations/lovable";


type AuthView = "welcome" | "login" | "otp" | "recover" | "newpass";
type OtpChannel = "whatsapp" | "sms" | "email";

interface LoginScreenProps { onLogin: () => void }

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [view, setView] = useState<AuthView>("welcome");

  // Sign-in state
  const [phone, setPhone] = useState("");
  const [dialCountry, setDialCountry] = useState<string>(() => detectDialCountry());
  const [dialManual, setDialManual] = useState<boolean>(() => !!getStoredDialCountry());
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState<{ userId: string; label: string } | null>(null);

  // Sign-up state retired — see /quick-signup.

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

  // Verification-assistance modal state
  const [assistKind, setAssistKind] = useState<null | "manual_code" | "profile_activation">(null);
  const [assistNote, setAssistNote] = useState("");
  const [assistSubmitting, setAssistSubmitting] = useState(false);

  const submitAssist = async () => {
    if (!assistKind) return;
    setAssistSubmitting(true);
    const { error } = await supabase.from("verification_assistance_requests").insert({
      kind: assistKind,
      channel: otpChannel,
      recipient: otpRecipient,
      full_name: null,
      note: assistNote.trim() || null,
      device_id: localStorage.getItem("rufayq_device_id"),
    });
    setAssistSubmitting(false);
    if (error) {
      toast.error("Couldn't submit request", { description: error.message });
      return;
    }
    toast.success(
      assistKind === "manual_code"
        ? "Support has been notified · سيقوم فريق الدعم بالتواصل معك"
        : "Activation request sent · تم إرسال طلب التفعيل"
    );
    setAssistKind(null);
    setAssistNote("");
  };

  // Medical/history capture retired — done in /quick-signup + Profile.

  // ---------- biometric availability ----------
  const refreshBio = async () => {
    const [avail, enrolled] = await Promise.all([biometric.isAvailable(), biometric.isEnrolled()]);
    setBioAvailable(avail);
    setBioEnrolled(enrolled);
  };
  useEffect(() => {
    refreshBio();
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
    const { data, error } = await supabase.auth.signInWithPassword({ email: signInEmail, password });
    setSubmitting(false);
    if (error) {
      toast.error("Sign-in failed", { description: "Check your number & password, or use 'Forgot password'." });
      return;
    }
    toast.success("Welcome back · مرحباً بعودتك");

    // Offer biometric enrollment if supported and not yet enrolled.
    const userId = data.user?.id;
    const avail = await biometric.isAvailable();
    const enrolled = await biometric.isEnrolled();
    if (userId && avail && !enrolled) {
      setShowEnrollPrompt({ userId, label: e164 });
    } else {
      setTimeout(onLogin, 300);
    }
  };

  const acceptEnrollment = async () => {
    if (!showEnrollPrompt) return;
    const ok = await biometric.enroll(showEnrollPrompt.userId, showEnrollPrompt.label);
    setShowEnrollPrompt(null);
    if (ok) {
      toast.success("Biometric sign-in enabled · تم تفعيل البصمة");
      await refreshBio();
    } else {
      toast.info("Biometric setup skipped · تم التخطي");
    }
    setTimeout(onLogin, 200);
  };

  const declineEnrollment = () => {
    setShowEnrollPrompt(null);
    setTimeout(onLogin, 100);
  };

  const handleBiometric = async () => {
    if (!bioAvailable || !bioEnrolled) return;
    const ok = await biometric.verify();
    if (!ok) {
      // Silent on user cancel — no scary toast.
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      toast.success("Unlocked · تم الفتح");
      onLogin();
    } else {
      toast.info("Session expired — please sign in once with your password.");
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${window.location.pathname.startsWith("/ar") ? "/ar/app" : "/app"}`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Google sign-in failed · فشل تسجيل الدخول بجوجل", { description: (error as any)?.message });
    }
  };

  // ============================================================
  // OTP send + verify — recover-only (signup uses /quick-signup)
  // ============================================================

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

    setSubmitting(false);
    toast.success("Verified · set a new password");
    setView("newpass");
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

        <Link to={typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "/ar/quick-signup" : "/quick-signup"}
          className="w-full py-4 rounded-2xl font-bold text-white btn-press flex flex-col items-center"
          style={{ background: "var(--gold)", boxShadow: "0 8px 24px rgba(197,150,90,0.3)" }}>
          <span className="text-[15px]">Create your account</span>
          <span className="font-arabic text-[12px] mt-0.5" dir="rtl">أنشئ حسابك</span>
        </Link>

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

        <button onClick={handleGoogleSignIn} disabled={submitting}
          className="w-full py-3 rounded-2xl font-semibold btn-press flex items-center justify-center gap-2 mb-3"
          style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C41 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          <span className="text-[13px]">Continue with Google · <span className="font-arabic">المتابعة بجوجل</span></span>
        </button>

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

        {bioAvailable && bioEnrolled && (
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

        <button onClick={handleGoogleSignIn} disabled={submitting}
          className="w-full py-3 rounded-2xl font-semibold btn-press flex items-center justify-center gap-2 mb-3"
          style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}>
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C41 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          <span className="text-[13px]">Continue with Google · <span className="font-arabic">المتابعة بجوجل</span></span>
        </button>

        <button onClick={() => { localStorage.setItem("rufayq_guest_ok", "1"); toast.info("Continuing as guest"); onLogin(); }}
          className="w-full py-3 rounded-xl btn-press flex items-center justify-center gap-2"
          style={{ background: "transparent", color: "var(--gray)", border: "1px dashed var(--gray-light)" }}>
          <UserCircle2 size={14} />
          <span className="text-[12px]">Continue as guest · <span className="font-arabic">متابعة كزائر</span></span>
        </button>

        <p className="text-center text-xs mt-5" style={{ color: "var(--gray)" }}>
          Don't have an account?{" "}
          <Link to={typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "/ar/quick-signup" : "/quick-signup"}
            className="font-semibold" style={{ color: "var(--teal-deep)" }}>
            Register<span className="font-arabic" dir="rtl"> · سجّل الآن</span>
          </Link>
        </p>

        {showEnrollPrompt && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-full max-w-[420px] rounded-t-2xl p-5" style={{ background: "var(--white)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint size={20} style={{ color: "var(--teal-deep)" }} />
                <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>
                  Enable biometric sign-in?
                </p>
              </div>
              <p className="font-arabic text-[13px] mb-1" dir="rtl" style={{ color: "var(--gray)" }}>
                هل تريد تفعيل تسجيل الدخول بالبصمة على هذا الجهاز؟
              </p>
              <p className="text-[12px] mb-4" style={{ color: "var(--gray)" }}>
                Use Face ID, Touch ID or fingerprint to unlock RufayQ on this device next time.
              </p>
              <div className="flex gap-2">
                <button onClick={declineEnrollment} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--off-white)", color: "var(--gray)" }}>
                  Not now · ليس الآن
                </button>
                <button onClick={acceptEnrollment} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--teal-deep)" }}>
                  Enable · تفعيل
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----- NEW PASSWORD (after recovery OTP) -----
  if (view === "newpass") {
    const pwChecks = evaluatePassword(newPass);
    const pwOk = fairAndAbovePass(pwChecks);
    const valid = pwOk && newPass === newPassConfirm;
    const submitNewPass = async () => {
      if (!valid) { toast.error("Password doesn't meet requirements or doesn't match"); return; }
      setSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password: newPass });
      setSubmitting(false);
      if (error) { toast.error("Couldn't update password", { description: error.message }); return; }
      toast.success("Password updated · تم تحديث كلمة المرور");
      setNewPass(""); setNewPassConfirm("");
      setTimeout(onLogin, 400);
    };
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-12 pb-8" style={{ background: "var(--off-white)" }}>
        <div className="text-center mb-6">
          <RufayQLogo size={56} variant="dark" />
          <h2 className="font-display text-2xl mt-3" style={{ color: "var(--navy)" }}>Set a new password</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>اختر كلمة مرور جديدة</p>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>New password</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
              autoComplete="new-password" placeholder="••••••••"
              className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none"
              style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }} />
            <PasswordStrength password={newPass} visible={newPass.length > 0} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Confirm new password</label>
            <input type="password" value={newPassConfirm} onChange={(e) => setNewPassConfirm(e.target.value)}
              autoComplete="new-password" placeholder="••••••••"
              className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                border: `1px solid ${newPassConfirm && newPass !== newPassConfirm ? "var(--error)" : "var(--gray-light)"}`,
                background: "var(--white)", color: "var(--navy)",
              }} />
          </div>
        </div>
        <button onClick={submitNewPass} disabled={!valid || submitting}
          className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
          style={{ background: "var(--teal-deep)", height: 52, opacity: !valid || submitting ? 0.6 : 1 }}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {submitting ? "Updating…" : "Update password · تحديث"}
        </button>
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
        <button onClick={() => setView("login")}
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
            6-digit code · expires in 10 minutes.
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--teal-mid)" }}>
            Got a code from Support? Just type it here. <span className="font-arabic" dir="rtl">رمز من الدعم؟ أدخله هنا.</span>
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

        {/* Fallback verification methods */}
        <div className="mt-8 pt-5 border-t" style={{ borderColor: "var(--gray-light)" }}>
          <p className="font-mono text-[9px] tracking-widest text-center mb-3" style={{ color: "var(--gold)" }}>
            STILL CAN'T VERIFY? · لا يمكنك التحقق؟
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => { setAssistNote(""); setAssistKind("manual_code"); }}
              className="w-full py-3 rounded-xl text-sm font-semibold btn-press flex items-center justify-center gap-2"
              style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}>
              <MessageCircle size={14} /> Request a code from Support · <span className="font-arabic">طلب رمز من الدعم</span>
            </button>
            <button onClick={() => { setAssistNote(""); setAssistKind("profile_activation"); }}
              className="w-full py-3 rounded-xl text-sm font-semibold btn-press flex items-center justify-center gap-2"
              style={{ background: "var(--white)", color: "var(--gold)", border: "1px solid var(--gold)" }}>
              <Shield size={14} /> Request profile activation · <span className="font-arabic">طلب تفعيل يدوي</span>
            </button>
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: "var(--gray)" }}>
            Or email{" "}
            <a href="mailto:customersupport@rufayq.com" className="font-semibold underline" style={{ color: "var(--teal-deep)" }}>
              customersupport@rufayq.com
            </a>
          </p>
        </div>

        {/* Verification-assistance modal — replaces blocked native prompt() */}
        {assistKind && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 pt-12"
            onClick={() => !assistSubmitting && setAssistKind(null)}>
            <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
              style={{ background: "var(--white)" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2">
                {assistKind === "manual_code"
                  ? <MessageCircle size={18} style={{ color: "var(--teal-deep)" }} />
                  : <Shield size={18} style={{ color: "var(--gold)" }} />}
                <h3 className="font-display text-lg" style={{ color: "var(--navy)" }}>
                  {assistKind === "manual_code" ? "Request a code from Support" : "Request profile activation"}
                </h3>
              </div>
              <p className="font-arabic text-sm mb-3" dir="rtl" style={{ color: "var(--gray)" }}>
                {assistKind === "manual_code" ? "طلب رمز من الدعم" : "طلب تفعيل يدوي"}
              </p>
              <p className="text-[11px] mb-2" style={{ color: "var(--gray)" }}>
                Sending for: <span className="font-mono" style={{ color: "var(--navy)" }}>{otpRecipient}</span>
              </p>
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                {assistKind === "manual_code"
                  ? "Add a short note (optional)"
                  : "Tell support why you need manual activation (optional)"}
              </label>
              <textarea value={assistNote} onChange={(e) => setAssistNote(e.target.value)}
                rows={3} placeholder="e.g. WhatsApp not delivering, lost SIM…"
                className="w-full mt-1 px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ border: "1px solid var(--gray-light)", background: "var(--off-white)", color: "var(--navy)" }} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setAssistKind(null)} disabled={assistSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-press"
                  style={{ border: "1px solid var(--gray-light)", color: "var(--gray)" }}>
                  Cancel · إلغاء
                </button>
                <button onClick={submitAssist} disabled={assistSubmitting}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white btn-press flex items-center justify-center gap-1.5"
                  style={{ background: assistKind === "manual_code" ? "var(--teal-deep)" : "var(--gold)", opacity: assistSubmitting ? 0.6 : 1 }}>
                  {assistSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {assistSubmitting ? "Sending…" : "Send request · إرسال"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Medical step retired — captured later from Profile → Medical history.

  // Register view retired — Traveller account creation lives at /quick-signup.
  return null;
};

export default LoginScreen;
