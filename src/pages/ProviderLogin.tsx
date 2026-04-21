import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Stethoscope, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const ProviderLogin = () => {
  const navigate = useNavigate();
  const { mode } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A", TEAL = "#0FB5C9";

  const showEn = mode !== "ar";
  const showAr = mode !== "en";

  const t = {
    back: { en: "Back to home", ar: "العودة للرئيسية" },
    title: { en: "Provider Portal", ar: "بوابة مقدّمي الرعاية" },
    email: { en: "Email", ar: "البريد الإلكتروني" },
    password: { en: "Password", ar: "كلمة المرور" },
    signIn: { en: "Sign in", ar: "تسجيل الدخول" },
    signing: { en: "Signing in...", ar: "جارٍ تسجيل الدخول..." },
    notReg: { en: "Not registered yet?", ar: "غير مسجّل بعد؟" },
    apply: { en: "Apply as a provider", ar: "قدّم كمزوّد" },
    invalid: { en: "Invalid credentials", ar: "بيانات الاعتماد غير صحيحة" },
    notLinked: { en: "This account is not linked to an approved provider organization. Contact enterprise@rufayq.com.", ar: "هذا الحساب غير مرتبط بمؤسسة مزوّدة معتمدة. تواصل مع enterprise@rufayq.com." },
    welcome: { en: "Welcome back", ar: "مرحباً بعودتك" },
    forgot: { en: "Forgot password?", ar: "نسيت كلمة المرور؟" },
    resetSent: { en: "Password reset link sent to your email", ar: "تم إرسال رابط إعادة التعيين إلى بريدك" },
    resetNeedEmail: { en: "Enter your email above first", ar: "أدخل بريدك الإلكتروني أولاً" },
  };
  const tx = (k: keyof typeof t) => mode === "ar" ? t[k].ar : mode === "en" ? t[k].en : `${t[k].en} · ${t[k].ar}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.session) {
      setBusy(false);
      toast.error(error?.message || tx("invalid"));
      return;
    }
    const { data: members } = await supabase
      .from("provider_members")
      .select("organization_id, is_active")
      .eq("user_id", data.session.user.id)
      .eq("is_active", true);
    if (!members || members.length === 0) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error(tx("notLinked"));
      return;
    }
    toast.success(tx("welcome"));
    navigate("/provider", { replace: true });
  };

  const handleForgot = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { toast.error(tx("resetNeedEmail")); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth?reset=1`,
    });
    if (error) toast.error(error.message);
    else toast.success(tx("resetSent"));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={mode === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm" style={{ color: MUTED }}>
            <ArrowLeft size={14} /> {tx("back")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="rounded-3xl p-8" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3 mb-2">
            <RufayQLogo size={36} variant="light" />
            <Stethoscope size={20} color={GOLD} />
          </div>
          {showEn && <h1 className="font-display text-3xl mb-1" style={{ fontWeight: 300 }}>{t.title.en}</h1>}
          {showAr && <p className="font-arabic text-lg mb-6" dir="rtl" style={{ color: GOLD, fontWeight: showEn ? 400 : 600 }}>{t.title.ar}</p>}

          <form onSubmit={submit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: MUTED }}>{tx("email")}</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                placeholder="provider@hospital.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: MUTED }}>{tx("password")}</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                dir="ltr"
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: GOLD, color: BG }}
            >
              <Lock size={14} /> {busy ? tx("signing") : tx("signIn")}
            </button>
          </form>

          <button type="button" onClick={handleForgot}
            className="w-full mt-3 text-xs text-center underline" style={{ color: TEAL }}>
            {tx("forgot")}
          </button>

          <p className="text-xs mt-6 text-center" style={{ color: MUTED }}>
            {tx("notReg")}{" "}
            <Link to="/providers" style={{ color: TEAL }}>{tx("apply")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderLogin;
