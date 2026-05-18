import { Link, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import LazyOnView from "@/components/LazyOnView";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCmsPage } from "@/hooks/useCmsPage";
import { useGreeting } from "@/hooks/useGreeting";
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

/** Icon lookup for CMS-driven trust badges. Falls back to a hairline dot. */
const BADGE_ICONS: Record<string, typeof LockIcon> = {
  lock: LockIcon,
  shield: LockIcon,
  globe: GlobeIcon,
  heart: HeartIcon,
  sparkles: SparklesIcon,
};

/** Locale-aware greeting derived from the visitor's local hour. */
function getGreeting(): { en: string; ar: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12)  return { en: "Good morning",   ar: "صباح الخير" };
  if (h >= 12 && h < 17) return { en: "Good afternoon", ar: "طاب يومك" };
  if (h >= 17 && h < 22) return { en: "Good evening",   ar: "مساء الخير" };
  return { en: "Good evening", ar: "مساء الخير" };
}

/**
 * Below-the-fold sections (Features → Footer) live in their own chunk.
 * The hero paints first using only inline SVG + tiny providers, so the
 * 47 kB lucide chunk + 17 kB helmet chunk never enter the critical path.
 */
const LandingBelow = lazy(() => import("./LandingBelow"));
const InstallAppPrompt = lazy(() => import("@/components/InstallAppPrompt"));

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Honor incoming hash (e.g. #faq) by smooth-scrolling once the lazy section mounts.
  // LandingBelow is lazy, so poll briefly until the section mounts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    let attempts = 0;
    const tick = () => {
      const el = document.getElementById(hash);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (attempts++ < 30) setTimeout(tick, 120);
    };
    tick();
  }, []);

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
  const routeIsAr = location.pathname === "/ar" || location.pathname.startsWith("/ar/");

  // ── CMS overrides — full hero is now admin-editable per locale ──────
  // Hardcoded defaults below remain as fallback when CMS is empty / loading.
  const { getSection } = useCmsPage("home");
  type HeroCms = {
    eyebrow?: string;
    titleLine1?: string;
    titleLine2?: string;
    highlight?: string;
    subtitle?: string;
    primaryCta?: { label?: string; link?: string };
    secondaryCta?: { label?: string; link?: string };
    badges?: { text: string; icon?: string }[];
    mockupCards?: { icon?: string; title: string; subtitle?: string; accent?: "gold" | "teal" }[];
  };
  const heroEn = getSection<HeroCms>("hero", "en");
  const heroAr = getSection<HeroCms>("hero", "ar");
  const heroPrimary = isAr ? heroAr : heroEn;

  // ── Elite bilingual defaults (rebrand-aligned: medical, travel & more) ──
  const D = {
    eyebrowEn: "AI COMPANION · MEDICAL, TRAVEL & MORE",
    eyebrowAr: "رُفَيِّق · للسفر العلاجي وأكثر",
    title1En: "Your AI Travel Companion",
    title1Ar: "رفيقك الذكي للسفر",
    highlightEn: "& More",
    highlightAr: "وأكثر",
    subtitleEn: "From medical journeys to lifestyle, RufayQ guides Gulf travellers worldwide — bilingual vault, journey, tickets, medications and 24/7 AI support.",
    subtitleAr: "من الرحلات العلاجية إلى أسلوب الحياة، يرافقك رُفَيِّق حول العالم — خزانة طبية ثنائية اللغة، رحلات، تذاكر، أدوية ودعم ذكي على مدار الساعة.",
    primaryEn: "Start free",
    primaryAr: "ابدأ مجاناً",
    secondaryEn: "Explore pricing",
    secondaryAr: "استعرض الأسعار",
  };

  const eyebrowEn = heroEn?.eyebrow || D.eyebrowEn;
  const eyebrowAr = heroAr?.eyebrow || D.eyebrowAr;
  const title1En  = heroEn?.titleLine1 || D.title1En;
  const title1Ar  = heroAr?.titleLine1 || D.title1Ar;
  const highEn    = heroEn?.highlight || D.highlightEn;
  const highAr    = heroAr?.highlight || D.highlightAr;
  const subEn     = heroEn?.subtitle || D.subtitleEn;
  const subAr     = heroAr?.subtitle || D.subtitleAr;
  const primaryLabel   = heroPrimary?.primaryCta?.label   || (isAr ? D.primaryAr   : D.primaryEn);
  const primaryLink    = heroPrimary?.primaryCta?.link    || "/auth";

  // ── Mobile mockup cards (CMS-driven, EN + AR parity) ───────────────
  type MockCard = { icon?: string; title: string; subtitle?: string; accent?: "gold" | "teal" };
  const defaultMockEn: MockCard[] = [
    { icon: "🛫", title: "Business · LH 770 → Frankfurt", subtitle: "Boarding 22:40 · Gate A22", accent: "teal" },
    { icon: "🛋️", title: "Lounge ready · Visa Companion", subtitle: "DXB · Concourse B", accent: "gold" },
    { icon: "🩺", title: "Prof. Klein — Cleveland Clinic", subtitle: "Tomorrow · 11:00 AM", accent: "teal" },
    { icon: "🚘", title: "Chauffeur to The Ritz-Carlton", subtitle: "On arrival · 06:20", accent: "gold" },
  ];
  const defaultMockAr: MockCard[] = [
    { icon: "🛫", title: "أعمال · LH 770 → فرانكفورت", subtitle: "الصعود 22:40 · بوابة A22", accent: "teal" },
    { icon: "🛋️", title: "الصالة جاهزة · رفيق فيزا", subtitle: "دبي · مبنى B", accent: "gold" },
    { icon: "🩺", title: "البروفيسور كلاين — كليفلاند", subtitle: "غداً · 11:00 ص", accent: "teal" },
    { icon: "🚘", title: "سائق خاص إلى ريتز كارلتون", subtitle: "عند الوصول · 06:20", accent: "gold" },
  ];
  const mockEn: MockCard[] = (heroEn?.mockupCards as MockCard[] | undefined)?.length
    ? (heroEn!.mockupCards as MockCard[]) : defaultMockEn;
  const mockAr: MockCard[] = (heroAr?.mockupCards as MockCard[] | undefined)?.length
    ? (heroAr!.mockupCards as MockCard[]) : defaultMockAr;

  // ── Dynamic, locale-aware greeting (visitor's local time) ───────────
  // Recomputes on mount, every 60s, on tab focus, on visibility change, and
  // on the next exact hour boundary so transitions (e.g. 11:59 → 12:00) are
  // instant rather than up to a minute late.
  const [greeting, setGreeting] = useState<{ en: string; ar: string }>(() => getGreeting());
  useEffect(() => {
    const recompute = () => setGreeting(getGreeting());
    recompute();
    const interval = window.setInterval(recompute, 60_000);
    const now = new Date();
    const msToNextHour =
      (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
    const hourTimeout = window.setTimeout(recompute, Math.max(msToNextHour, 1000));
    const onVisible = () => { if (document.visibilityState === "visible") recompute(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recompute);
    return () => {
      clearInterval(interval);
      clearTimeout(hourTimeout);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recompute);
    };
  }, []);

  const defaultTrust = [
    { icon: "lock",     en: "End-to-end encrypted",       ar: "تشفير كامل" },
    { icon: "globe",    en: "Bilingual EN / AR",          ar: "ثنائي اللغة عربي/إنجليزي" },
    { icon: "heart",    en: "For Gulf & global patients", ar: "لمرضى الخليج والعالم" },
  ];
  const cmsBadges = (isAr ? heroAr : heroEn)?.badges ?? [];
  const trustPoints = cmsBadges.length > 0
    ? cmsBadges.map((b) => ({
        Icon: (b.icon && BADGE_ICONS[b.icon.toLowerCase()]) || LockIcon,
        en: b.text, ar: b.text,
      }))
    : defaultTrust.map((d) => ({ Icon: BADGE_ICONS[d.icon], en: d.en, ar: d.ar }));

  const navLinks: { en: string; ar: string; href: string; isRoute?: boolean; anchorId?: string }[] = [
    { en: "Features", ar: "المميزات", href: "#features" },
    { en: "How", ar: "كيف يعمل", href: "#how" },
    { en: "Pricing", ar: "الأسعار", href: "#pricing" },
    { en: "FAQ", ar: "الأسئلة", href: "#faq" },
    { en: "Contact", ar: "تواصل", href: "#contact" },
  ];

  // Localize internal route links so visitors on /ar/* stay on /ar/*.
  const lp = (en: string) => (routeIsAr ? `/ar${en}` : en);
  // Public CTA on landing — unauthenticated visitors should land on the
  // /auth chooser, not be dumped onto raw /app. The AppAuthGuard would
  // bounce them anyway; routing through /auth keeps the UX consistent.
  const goToApp = () => navigate(lp("/auth"));
  // The prominent gold CTA in the nav routes to the dedicated News & Articles
  // page (admin-managed via the Site Pages → landing-news slug). The hero
  // "Start free" button still routes to the app.
  const goToNews = () => navigate(routeIsAr ? "/ar/news" : "/news");

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
                    to={lp(l.href)}
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
              <Link to={lp("/providers")} className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group" style={{ color: TEXT_MUTED }}>
                {isAr ? "للمزوّدين" : "For Providers"}
                <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
              </Link>
              <div className="relative group">
                <button className="text-[13px] font-medium flex items-center gap-1 transition-all duration-200 hover:text-white" style={{ color: TEXT_MUTED }}>
                  {isAr ? "الخصوصية" : "Privacy"} <ChevronDownIcon size={12} />
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="rounded-xl py-2 min-w-[240px]" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                    <Link to={lp("/privacy")} className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
                    <Link to={lp("/terms")} className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "شروط الخدمة" : "Terms of Service"}</Link>
                    <Link to={lp("/security")} className="block px-4 py-2 text-[13px] hover:bg-white/5" style={{ color: TEXT }}>{isAr ? "الأمان والامتثال" : "Security & Compliance"}</Link>
                  </div>
                </div>
              </div>
              <LanguageSwitcher />
              <Link to={lp("/auth")} className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:scale-105" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
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
                  <Link key={l.href} to={lp(l.href)} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                    {isAr ? l.ar : l.en}
                  </Link>
                ) : (
                  <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                    {isAr ? l.ar : l.en}
                  </a>
                )
              ))}
              <Link to={lp("/providers")} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                {isAr ? "للمزوّدين" : "For Providers"}
              </Link>
              <p className="pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>{isAr ? "الخصوصية" : "Privacy"}</p>
              <Link to={lp("/privacy")} onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
              <Link to={lp("/terms")} onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "شروط الخدمة" : "Terms of Service"}</Link>
              <Link to={lp("/security")} onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "الأمان والامتثال" : "Security & Compliance"}</Link>
              <Link to={lp("/auth")} onClick={() => setMenuOpen(false)} className="block w-full py-3 rounded-full text-sm font-semibold mt-2 text-center" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </Link>
              <button onClick={() => { setMenuOpen(false); goToNews(); }} className="w-full py-3 rounded-full text-sm font-semibold mt-2" style={{ background: GOLD, color: BG_DARK }}>
                {isAr ? "الأخبار والمقالات" : "News & Articles →"}
              </button>
            </div>
          )}
        </nav>

        <main>
        {/* HERO — desktop blurs hidden on mobile to slash paint cost */}
        <section className="lcp-hero relative overflow-hidden" style={{ background: BG_DARK }}>
          <div className="lcp-blur absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] hidden md:block" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />
          <div className="lcp-blur absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px] hidden md:block" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }} />
          <div className="absolute inset-0 opacity-[0.03] hidden md:block" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
            <div>
              {/* Eyebrow — hairline-flanked, bilingual aware */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[10px] font-mono mb-7" style={{ background: "rgba(197,150,90,0.08)", color: GOLD, border: `1px solid ${BORDER}` }}>
                <SparklesIcon size={11} />
                <span className="inline-block w-3 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} aria-hidden />
                {mode === "en" && <span className="tracking-[0.18em]">{eyebrowEn}</span>}
                {mode === "ar" && <span dir="rtl" className="font-arabic tracking-wide">{eyebrowAr}</span>}
                {isBoth && (
                  <>
                    <span className="tracking-[0.18em]">{eyebrowEn.split("·")[0]?.trim() || "AI COMPANION"}</span>
                    <span className="opacity-50" aria-hidden>·</span>
                    <span dir="rtl" className="font-arabic">رُفَيِّق</span>
                  </>
                )}
                <span className="inline-block w-3 h-px" style={{ background: `linear-gradient(270deg, transparent, ${GOLD})` }} aria-hidden />
              </div>

              {/* Headline — display serif, gradient highlight, optional bilingual companion line.
                  Arabic Naskh prefers looser leading and no negative tracking. */}
              <h1
                className={`font-display text-5xl md:text-7xl mb-7 ${isAr ? "leading-[1.18]" : "leading-[1.04] tracking-tight"}`}
                style={{ color: TEXT, fontWeight: 300 }}
              >
                {mode === "en" && (
                  <>
                    {title1En}<br />
                    <span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{highEn}</span>
                  </>
                )}
                {mode === "ar" && (
                  <span dir="rtl" className="font-arabic block" style={{ letterSpacing: 0 }}>
                    {title1Ar}<br />
                    <span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{highAr}</span>
                  </span>
                )}
                {isBoth && (
                  <>
                    {title1En}<br />
                    <span style={{ background: `linear-gradient(120deg, ${GOLD} 0%, ${GOLD_BRIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{highEn}</span>
                    <span dir="rtl" className="font-arabic block text-3xl md:text-4xl mt-4 leading-[1.5]" style={{ opacity: 0.85, letterSpacing: 0 }}>
                      {title1Ar} <span style={{ color: GOLD_BRIGHT }}>{highAr}</span>
                    </span>
                  </>
                )}
              </h1>

              {/* Gold hairline accent */}
              <div className={`h-px w-16 mb-6 ${isAr ? "ml-auto" : ""}`} style={{ background: `linear-gradient(${isAr ? "270deg" : "90deg"}, ${GOLD}, transparent)` }} aria-hidden />

              {mode !== "ar" && (
                <p className="text-base md:text-lg mb-2 leading-relaxed max-w-md" style={{ color: TEXT_MUTED }}>{subEn}</p>
              )}
              {mode !== "en" && (
                <p
                  className="font-arabic text-[15px] md:text-base mb-9 max-w-md"
                  dir="rtl"
                  style={{ color: mode === "ar" ? TEXT_MUTED : "rgba(232,236,240,0.4)", lineHeight: 1.85, letterSpacing: 0 }}
                >{subAr}</p>
              )}

              {/* Primary CTA — single, decisive */}
              <div className="flex mt-4" style={{ minHeight: 56 }}>
                <button onClick={() => navigate(lp(primaryLink))} className="px-7 py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all hover:scale-[1.02] w-full sm:w-auto" style={{ background: GOLD, color: BG_DARK, boxShadow: `0 10px 40px ${GOLD}40` }}>
                  {primaryLabel} <ArrowRightIcon size={15} />
                </button>
              </div>

              {/* Trust badges — refined row with hairline separators (RTL-aware) */}
              <div className={`flex flex-wrap items-center gap-y-3 mt-10 ${isAr ? "flex-row-reverse gap-x-6 justify-end" : "gap-x-5"}`} style={{ minHeight: 18 }}>
                {trustPoints.map((t, i) => (
                  <div key={i} className={`flex items-center gap-2 ${isAr ? "flex-row-reverse" : ""}`}>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "rgba(197,150,90,0.10)", border: `1px solid ${GOLD}33` }}>
                      <t.Icon size={11} color={GOLD} />
                    </span>
                    <span className={`text-[11px] ${isAr ? "font-arabic" : "font-mono tracking-wide"}`} style={{ color: TEXT_MUTED }}>
                      {isAr ? t.ar : t.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup — desktop only. Mobile users skip this paint entirely. */}
            <div className="relative hidden md:flex justify-center">
              <div className="relative w-[290px] h-[580px] rounded-[48px] overflow-hidden" style={{ background: "#000", boxShadow: `0 50px 100px rgba(0,0,0,0.6), 0 0 0 9px ${BG_DARK_2}, 0 0 0 11px ${GOLD}40, 0 0 60px ${TEAL}30` }}>
                <div className="absolute inset-2.5 rounded-[40px] p-5 flex flex-col" style={{ background: `linear-gradient(180deg, ${BG_DARK} 0%, #0F2530 30%, ${BG_DARK_2} 100%)` }} dir={isAr ? "rtl" : "ltr"}>
                  <div className="flex items-center justify-between mb-6">
                    <RufayQLogo size={26} variant="light" />
                    <span className="text-[10px] font-mono" style={{ color: TEXT_MUTED }}>9:41</span>
                  </div>
                  {isAr ? (
                    <p className="font-arabic font-display text-[26px] mb-1 leading-snug" style={{ color: TEXT, fontWeight: 400, letterSpacing: 0 }}>
                      {greeting.ar}،
                    </p>
                  ) : (
                    <p className="font-display text-2xl mb-1" style={{ color: TEXT, fontWeight: 300 }}>
                      {greeting.en},
                    </p>
                  )}
                  <p className={`text-sm mb-7 ${isAr ? "font-arabic" : ""}`} style={{ color: TEXT_MUTED }}>{isAr ? "محمد" : "Mohammed"}</p>

                  <div className="space-y-2.5">
                    {mockEn.map((cardEn, i) => {
                      const cardAr = mockAr[i] ?? cardEn;
                      const card = isAr ? cardAr : cardEn;
                      const accentColor = card.accent === "gold" ? GOLD : TEAL;
                      return (
                        <div key={i} className={`rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm ${isAr ? "flex-row-reverse" : ""}`} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}>{card.icon}</div>
                          <div className={`flex-1 min-w-0 ${isAr ? "text-right" : ""}`}>
                            <p className={`text-[11px] font-semibold truncate ${isAr ? "font-arabic" : ""}`} style={{ color: TEXT }}>{card.title}</p>
                            {card.subtitle && (
                              <p className={`text-[9px] truncate ${isAr ? "font-arabic" : ""}`} style={{ color: TEXT_MUTED }}>{card.subtitle}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
        </main>
        <Suspense fallback={null}>
          <InstallAppPrompt isAr={isAr} />
        </Suspense>
      </div>
    </>
  );
};

export default Landing;
