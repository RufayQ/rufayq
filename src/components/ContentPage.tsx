import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import RufayQLogo from "@/components/RufayQLogo";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Bilingual long-form content scaffold for cornerstone SEO pages.
 * Renders EN / AR / both based on language switcher mode.
 */
interface Section {
  id: string;
  h2En: string;
  h2Ar: string;
  bodyEn: ReactNode;
  bodyAr: ReactNode;
}

interface ContentPageProps {
  eyebrowEn: string;
  eyebrowAr: string;
  titleEn: string;
  titleAr: string;
  leadEn: string;
  leadAr: string;
  sections: Section[];
  ctaTo?: string;
  ctaLabelEn?: string;
  ctaLabelAr?: string;
}

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.65)", GOLD = "#C5965A";

const ContentPage = ({
  eyebrowEn, eyebrowAr, titleEn, titleAr, leadEn, leadAr, sections,
  ctaTo = "/app", ctaLabelEn = "Get RufayQ free", ctaLabelAr = "ابدأ مع رُفَيِّق مجاناً",
}: ContentPageProps) => {
  const { mode } = useLanguage();
  const showEn = mode !== "ar";
  const showAr = mode !== "en";
  const both = mode === "both";

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      {/* Top nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <ArrowLeft size={16} color={TEXT} />
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg">
              <span style={{ color: TEXT }}>Rufay</span>
              <span className="font-bold" style={{ color: GOLD }}>Q</span>
            </span>
          </Link>
          <Link to={ctaTo} className="text-xs font-semibold px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{ background: GOLD, color: "#06101A" }}>
            {showEn ? ctaLabelEn : ctaLabelAr}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
          {showEn && eyebrowEn}{both && " · "}{showAr && <span dir="rtl" className="font-arabic">{eyebrowAr}</span>}
        </p>
        {showEn && (
          <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-4" style={{ fontWeight: 300, lineHeight: 1.1 }}>
            {titleEn}
          </h1>
        )}
        {showAr && (
          <h1 dir="rtl" className="font-arabic text-3xl md:text-5xl mb-4" style={{ color: GOLD, fontWeight: 600, lineHeight: 1.3 }}>
            {titleAr}
          </h1>
        )}
        {showEn && <p className="text-lg md:text-xl mb-2" style={{ color: MUTED, maxWidth: 720 }}>{leadEn}</p>}
        {showAr && <p dir="rtl" className="font-arabic text-lg md:text-xl" style={{ color: MUTED, maxWidth: 720 }}>{leadAr}</p>}
      </header>

      {/* Sections */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="mb-14 scroll-mt-24">
            <div className="flex items-baseline gap-3 mb-5">
              <span className="font-mono text-xs" style={{ color: GOLD }}>{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1">
                {showEn && <h2 className="font-display text-2xl md:text-3xl mb-1" style={{ fontWeight: 400 }}>{s.h2En}</h2>}
                {showAr && <h2 dir="rtl" className="font-arabic text-xl md:text-2xl" style={{ color: GOLD }}>{s.h2Ar}</h2>}
              </div>
            </div>
            <div className={both ? "grid md:grid-cols-2 gap-6" : ""}>
              {showEn && (
                <article
                  className="rounded-2xl p-6 md:p-7 leading-relaxed text-[15px] md:text-base"
                  style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  {s.bodyEn}
                </article>
              )}
              {showAr && (
                <article
                  dir="rtl"
                  className="rounded-2xl p-6 md:p-7 leading-loose font-arabic text-[15px] md:text-base"
                  style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  {s.bodyAr}
                </article>
              )}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="mt-16 rounded-3xl p-8 md:p-12 text-center" style={{ background: `linear-gradient(135deg, ${GOLD}22, ${BG2})`, border: `1px solid ${BORDER}` }}>
          {showEn && <h3 className="font-display text-2xl md:text-3xl mb-3" style={{ fontWeight: 400 }}>Ready to plan your treatment with confidence?</h3>}
          {showAr && <h3 dir="rtl" className="font-arabic text-xl md:text-2xl mb-3" style={{ color: GOLD }}>جاهز للتخطيط لعلاجك بثقة؟</h3>}
          {showEn && <p className="mb-6" style={{ color: MUTED }}>Free to start. Bilingual from day one. Built for Gulf patients.</p>}
          {showAr && <p dir="rtl" className="font-arabic mb-6" style={{ color: MUTED }}>مجاني للبدء. ثنائي اللغة من اليوم الأول. مصمم لمرضى الخليج.</p>}
          <Link to={ctaTo} className="inline-block px-8 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
            style={{ background: GOLD, color: "#06101A" }}>
            {showEn ? ctaLabelEn : ctaLabelAr}
          </Link>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: BORDER, color: MUTED }}>
        © 2026 RufayQ · <Link to="/privacy" style={{ color: GOLD }}>Privacy</Link> · <Link to="/terms" style={{ color: GOLD }}>Terms</Link>
      </footer>
    </div>
  );
};

export default ContentPage;
