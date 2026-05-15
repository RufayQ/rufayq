import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { setStoredRole } from "@/screens/RoleSelectorScreen";
import { phoneToEmail, isValidEmail, isValidE164, composeE164 } from "@/lib/auth/phoneEmail";
import { detectDialCountry, getStoredDialCountry, nationalityToIso2 } from "@/lib/auth/phoneCountries";
import PhoneInput from "@/components/auth/PhoneInput";
import PasswordStrength, { evaluatePassword, fairAndAbovePass } from "@/components/auth/PasswordStrength";
import RufayQLogo from "@/components/RufayQLogo";
import NationalityCombobox from "@/components/NationalityCombobox";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Seo } from "@/seo/Seo";

const BG_DARK = "#06101A";
const BG_DARK_2 = "#0B1A28";
const BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0";
const TEXT_MUTED = "rgba(232,236,240,0.6)";
const GOLD = "#C5965A";
const TEAL = "#0FB5C9";

const QuickSignup = () => {
  const { mode } = useLanguage();
  const navigate = useNavigate();
  const isAr = mode === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameAr, setFirstNameAr] = useState("");
  const [lastNameAr, setLastNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCountry, setDialCountry] = useState<string>(() => detectDialCountry());
  const [dialManual, setDialManual] = useState<boolean>(() => !!getStoredDialCountry());
  const [password, setPassword] = useState("");
  const [pwFocused, setPwFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "other">("");
  const [terms, setTerms] = useState(false);
  const [showOptional, setShowOptional] = useState(isAr);
  const [submitting, setSubmitting] = useState(false);
  const [serverPwError, setServerPwError] = useState<string | null>(null);

  const fullNameEn = `${firstName.trim()} ${lastName.trim()}`.trim();
  const fullNameAr = [firstNameAr.trim(), lastNameAr.trim()].filter(Boolean).join(" ").trim() || null;
  const e164 = composeE164(dialCountry, phone);
  const pwChecks = evaluatePassword(password, { firstName, lastName, phone });
  const pwOk = fairAndAbovePass(pwChecks);
  const canSubmit =
    !!firstName.trim() &&
    !!lastName.trim() &&
    isValidE164(e164) &&
    pwOk &&
    terms &&
    (!email.trim() || isValidEmail(email)) &&
    !submitting;

  // Mirror nationality -> dial code unless the user manually overrode the chip.
  useEffect(() => {
    if (dialManual) return;
    const iso = nationalityToIso2(nationality);
    if (iso && iso !== dialCountry) setDialCountry(iso);
  }, [nationality, dialManual, dialCountry]);

  // Persist Traveller role + sign out any stale staff/provider session.
  useEffect(() => {
    setStoredRole("patient");
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          const isStaff = (data || []).some(
            (r: any) => r.role === "admin" || r.role === "moderator" || r.role === "doctor",
          );
          if (isStaff) await supabase.auth.signOut();
        }
      } catch { /* noop */ }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerPwError(null);
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("First and last name are required", "الاسم الأول والاسم الأخير مطلوبان")); return;
    }
    if (!isValidE164(e164)) { toast.error(t("Enter a valid mobile number", "أدخل رقم جوال صحيح")); return; }
    if (!pwOk) {
      toast.error(t("Password doesn't meet the requirements below", "كلمة السر لا تحقق المتطلبات أدناه")); return;
    }
    if (email && !isValidEmail(email)) { toast.error(t("Email is invalid", "البريد غير صالح")); return; }
    if (!terms) { toast.error(t("Please accept Terms & Privacy", "يرجى قبول الشروط والخصوصية")); return; }

    setSubmitting(true);
    const signInEmail = phoneToEmail(e164);

    // 1. Try sign-up; fall back to sign-in if the user already exists.
    let userId: string | undefined;
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: signInEmail,
      password,
      options: { emailRedirectTo: `${window.location.origin}${isAr ? "/ar/app" : "/app"}` },
    });

    if (signUpErr) {
      const msg = signUpErr.message || "";
      if (/already|registered|exists/i.test(msg)) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: signInEmail, password,
        });
        if (signInErr) {
          setSubmitting(false);
          toast.error(t("This number is already registered", "هذا الرقم مسجّل مسبقاً"), {
            description: t("Wrong password — try sign in instead.", "كلمة السر غير صحيحة — جرّب تسجيل الدخول."),
          });
          return;
        }
        userId = signInData.user?.id;
      } else {
        setSubmitting(false);
        if (/weak|password|pwned|leaked|easy to guess/i.test(msg)) {
          setServerPwError(t("Password rejected by server. Try a longer or more unique password.", "تم رفض كلمة السر من الخادم. جرّب كلمة سر أطول أو أكثر تفرداً.") + " — " + msg);
        } else {
          toast.error(t("Sign-up failed", "فشل إنشاء الحساب"), { description: msg });
        }
        return;
      }
    } else {
      userId = signUpData.user?.id;
    }

    // 2. Require a real session before persisting baseline rows.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user || !userId) {
      setSubmitting(false);
      toast.error(
        t("Account created — please sign in", "تم إنشاء الحساب — يرجى تسجيل الدخول"),
        { description: t("Email confirmation may be required.", "قد يكون التأكيد عبر البريد مطلوباً.") },
      );
      return;
    }

    // 3. Re-key device id to RLS-compatible auth_${userId}.
    const newDeviceId = `auth_${userId}`;
    try { localStorage.setItem("rufayq_device_id", newDeviceId); } catch { /* ignore */ }

    // 4. Mark fresh so the welcome tour fires on first home render.
    try {
      const { markUserFresh } = await import("@/hooks/useFreshStart");
      markUserFresh(userId);
    } catch { /* noop */ }

    // 5. Upsert baseline profile + medical rows.
    const now = new Date().toISOString();
    const { error: pErr } = await supabase.from("profiles").upsert({
      device_id: newDeviceId,
      full_name_en: fullNameEn,
      full_name_ar: fullNameAr,
      phone: e164,
      email: email.trim() || null,
      nationality: nationality.trim() || null,
      gender: gender || null,
      terms_accepted_at: now,
      privacy_accepted_at: now,
      contact_verified: false,
      contact_verification_status: "pending",
    } as any, { onConflict: "device_id" });
    if (pErr) console.warn("[quick-signup] profiles upsert", pErr);

    const { error: mErr } = await supabase.from("medical_profiles").upsert({
      device_id: newDeviceId,
      allergies: [],
      chronic_conditions: [],
      current_medications: [],
    } as any, { onConflict: "device_id" });
    if (mErr) console.warn("[quick-signup] medical_profiles upsert", mErr);

    setSubmitting(false);
    toast.success(t("Welcome to RufayQ", "أهلاً بك في رُفَيِّق"));
    navigate(isAr ? "/ar/app" : "/app", { replace: true });
  };

  const labelStyle = { color: TEXT_MUTED } as const;
  const inputStyle = {
    background: BG_DARK_2,
    border: `1px solid ${BORDER}`,
    color: TEXT,
  } as const;

  return (
    <>
      <Seo
        title={isAr ? "إنشاء حساب — رُفَيِّق" : "Create account — RufayQ"}
        description={isAr
          ? "أنشئ حساب مسافر علاجي في رُفَيِّق خلال أقل من دقيقة."
          : "Create your RufayQ Traveller account in under a minute."}
        noindex
      />
      <div
        className="min-h-screen"
        style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }}
        dir={isAr ? "rtl" : "ltr"}
      >
        <nav
          className="sticky top-0 z-50 backdrop-blur-xl"
          style={{ background: "rgba(6,16,26,0.75)", borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to={isAr ? "/ar/auth" : "/auth"} className="flex items-center gap-2.5">
              <RufayQLogo size={26} variant="light" />
              <span className="font-display text-base tracking-tight">
                <span style={{ color: TEXT }}>Rufay</span>
                <span className="font-bold" style={{ color: GOLD }}>Q</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher compact />
              <Link
                to={isAr ? "/ar/auth" : "/auth"}
                className="text-[12px] flex items-center gap-1"
                style={{ color: TEXT_MUTED }}
              >
                <ArrowLeft size={14} /> {t("Back", "رجوع")}
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-md mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: GOLD }}>
              {t("TRAVELLER QUICK SIGN-UP", "تسجيل سريع للمسافر")}
            </p>
            <h1 className="font-display text-3xl tracking-tight" style={{ fontWeight: 300 }}>
              {t("Create your account", "أنشئ حسابك")}
            </h1>
            <p className="text-[13px] mt-2" style={{ color: TEXT_MUTED }}>
              {t("Name, mobile and password — that's it.", "الاسم والجوال وكلمة السر فقط.")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px]" style={labelStyle}>{t("First name", "الاسم الأول")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("e.g. Mohammed", "مثال: محمد")}
                  className="w-full mt-1 px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[--ring]"
                  style={inputStyle}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label className="text-[12px]" style={labelStyle}>{t("Last name", "اسم العائلة")}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("e.g. Al-Saud", "مثال: آل سعود")}
                  className="w-full mt-1 px-4 py-3 rounded-xl outline-none"
                  style={inputStyle}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[12px]" style={labelStyle}>{t("Mobile number", "رقم الجوال")}</label>
              <PhoneInput
                country={dialCountry}
                onCountryChange={(code, meta) => { setDialCountry(code); if (meta.manual) setDialManual(true); }}
                national={phone}
                onNationalChange={setPhone}
                isAr={isAr}
                inputStyle={inputStyle}
                chipStyle={inputStyle}
                placeholder={t("5X XXX XXXX", "5X XXX XXXX")}
                autoDetected={!dialManual}
              />
            </div>

            <div>
              <label className="text-[12px]" style={labelStyle}>{t("Password", "كلمة السر")}</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (serverPwError) setServerPwError(null); }}
                  onFocus={() => setPwFocused(true)}
                  placeholder={t("At least 8 characters", "8 أحرف على الأقل")}
                  className="w-full px-4 py-3 pe-12 rounded-xl outline-none"
                  style={inputStyle}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isAr ? "left-3" : "right-3"} p-1`}
                  style={{ color: TEXT_MUTED }}
                  aria-label={t("Toggle password visibility", "إظهار/إخفاء كلمة السر")}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {serverPwError && (
                <p
                  className="mt-2 text-[12px] rounded-md px-3 py-2"
                  style={{ color: "#E5484D", background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.25)" }}
                  data-testid="server-pw-error"
                >
                  {serverPwError}
                </p>
              )}
              <PasswordStrength
                password={password}
                firstName={firstName}
                lastName={lastName}
                phone={phone}
                visible={pwFocused || password.length > 0}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="text-[12px] underline"
              style={{ color: TEAL }}
            >
              {showOptional ? t("Hide optional details", "إخفاء التفاصيل الاختيارية") : t("Add optional details", "إضافة تفاصيل اختيارية")}
            </button>

            {showOptional && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px]" style={labelStyle}>{t("First name (Arabic)", "الاسم الأول (عربي)")}</label>
                    <input
                      type="text"
                      value={firstNameAr}
                      onChange={(e) => setFirstNameAr(e.target.value)}
                      placeholder="محمد"
                      className="w-full mt-1 px-4 py-3 rounded-xl outline-none lang-keep"
                      style={inputStyle}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="text-[12px]" style={labelStyle}>{t("Last name (Arabic)", "اسم العائلة (عربي)")}</label>
                    <input
                      type="text"
                      value={lastNameAr}
                      onChange={(e) => setLastNameAr(e.target.value)}
                      placeholder="آل سعود"
                      className="w-full mt-1 px-4 py-3 rounded-xl outline-none lang-keep"
                      style={inputStyle}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px]" style={labelStyle}>{t("Email (optional)", "البريد الإلكتروني (اختياري)")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-xl outline-none"
                    style={inputStyle}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-[12px]" style={labelStyle}>{t("Nationality", "الجنسية")}</label>
                  <NationalityCombobox
                    value={nationality}
                    onChange={setNationality}
                    className="w-full mt-1 px-4 py-3 rounded-xl outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 text-[12px]" style={{ color: TEXT_MUTED }}>
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {t("I agree to the ", "أوافق على ")}
                <Link to={isAr ? "/ar/terms" : "/terms"} className="underline" style={{ color: GOLD }}>
                  {t("Terms", "الشروط")}
                </Link>
                {t(" and ", " و ")}
                <Link to={isAr ? "/ar/privacy" : "/privacy"} className="underline" style={{ color: GOLD }}>
                  {t("Privacy Policy", "سياسة الخصوصية")}
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
              style={{ background: GOLD, color: "#06101A" }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t("Create account & continue", "إنشاء الحساب والمتابعة")}
            </button>

            <div className="flex items-center gap-3 my-1" aria-hidden="true">
              <div className="flex-1 h-px" style={{ background: BORDER }} />
              <span className="text-[10px] font-mono tracking-widest" style={{ color: TEXT_MUTED }}>
                {t("OR", "أو")}
              </span>
              <div className="flex-1 h-px" style={{ background: BORDER }} />
            </div>

            <button
              type="button"
              onClick={async () => {
                const { lovable } = await import("@/integrations/lovable");
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}${isAr ? "/ar/app" : "/app"}`,
                });
                if (error) toast.error(t("Google sign-in failed", "فشل تسجيل الدخول بجوجل"), { description: (error as any)?.message });
              }}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: BG_DARK_2, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.3C41 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              <span className="text-[13px]">{t("Continue with Google", "المتابعة بحساب جوجل")}</span>
            </button>

            <p className="text-center text-[12px]" style={{ color: TEXT_MUTED }}>
              {t("Already have an account?", "لديك حساب بالفعل؟")}{" "}
              <Link to={isAr ? "/ar/app?signin=1" : "/app?signin=1"} className="underline" style={{ color: GOLD }}>
                {t("Sign in", "تسجيل الدخول")}
              </Link>
            </p>

            <p
              className="text-[11px] text-center mt-4 rounded-lg px-3 py-2"
              style={{ color: TEXT_MUTED, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}
            >
              {t(
                "Your account starts as registered but contact-not-verified. Verification is coming soon.",
                "يبدأ حسابك كمسجّل بدون التحقق من جهة الاتصال. سيتوفر التحقق قريباً.",
              )}
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default QuickSignup;
