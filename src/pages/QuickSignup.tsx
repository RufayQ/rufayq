import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { setStoredRole } from "@/screens/RoleSelectorScreen";
import { phoneToE164, phoneToEmail, isValidEmail } from "@/lib/auth/phoneEmail";
import RufayQLogo from "@/components/RufayQLogo";
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

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("Saudi Arabia");
  const [terms, setTerms] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    if (!name.trim()) { toast.error(t("Full name is required", "الاسم الكامل مطلوب")); return; }
    const e164 = phoneToE164(phone);
    if (!e164 || e164.length < 8) { toast.error(t("Enter a valid mobile number", "أدخل رقم جوال صحيح")); return; }
    if (!password || password.length < 8) {
      toast.error(t("Password must be at least 8 characters", "كلمة السر 8 أحرف على الأقل")); return;
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
        toast.error(t("Sign-up failed", "فشل إنشاء الحساب"), { description: msg });
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
      full_name_en: name.trim(),
      full_name_ar: nameAr.trim() || null,
      phone: e164,
      email: email.trim() || null,
      nationality,
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
            <div>
              <label className="text-[12px]" style={labelStyle}>{t("Full name", "الاسم الكامل")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("e.g. Mohammed Al-Saud", "مثال: محمد آل سعود")}
                className="w-full mt-1 px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[--ring]"
                style={inputStyle}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="text-[12px]" style={labelStyle}>{t("Mobile number", "رقم الجوال")}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5X XXX XXXX"
                className="w-full mt-1 px-4 py-3 rounded-xl outline-none"
                style={inputStyle}
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div>
              <label className="text-[12px]" style={labelStyle}>{t("Password", "كلمة السر")}</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                <div>
                  <label className="text-[12px]" style={labelStyle}>{t("Arabic name (optional)", "الاسم بالعربية (اختياري)")}</label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-xl outline-none"
                    style={inputStyle}
                    dir="rtl"
                  />
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
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
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
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: GOLD, color: "#06101A" }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t("Create account & continue", "إنشاء الحساب والمتابعة")}
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
