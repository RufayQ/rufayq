/**
 * ContactDivert — elite landing-style "soft 404" served at /contact and
 * /notfoundpage. Replaces the previous Book-a-demo / contact linkage that
 * 404'd by gracefully diverting visitors back to the main landing site,
 * with a few high-intent shortcuts (App, Providers, Email, WhatsApp).
 */
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, ArrowRight, MessageCircle, Mail, Building2 } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import SeoLazy from "@/seo/SeoLazy";

const BG_DARK = "#06101A";
const BG_DARK_2 = "#0B1A28";
const BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0";
const TEXT_MUTED = "rgba(232,236,240,0.6)";
const GOLD = "#C5965A";
const TEAL = "#2BA89A";

const ContactDivert = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAr = location.pathname.startsWith("/ar");
  const home = isAr ? "/ar" : "/";

  // Auto-divert to the main landing after 8s if the visitor doesn't act.
  useEffect(() => {
    const t = window.setTimeout(() => navigate(home, { replace: true }), 8000);
    return () => window.clearTimeout(t);
  }, [navigate, home]);

  const shortcuts = [
    {
      to: home,
      icon: Home,
      en: "Main landing",
      ar: "الصفحة الرئيسية",
      desc: isAr ? "اكتشف رُفَيِّق — رفيقك الطبي ثنائي اللغة" : "Discover RufayQ — your bilingual medical companion",
      primary: true,
    },
    {
      to: isAr ? "/ar/app" : "/app",
      icon: ArrowRight,
      en: "Open the App",
      ar: "افتح التطبيق",
      desc: isAr ? "ابدأ تنظيم رحلتك العلاجية" : "Start organizing your treatment journey",
    },
    {
      to: isAr ? "/ar/providers" : "/providers",
      icon: Building2,
      en: "For Providers",
      ar: "للمزوّدين الطبيين",
      desc: isAr ? "المستشفيات والعيادات والشركاء" : "Hospitals, clinics & partners",
    },
  ];

  const channels = [
    { href: "mailto:support@rufayq.com?subject=RufayQ%20Inquiry", icon: Mail, label: "support@rufayq.com", sub: isAr ? "رد خلال 24 ساعة" : "Reply within 24 hours" },
    { href: "https://wa.me/966569590418?text=Hello%20RufayQ", icon: MessageCircle, label: "+966 56 959 0418", sub: isAr ? "واتساب · 8ص–10م" : "WhatsApp · 8AM–10PM AST" },
  ];

  return (
    <>
      <SeoLazy
        title={isAr ? "تواصل مع رُفَيِّق · العودة إلى الصفحة الرئيسية" : "Get in touch with RufayQ · Back to home"}
        description={isAr ? "هذه الصفحة لم تعد متاحة. عُد إلى الصفحة الرئيسية أو تواصل معنا عبر البريد أو واتساب." : "This page is no longer available. Head back to the main landing or reach us by email or WhatsApp."}
      />
      <main
        dir={isAr ? "rtl" : "ltr"}
        className="min-h-screen flex flex-col items-center px-6 py-14"
        style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }}
      >
        {/* Brand */}
        <Link to={home} className="flex items-center gap-2.5 mb-14">
          <RufayQLogo size={32} variant="light" />
          <span className="font-display text-xl tracking-tight">
            <span style={{ color: TEXT }}>Rufay</span>
            <span className="font-bold" style={{ color: GOLD }}>Q</span>
          </span>
        </Link>

        {/* Hero */}
        <section className="text-center max-w-2xl">
          <p className="font-mono text-[10px] tracking-[0.35em] mb-5" style={{ color: GOLD }}>
            {isAr ? "إعادة توجيه" : "REDIRECT · 8s"}
          </p>
          <h1
            className="font-display text-5xl md:text-6xl mb-5 tracking-tight leading-[1.05]"
            style={{ fontWeight: 300 }}
          >
            {isAr ? (
              <span className="font-arabic">هذه الصفحة <em style={{ color: GOLD, fontStyle: "normal" }}>انتقلت</em></span>
            ) : (
              <>This page has <em style={{ color: GOLD, fontStyle: "normal" }}>moved</em></>
            )}
          </h1>
          <p className="text-base md:text-[15px] mb-10 max-w-md mx-auto" style={{ color: TEXT_MUTED }}>
            {isAr ? (
              <span className="font-arabic">سنعيدك إلى الصفحة الرئيسية تلقائياً، أو اختر إحدى الوجهات أدناه.</span>
            ) : (
              "We'll take you back to the main landing automatically — or pick a destination below."
            )}
          </p>

          {/* Shortcut grid */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-14">
            {shortcuts.map((s) => (
              <Link
                key={s.en}
                to={s.to}
                className="rounded-2xl p-5 text-left transition-all hover:-translate-y-1 hover:bg-white/[0.04] group"
                style={{
                  background: s.primary ? `linear-gradient(135deg, ${TEAL}26, ${GOLD}1A)` : BG_DARK_2,
                  border: `1px solid ${s.primary ? GOLD : BORDER}`,
                }}
              >
                <s.icon size={20} color={GOLD} className="mb-3 transition-transform group-hover:translate-x-0.5" />
                <p className="text-sm font-semibold mb-0.5" style={{ color: TEXT }}>
                  {isAr ? s.ar : s.en}
                </p>
                <p className="text-[11px] leading-snug" style={{ color: TEXT_MUTED }}>{s.desc}</p>
              </Link>
            ))}
          </div>

          {/* Direct channels */}
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: TEXT_MUTED }}>
            {isAr ? "أو تواصل مباشرة" : "OR REACH US DIRECTLY"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="rounded-xl p-4 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5"
                style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
              >
                <c.icon size={18} color={GOLD} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: GOLD }}>{c.label}</p>
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{c.sub}</p>
                </div>
              </a>
            ))}
          </div>

          <Link
            to={home}
            className="inline-flex items-center gap-2 mt-12 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{ background: GOLD, color: BG_DARK }}
          >
            {isAr ? "← العودة الآن" : "Back to RufayQ now →"}
          </Link>
        </section>
      </main>
    </>
  );
};

export default ContactDivert;
