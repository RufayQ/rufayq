import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Building2, Stethoscope, Shield, Package, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BG_DARK = "#06101A";
const BG_DARK_2 = "#0B1A28";
const BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0";
const TEXT_MUTED = "rgba(232,236,240,0.6)";
const GOLD = "#C5965A";
const TEAL = "#0FB5C9";

type Side = null | "patient" | "provider";

const Auth = () => {
  const { mode } = useLanguage();
  const navigate = useNavigate();
  const isAr = mode === "ar";
  const [side, setSide] = useState<Side>(null);

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const providerTypes = [
    { id: "hospital", icon: Building2, en: "Hospital", ar: "مستشفى", desc_en: "Multi-specialty centers", desc_ar: "مراكز متعددة التخصصات" },
    { id: "physician", icon: Stethoscope, en: "Physician / Clinic", ar: "طبيب / عيادة", desc_en: "Independent practices", desc_ar: "عيادات مستقلة" },
    { id: "insurance", icon: Shield, en: "Insurance", ar: "تأمين", desc_en: "Coverage & claims", desc_ar: "التغطية والمطالبات" },
    { id: "vendor", icon: Package, en: "Vendor", ar: "مزوّد خدمة", desc_en: "Pharmacy, labs, devices", desc_ar: "صيدليات ومختبرات وأجهزة" },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={isAr ? "rtl" : "ltr"}>
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.75)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg tracking-tight">
              <span style={{ color: TEXT }}>Rufay</span>
              <span className="font-bold" style={{ color: GOLD }}>Q</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link to="/" className="text-[12px] flex items-center gap-1" style={{ color: TEXT_MUTED }}>
              <ArrowLeft size={14} /> {t("Home", "الرئيسية")}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {!side && (
          <>
            <div className="text-center mb-12">
              <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: GOLD }}>{t("SIGN IN / SIGN UP", "تسجيل الدخول / إنشاء حساب")}</p>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight" style={{ fontWeight: 300 }}>
                {t("Choose your account type", "اختر نوع الحساب")}
              </h1>
              <p className="text-sm mt-3" style={{ color: TEXT_MUTED }}>
                {t("Select Patient if you're seeking care, or Provider if you deliver healthcare services.", "اختر «مريض» إذا كنت تطلب الرعاية، أو «مزوّد» إذا كنت تقدّم خدمات الرعاية الصحية.")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => navigate("/app?signin=1")}
                className="group text-start rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02]"
                style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: `${TEAL}22`, color: TEAL }}>
                  <User size={26} />
                </div>
                <h2 className="font-display text-2xl mb-2">{t("Patient", "مريض")}</h2>
                <p className="text-[13px] mb-5" style={{ color: TEXT_MUTED }}>
                  {t("Track your medical journey, records, medications, appointments and chat with RufayQ AI.", "تابع رحلتك الطبية وسجلاتك وأدويتك ومواعيدك وتحدث مع رُفَيِّق الذكي.")}
                </p>
                <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: GOLD }}>
                  {t("Open patient app", "افتح تطبيق المريض")} <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              <button
                onClick={() => setSide("provider")}
                className="group text-start rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02]"
                style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: `${GOLD}22`, color: GOLD }}>
                  <Building2 size={26} />
                </div>
                <h2 className="font-display text-2xl mb-2">{t("Provider", "مزوّد")}</h2>
                <p className="text-[13px] mb-5" style={{ color: TEXT_MUTED }}>
                  {t("Hospitals, physicians, insurance and vendors managing patient care across borders.", "المستشفيات والأطباء وشركات التأمين ومزوّدو الخدمة الذين يديرون رعاية المرضى عبر الحدود.")}
                </p>
                <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: GOLD }}>
                  {t("Continue as provider", "متابعة كمزوّد")} <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            <p className="text-center text-[12px] mt-10" style={{ color: TEXT_MUTED }}>
              {t("New provider organisation?", "منظمة مزوّد جديدة؟")}{" "}
              <Link to="/providers" className="underline" style={{ color: GOLD }}>
                {t("Apply for access", "قدّم طلب وصول")}
              </Link>
            </p>
          </>
        )}

        {side === "provider" && (
          <>
            <button onClick={() => setSide(null)} className="text-[12px] flex items-center gap-1 mb-8" style={{ color: TEXT_MUTED }}>
              <ArrowLeft size={14} /> {t("Back", "رجوع")}
            </button>

            <div className="text-center mb-10">
              <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: GOLD }}>{t("PROVIDER ACCESS", "وصول المزوّد")}</p>
              <h1 className="font-display text-3xl md:text-4xl tracking-tight" style={{ fontWeight: 300 }}>
                {t("Select your organisation type", "اختر نوع منظمتك")}
              </h1>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {providerTypes.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/provider/login?type=${p.id}`)}
                    className="group flex items-start gap-4 text-start rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
                    style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
                  >
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${TEAL}1A`, color: TEAL }}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[15px]">{t(p.en, p.ar)}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: TEXT_MUTED }}>{t(p.desc_en, p.desc_ar)}</p>
                    </div>
                    <ChevronRight size={18} style={{ color: GOLD }} className="transition-transform group-hover:translate-x-1 mt-2" />
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[12px] mt-10" style={{ color: TEXT_MUTED }}>
              {t("Don't have an account yet?", "ليس لديك حساب بعد؟")}{" "}
              <Link to="/providers" className="underline" style={{ color: GOLD }}>
                {t("Apply for provider access", "قدّم طلب وصول كمزوّد")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
