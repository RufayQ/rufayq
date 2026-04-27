import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import LazyOnView from "@/components/LazyOnView";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCmsPage } from "@/hooks/useCmsPage";
/**
 * SEO is mounted lazily (after first paint) so react-helmet-async (~17 kB)
 * never enters the LCP critical chain. Googlebot waits for hydrated content,
 * so canonical/hreflang/OG/JSON-LD still get picked up.
 */
import { SeoLazy } from "@/seo/SeoLazy";
import {
  ArrowRightIcon, SparklesIcon, LockIcon, GlobeIcon, HeartIcon,
  MenuIcon, XIcon, ChevronDownIcon,
} from "@/components/HeroIcons";

/**
 * Below-the-fold sections (Features → Footer) live in their own chunk.
 * The hero paints first using only inline SVG + tiny providers, so the
 * 47 kB lucide chunk + 17 kB helmet chunk never enter the critical path.
 */
const LandingBelow = lazy(() => import("./LandingBelow"));

const Landing = () => {
  const navigate = useNavigate();
  const { mode } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // ELITE DARK THEME — single source of truth shared with LandingBelow.
  const BG_DARK = "#06101A";
  const BG_DARK_2 = "#0B1A28";
  const BORDER = "rgba(197,150,90,0.12)";
  const TEXT = "#E8ECF0";
  const TEXT_MUTED = "rgba(232,236,240,0.55)";
  const GOLD = "#C5965A";
  const GOLD_BRIGHT = "#E6B575";
  const TEAL = "#0FB5C9";

  const isAr = mode === "ar";
  const isBoth = mode === "both";

  // ── CMS overrides (Phase 1: hero CTAs + trust badges) ───────────────
  // Hardcoded defaults below remain as fallback when CMS is empty / loading.
  const { getSection } = useCmsPage("home");
  const heroCms = getSection<{
    primaryCta?: { label?: string; link?: string };
    secondaryCta?: { label?: string; link?: string };
    badges?: { text: string }[];
  }>("hero", isAr ? "ar" : "en");

  const defaultTrust = [
    { Icon: LockIcon, en: "End-to-end encrypted", ar: "تشفير كامل" },
    { Icon: GlobeIcon, en: "Bilingual EN / AR", ar: "ثنائي اللغة عربي/إنجليزي" },
    { Icon: HeartIcon, en: "For Gulf & global patients", ar: "لمرضى الخليج والعالم" },
  ];
  const trustPoints = (heroCms?.badges?.length ?? 0) > 0
    ? heroCms!.badges!.map((b) => ({ Icon: LockIcon, en: b.text, ar: b.text }))
    : defaultTrust;

  const ctaPrimaryLabel = heroCms?.primaryCta?.label || (isAr ? "ابدأ مجاناً" : "Start free");
  const ctaSecondaryLabel = heroCms?.secondaryCta?.label || (isAr ? "كيف يعمل" : "See how it works");
  const ctaSecondaryLink = heroCms?.secondaryCta?.link || "#features";

  const navLinks: { en: string; ar: string; href: string; isRoute?: boolean; anchorId?: string }[] = [
    { en: "Features", ar: "المميزات", href: "#features" },
    { en: "How", ar: "كيف يعمل", href: "#how" },
    // Pricing: prefer in-page #pricing anchor when present (faster, no nav), fall back to /pricing route.
    { en: "Pricing", ar: "الأسعار", href: isAr ? "/ar/pricing" : "/pricing", isRoute: true, anchorId: "pricing" },
    { en: "FAQ", ar: "الأسئلة", href: "#faq" },
    { en: "Contact", ar: "تواصل", href: "#contact" },
  ];

  const goToApp = () => navigate("/app");
  // The prominent gold CTA in the nav routes to the dedicated News & Articles
  // page (admin-managed via the Site Pages → landing-news slug). The hero
  // "Start free" button still routes to the app.
  const goToNews = () => navigate(isAr ? "/ar/news" : "/news");

  return (
    <>
      <SeoLazy
        title={isAr ? "رُفَيِّق — رفيقك الطبي ثنائي اللغة للسفر للعلاج" : "RufayQ — Bilingual AI Medical Travel Companion"}
        description={isAr
          ? "رُفَيِّق هو الرفيق الذكي ثنائي اللغة لمرضى الخليج المسافرين للعلاج. تتبّع الرحلات، الأدوية، المواعيد، وكل تقاريرك الطبية."
          : "RufayQ is the bilingual EN/AR AI companion for Gulf patients travelling for treatment. Track flights, medications, appointments, and every medical report."}
      />
      <div className="min-h-screen" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }} dir={isAr ? "rtl" : "ltr"}>
        {/* NAV */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.75)", borderBottom: `1px solid ${BORDER}` }}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
              <RufayQLogo size={32} variant="light" />
              <span className="font-display text-xl tracking-tight">
                <span style={{ color: TEXT }}>Rufay</span>
                <span className="font-bold" style={{ color: GOLD }}>Q</span>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                l.isRoute ? (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={(e) => {
                      // If the section is mounted on this page, prefer smooth-scroll over a route swap.
                      if (l.anchorId) {
                        const el = document.getElementById(l.anchorId);
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                          history.replaceState(null, "", `#${l.anchorId}`);
                        }
                      }
                    }}
                    className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group"
                    style={{ color: TEXT_MUTED }}
                  >
                    {isAr ? l.ar : l.en}
                    <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
                  </Link>
                ) : (
                  <a key={l.href} href={l.href} className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group" style={{ color: TEXT_MUTED }}>
                    {isAr ? l.ar : l.en}
                    <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
                  </a>
                )
              ))}
              <Link to="/providers" className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group" style={{ color: TEXT_MUTED }}>
                {isAr ? "للمزوّدين" : "For Providers"}
                <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
              </Link>
              <div className="relative group">
                <button className="text-[13px] font-medium flex items-center gap-1 transition-all duration-200 hover:text-white" style={{ color: TEXT_MUTED }}>
                  {isAr ? "الخصوصية" : "Privacy"} <ChevronDownIcon size={12} />
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="rounded-xl py-2 min-w-[240px]" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                    <Link to="/privacy" className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
                    <Link to="/terms" className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "شروط الخدمة" : "Terms of Service"}</Link>
                    <Link to="/security" className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "الأمان والامتثال" : "Security & Compliance"}</Link>
                  </div>
                </div>
              </div>
              <LanguageSwitcher />
              <Link to="/auth" className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:scale-105" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </Link>
              <button onClick={goToNews} className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ background: GOLD, color: BG_DARK }}>
                {isAr ? "الأخبار والمقالات ←" : "News & Articles →"}
              </button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <LanguageSwitcher compact />
              <button onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
                {menuOpen ? <XIcon size={22} color={TEXT} /> : <MenuIcon size={22} color={TEXT} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden px-6 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              {navLinks.map((l) => (
                l.isRoute ? (
                  <Link key={l.href} to={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                    {isAr ? l.ar : l.en}
                  </Link>
                ) : (
                  <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                    {isAr ? l.ar : l.en}
                  </a>
                )
              ))}
              <Link to="/providers" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                {isAr ? "للمزوّدين" : "For Providers"}
              </Link>
              <p className="pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>{isAr ? "الخصوصية" : "Privacy"}</p>
              <Link to="/privacy" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
              <Link to="/terms" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "شروط الخدمة" : "Terms of Service"}</Link>
              <Link to="/security" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "الأمان والامتثال" : "Security & Compliance"}</Link>
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="block w-full py-3 rounded-full text-sm font-semibold mt-2 text-center" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </Link>
              <button onClick={() => { setMenuOpen(false); goToNews(); }} className="w-full py-3 rounded-full text-sm font-semibold mt-2" style={{ background: GOLD, color: BG_DARK }}>
                {isAr ? "الأخبار والمقالات" : "News & Articles →"}
              </button>
            </div>
          )}
        </nav>

        {/* HERO — desktop blurs hidden on mobile to slash paint cost */}
        <section className="lcp-hero relative overflow-hidden" style={{ background: BG_DARK }}>
          <div className="lcp-blur absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] hidden md:block" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />
          <div className="lcp-blur absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px] hidden md:block" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }} />
          <div className="absolute inset-0 opacity-[0.03] hidden md:block" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono mb-7" style={{ background: "rgba(197,150,90,0.08)", color: GOLD, border: `1px solid ${BORDER}` }}>
                <SparklesIcon size={11} />
                {mode === "en" && "AI MEDICAL COMPANION"}
                {mode === "ar" && <span dir="rtl" className="font-arabic">رُفَيِّق · رفيقك الطبي الذكي</span>}
                {isBoth && <>AI MEDICAL COMPANION · <span dir="rtl" className="font-arabic">رُفَيِّق</span></>}
              </div>

              <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-7 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
                {mode === "en" && (<>Bilingual AI Medical<br /><span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Companion</span></>)}
                {mode === "ar" && (<span dir="rtl" className="font-arabic">رفيقك الطبي الذكي<br /><span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>للسفر العلاجي</span></span>)}
                {isBoth && (<>Bilingual AI Medical<br /><span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Companion</span><span dir="rtl" className="font-arabic block text-3xl md:text-4xl mt-3" style={{ opacity: 0.85 }}>رفيقك الطبي الذكي للسفر العلاجي</span></>)}
              </h1>

              {mode !== "ar" && (
                <p className="text-base md:text-lg mb-2 leading-relaxed max-w-md" style={{ color: TEXT_MUTED }}>
                  The bilingual AI companion for Gulf patients and travellers worldwide seeking treatment away from home. Track tickets, medications &amp; appointments — and ask anything about your records.
                </p>
              )}
              {mode !== "en" && (
                <p className="font-arabic text-sm md:text-base mb-9 leading-relaxed max-w-md" dir="rtl" style={{ color: mode === "ar" ? TEXT_MUTED : "rgba(232,236,240,0.4)" }}>
                  رفيقك الذكي ثنائي اللغة لرحلتك العلاجية في الخارج. تابع التذاكر والأدوية والمواعيد، واسأل عن أي تفصيل في سجلاتك الطبية.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={goToApp} className="px-7 py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all hover:scale-[1.02]" style={{ background: GOLD, color: BG_DARK, boxShadow: `0 10px 40px ${GOLD}40` }}>
                  {ctaPrimaryLabel} <ArrowRightIcon size={15} />
                </button>
                <a href={ctaSecondaryLink} className="px-7 py-4 rounded-full font-semibold text-sm text-center transition-all hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)", color: TEXT, border: `1px solid ${BORDER}` }}>
                  {ctaSecondaryLabel}
                </a>
              </div>

              <div className="flex flex-wrap gap-5 mt-10">
                {trustPoints.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <t.Icon size={13} color={GOLD} />
                    <span className="text-[11px] font-mono tracking-wide" style={{ color: TEXT_MUTED }}>
                      {isAr ? <span className="font-arabic">{t.ar}</span> : t.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup — desktop only. Mobile users skip this paint entirely. */}
            <div className="relative hidden md:flex justify-center">
              <div className="relative w-[290px] h-[580px] rounded-[48px] overflow-hidden" style={{ background: "#000", boxShadow: `0 50px 100px rgba(0,0,0,0.6), 0 0 0 9px ${BG_DARK_2}, 0 0 0 11px ${GOLD}40, 0 0 60px ${TEAL}30` }}>
                <div className="absolute inset-2.5 rounded-[40px] p-5 flex flex-col" style={{ background: `linear-gradient(180deg, ${BG_DARK} 0%, #0F2530 30%, ${BG_DARK_2} 100%)` }}>
                  <div className="flex items-center justify-between mb-6">
                    <RufayQLogo size={26} variant="light" />
                    <span className="text-[10px] font-mono" style={{ color: TEXT_MUTED }}>9:41</span>
                  </div>
                  <p className="font-display text-2xl mb-1" style={{ color: TEXT, fontWeight: 300 }}>{isAr ? <span className="font-arabic">صباح الخير،</span> : "Good morning,"}</p>
                  <p className="text-sm mb-7" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">محمد</span> : "Mohammed"}</p>

                  <div className="space-y-2.5">
                    {[
                      { ic: "✈️", t: "Flight to Cleveland", tAr: "رحلة إلى كليفلاند", s: "in 2 days · 8:30 AM", sAr: "بعد يومين · 8:30 ص", accent: TEAL },
                      { ic: "💊", t: "Take Metformin", tAr: "تناول ميتفورمين", s: "Due now · 8:00 AM", sAr: "الآن · 8:00 ص", accent: GOLD },
                      { ic: "🏥", t: "Dr. Smith — Cardiology", tAr: "د. سميث — قلب", s: "Tomorrow · 11:00 AM", sAr: "غداً · 11:00 ص", accent: TEAL },
                      { ic: "📄", t: "Lab results ready", tAr: "نتائج التحاليل جاهزة", s: "Tap to view", sAr: "اضغط للعرض", accent: GOLD },
                    ].map((card, i) => (
                      <div key={i} className="rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${card.accent}20`, border: `1px solid ${card.accent}40` }}>{card.ic}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: TEXT }}>{isAr ? <span className="font-arabic">{card.tAr}</span> : card.t}</p>
                          <p className="text-[9px] truncate" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">{card.sAr}</span> : card.s}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Below-the-fold: features, how, testimonials, pricing, faq, cta, contact, footer */}
        <LazyOnView minHeight={1200} rootMargin="200px">
          <Suspense fallback={<div style={{ minHeight: 1200 }} />}>
            <LandingBelow goToApp={goToApp} theme={{ BG_DARK, BG_DARK_2, BORDER, TEXT, TEXT_MUTED, GOLD, GOLD_BRIGHT, TEAL }} />
          </Suspense>
        </LazyOnView>
      </div>
    </>
  );
};

export default Landing;
