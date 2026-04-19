import { Link, useNavigate } from "react-router-dom";
import { lazy, useState } from "react";
import LazyOnView from "@/components/LazyOnView";
import {
  ArrowRight, Check, Plane, Pill, FileText, Sparkles, Shield, Globe,
  Heart, MessageCircle, Star, ChevronDown, Menu, X, Lock, Zap,
} from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, BiText } from "@/contexts/LanguageContext";

// Lazy-load below-the-fold components — they only render when the user scrolls near them.
const ApprovedReviews = lazy(() => import("@/components/ApprovedReviews"));
const ReviewForm = lazy(() => import("@/components/ReviewForm"));

/**
 * Bilingual helper: render EN, AR, or both based on language mode.
 * - "both" mode: stacks EN above AR (block) or inline (separator)
 * - "en" or "ar": only that language
 */
const Bi = ({
  en, ar, className, arClassName, block,
}: { en: string; ar: string; className?: string; arClassName?: string; block?: boolean }) => {
  const { mode } = useLanguage();
  if (mode === "en") return <span className={className}>{en}</span>;
  if (mode === "ar") return <span dir="rtl" className={`font-arabic ${arClassName ?? className ?? ""}`}>{ar}</span>;
  // both
  if (block) {
    return (
      <span className={className}>
        <span className="block">{en}</span>
        <span dir="rtl" className={`font-arabic block mt-1 ${arClassName ?? ""}`} style={{ opacity: 0.85 }}>{ar}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      {en}
      <span style={{ opacity: 0.5 }}> · </span>
      <span dir="rtl" className={`font-arabic ${arClassName ?? ""}`}>{ar}</span>
    </span>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { mode } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    { icon: Plane, en: "Smart Journey", ar: "رحلة ذكية", descEn: "Track flights, hotels, and appointments — auto-built from a scan of your tickets.", descAr: "تتبّع الرحلات والفنادق والمواعيد — يُنشأ تلقائياً من مسح تذاكرك." },
    { icon: Pill, en: "Medication Tracker", ar: "تتبّع الأدوية", descEn: "Bilingual schedule with reminders, missed-dose tracking, and notes per medication.", descAr: "جدول ثنائي اللغة مع تذكير، وتتبّع الجرعات الفائتة، وملاحظات لكل دواء." },
    { icon: FileText, en: "Records Vault", ar: "خزانة الملفات الطبية", descEn: "Encrypted storage for prescriptions, labs, imaging, and discharge summaries.", descAr: "تخزين مشفّر للوصفات والتحاليل والأشعة وتقارير الخروج." },
    { icon: MessageCircle, en: "RufayQ AI Companion", ar: "رُفَيِّق الذكي", descEn: "Ask in Arabic or English about any medical document — instant bilingual answers.", descAr: "اسأل بالعربية أو الإنجليزية عن أي وثيقة طبية — إجابات فورية بكلتا اللغتين." },
    { icon: Sparkles, en: "Smart Scan", ar: "مسح ذكي", descEn: "AI extracts dosages, dates, and key info from prescriptions and reports.", descAr: "يستخلص الذكاء الاصطناعي الجرعات والتواريخ والمعلومات الأساسية من الوصفات والتقارير." },
    { icon: Heart, en: "Care Hub", ar: "مركز الرعاية", descEn: "Recovery checklists, vitals, exercises, and patient education for post-op care.", descAr: "قوائم التعافي والعلامات الحيوية والتمارين والتثقيف الصحي بعد العملية." },
  ];

  const trustPoints = [
    { icon: Lock, en: "End-to-end encrypted", ar: "تشفير كامل" },
    { icon: Globe, en: "Bilingual EN / AR", ar: "ثنائي اللغة عربي/إنجليزي" },
    { icon: Heart, en: "For Gulf & global patients", ar: "لمرضى الخليج والعالم" },
  ];

  const testimonials = [
    { name: "Abdullah Al-Shehri", nameAr: "عبدالله الشهري", role: "Spine surgery · Riyadh → Istanbul", roleAr: "جراحة العمود الفقري · الرياض → إسطنبول", text: "Travelled with my wife and two kids for treatment in Turkey. RufayQ kept all our flights, hospital appointments and medications in one place — bilingually. Game-changer for any Saudi family.", textAr: "سافرت مع زوجتي وطفليّ للعلاج في تركيا. رُفَيِّق جمع كل الرحلات والمواعيد والأدوية في مكان واحد — بلغتين. تجربة استثنائية لأي عائلة سعودية." },
    { name: "Maryam Al-Hajri", nameAr: "مريم الهاجري", role: "Oncology patient · Doha → Frankfurt", roleAr: "مريضة أورام · الدوحة → فرانكفورت", text: "Every German report was instantly explained in Arabic. My family back in Qatar could finally understand exactly what was happening.", textAr: "كل تقرير ألماني كان يُشرح فوراً بالعربية. أهلي في قطر فهموا أخيراً ما يحدث بدقة. تطبيق ممتاز." },
    { name: "Khalid Al-Mutairi", nameAr: "خالد المطيري", role: "Companion · Kuwait → Cleveland Clinic", roleAr: "مرافق · الكويت → كليفلاند كلينك", text: "I was caring for my father in the US. Smart Scan turned discharge papers into something we both understood. Worth every halala.", textAr: "كنت أرعى والدي في أمريكا. المسح الذكي حوّل أوراق الخروج إلى شيء فهمناه معاً. يستحق كل هللة." },
    { name: "Dr. Layla Al-Mansoori", nameAr: "د. ليلى المنصوري", role: "Family physician · Dubai", roleAr: "طبيبة أسرة · دبي", text: "I recommend RufayQ to my Emirati patients travelling abroad. The medication tracker and bilingual AI dramatically reduce confusion.", textAr: "أنصح مرضاي الإماراتيين المسافرين للعلاج باستخدام رُفَيِّق. تتبّع الأدوية والذكاء الاصطناعي ثنائي اللغة يقلّلان الارتباك بشكل كبير." },
    { name: "Sarah Johnson", nameAr: "سارة جونسون", role: "Cardiac patient · London → Riyadh", roleAr: "مريضة قلب · لندن → الرياض", text: "Came to Saudi for specialist treatment. The English↔Arabic AI translation made coordinating with the hospital effortless.", textAr: "جئت إلى السعودية لعلاج تخصصي. الترجمة الذكية بين الإنجليزية والعربية جعلت التنسيق مع المستشفى سهلاً." },
    { name: "Ahmed Al-Otaibi", nameAr: "أحمد العتيبي", role: "Orthopedic recovery · Jeddah → Munich", roleAr: "تعافٍ بعد جراحة عظام · جدة → ميونخ", text: "The Care Hub recovery checklist kept me on track post-surgery in Germany. Reminders saved me from missing two doses.", textAr: "قائمة التعافي في مركز الرعاية أبقتني منظّماً بعد عمليتي في ألمانيا. التذكيرات أنقذتني من نسيان جرعتين." },
  ];

  const faqs = [
    { qEn: "Is RufayQ a replacement for my doctor?", qAr: "هل يحلّ رُفَيِّق محلّ طبيبي؟", aEn: "No. RufayQ is an AI companion that helps you understand and organize your medical journey. It does not provide medical advice. Always consult your treating physician for medical decisions.", aAr: "لا. رُفَيِّق رفيق ذكي يساعدك على فهم وتنظيم رحلتك العلاجية، ولا يقدّم استشارة طبية. استشر طبيبك المعالج دائماً لأي قرار طبي." },
    { qEn: "How secure is my data?", qAr: "ما مدى أمان بياناتي؟", aEn: "All medical documents are encrypted end-to-end. Your data is stored in a secure cloud and is never shared with third parties without your consent.", aAr: "جميع الوثائق الطبية مشفّرة من طرف إلى طرف، وتُخزَّن في سحابة آمنة، ولا تُشارك مع أي طرف ثالث دون موافقتك." },
    { qEn: "Do I need an internet connection?", qAr: "هل أحتاج إلى اتصال بالإنترنت؟", aEn: "Yes for AI features and syncing. Your stored records and medication schedule are available offline once cached.", aAr: "نعم لميزات الذكاء الاصطناعي والمزامنة. أمّا سجلاتك وجدول أدويتك فمتاحة دون اتصال بعد التخزين المؤقت." },
    { qEn: "Can I share my records with my doctor or family?", qAr: "هل يمكنني مشاركة سجلاتي مع طبيبي أو عائلتي؟", aEn: "Yes. You can export bilingual PDF summaries or share specific documents via secure links.", aAr: "نعم. يمكنك تصدير ملخصات PDF ثنائية اللغة أو مشاركة وثائق محددة عبر روابط آمنة." },
    { qEn: "What languages are supported?", qAr: "ما اللغات المدعومة؟", aEn: "Arabic and English are fully supported across the entire app, including RufayQ AI responses, scans, and exports.", aAr: "العربية والإنجليزية مدعومتان بالكامل في كل أنحاء التطبيق، بما في ذلك ردود الذكاء الاصطناعي والمسح الضوئي والتصدير." },
  ];

  const goToApp = () => navigate("/app");

  // ELITE DARK THEME
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

  // Nav labels
  const navLinks: { en: string; ar: string; href: string }[] = [
    { en: "Features", ar: "المميزات", href: "#features" },
    { en: "How", ar: "كيف يعمل", href: "#how" },
    { en: "Pricing", ar: "الأسعار", href: "#pricing" },
    { en: "FAQ", ar: "الأسئلة", href: "#faq" },
    { en: "Contact", ar: "تواصل", href: "#contact" },
  ];

  return (
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
              <a key={l.href} href={l.href} className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group" style={{ color: TEXT_MUTED }}>
                {isAr ? l.ar : l.en}
                <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
              </a>
            ))}
            <Link to="/providers" className="text-[13px] font-medium relative transition-all duration-200 hover:text-white group" style={{ color: TEXT_MUTED }}>
              {isAr ? "للمزوّدين" : "For Providers"}
              <span aria-hidden className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ background: GOLD }} />
            </Link>
            <div className="relative group">
              <button className="text-[13px] font-medium flex items-center gap-1 transition-all duration-200 hover:text-white" style={{ color: TEXT_MUTED }}>
                {isAr ? "الخصوصية" : "Privacy"} <ChevronDown size={12} />
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
            <button onClick={goToApp} className="px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg" style={{ background: GOLD, color: BG_DARK }}>
              {isAr ? "افتح التطبيق ←" : "Open app →"}
            </button>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher compact />
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} color={TEXT} /> : <Menu size={22} color={TEXT} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                {isAr ? l.ar : l.en}
              </a>
            ))}
            <Link to="/providers" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium" style={{ color: TEXT_MUTED }}>
              {isAr ? "للمزوّدين" : "For Providers"}
            </Link>
            <p className="pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>{isAr ? "الخصوصية" : "Privacy"}</p>
            <Link to="/privacy" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
            <Link to="/terms" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "شروط الخدمة" : "Terms of Service"}</Link>
            <Link to="/security" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm pl-3" style={{ color: TEXT_MUTED }}>{isAr ? "الأمان والامتثال" : "Security & Compliance"}</Link>
            <button onClick={goToApp} className="w-full py-3 rounded-full text-sm font-semibold mt-2" style={{ background: GOLD, color: BG_DARK }}>
              {isAr ? "افتح التطبيق" : "Open app →"}
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="lcp-hero relative overflow-hidden" style={{ background: BG_DARK }}>
        <div className="lcp-blur absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] hidden md:block" style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 70%)` }} />
        <div className="lcp-blur absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-25 blur-[100px] hidden md:block" style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }} />
        <div className="absolute inset-0 opacity-[0.03] hidden md:block" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono mb-7" style={{ background: "rgba(197,150,90,0.08)", color: GOLD, border: `1px solid ${BORDER}` }}>
              <Sparkles size={11} />
              {mode === "en" && "AI MEDICAL COMPANION"}
              {mode === "ar" && <span dir="rtl" className="font-arabic">رُفَيِّق · رفيقك الطبي الذكي</span>}
              {isBoth && <>AI MEDICAL COMPANION · <span dir="rtl" className="font-arabic">رُفَيِّق</span></>}
            </div>

            {/* H1 — single, optimized for SEO */}
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
                {isAr ? "ابدأ مجاناً" : "Start free"} <ArrowRight size={15} />
              </button>
              <a href="#features" className="px-7 py-4 rounded-full font-semibold text-sm text-center transition-all hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)", color: TEXT, border: `1px solid ${BORDER}` }}>
                {isAr ? "كيف يعمل" : "See how it works"}
              </a>
            </div>

            <div className="flex flex-wrap gap-5 mt-10">
              {trustPoints.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <t.icon size={13} color={GOLD} />
                  <span className="text-[11px] font-mono tracking-wide" style={{ color: TEXT_MUTED }}>
                    {isAr ? <span className="font-arabic">{t.ar}</span> : t.en}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex justify-center">
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

      {/* FEATURES */}
      <section id="features" className="lazy-section py-24 px-6 relative" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>كل شيء في تطبيق واحد</span> : "EVERYTHING IN ONE APP"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {mode === "en" && (<>One companion for the <em style={{ color: GOLD }}>whole</em> journey</>)}
              {mode === "ar" && (<span dir="rtl" className="font-arabic">رفيق واحد <em style={{ color: GOLD }}>لكل</em> الرحلة</span>)}
              {isBoth && (<>One companion for the <em style={{ color: GOLD }}>whole</em> journey<span dir="rtl" className="font-arabic block text-2xl md:text-3xl mt-2" style={{ opacity: 0.85 }}>رفيق واحد لكل الرحلة</span></>)}
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_MUTED }}>
              {isAr ? <span className="font-arabic">من حجز رحلتك إلى التعافي في المنزل — رُفَيِّق ينظّم كل تفصيل ويشرحه.</span> : "From booking your flight to recovering at home — RufayQ keeps every detail organized and explained."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="group rounded-2xl p-7 transition-all hover:-translate-y-1 cursor-default" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110" style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30` }}>
                  <f.icon size={20} color={TEAL} />
                </div>
                {mode === "en" && <h3 className="font-display text-xl mb-3" style={{ color: TEXT }}>{f.en}</h3>}
                {mode === "ar" && <h3 className="font-display font-arabic text-xl mb-3" dir="rtl" style={{ color: TEXT }}>{f.ar}</h3>}
                {isBoth && (<>
                  <h3 className="font-display text-xl mb-1" style={{ color: TEXT }}>{f.en}</h3>
                  <p className="font-arabic text-xs mb-3" dir="rtl" style={{ color: GOLD }}>{f.ar}</p>
                </>)}
                <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                  {isAr ? <span className="font-arabic" dir="rtl">{f.descAr}</span> : f.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lazy-section py-24 px-6 relative" style={{ background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>كيف يعمل</span> : "HOW IT WORKS"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {isAr ? <span className="font-arabic">ثلاث خطوات نحو الوضوح</span> : "Three steps to clarity"}
            </h2>
          </div>

          <div className="space-y-5">
            {[
              { n: "01", t: "Scan or add your documents", tAr: "امسح أو أضف وثائقك", d: "Snap a photo of your flight ticket, prescription, lab result, or discharge summary. RufayQ extracts the key info automatically.", dAr: "التقط صورة لتذكرة الطيران، الوصفة، نتيجة التحليل، أو تقرير الخروج. يستخلص رُفَيِّق المعلومات الأساسية تلقائياً." },
              { n: "02", t: "RufayQ organizes everything", tAr: "رُفَيِّق ينظّم كل شيء", d: "Your trips, appointments, medications, and records appear in one timeline — translated to Arabic when needed.", dAr: "رحلاتك ومواعيدك وأدويتك وسجلاتك تظهر في خط زمني واحد — مترجمة إلى العربية عند الحاجة." },
              { n: "03", t: "Ask anything, anytime", tAr: "اسأل عن أي شيء، في أي وقت", d: "Tap any record and ask RufayQ. Get bilingual explanations, dosage clarifications, and red-flag alerts in seconds.", dAr: "اضغط على أي سجل واسأل رُفَيِّق. احصل على شروح ثنائية اللغة، توضيحات للجرعات، وتنبيهات للأعراض الخطرة في ثوانٍ." },
            ].map((s) => (
              <div key={s.n} className="flex gap-7 items-start p-7 rounded-2xl transition-all hover:bg-white/[0.02]" style={{ background: BG_DARK, border: `1px solid ${BORDER}` }}>
                <div className="font-display text-5xl shrink-0 leading-none tracking-tight" style={{ color: GOLD, fontWeight: 300 }}>{s.n}</div>
                <div>
                  <h3 className="font-display text-2xl mb-2 tracking-tight" style={{ color: TEXT, fontWeight: 400 }}>
                    {isAr ? <span className="font-arabic" dir="rtl">{s.tAr}</span> : s.t}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {isAr ? <span className="font-arabic" dir="rtl">{s.dAr}</span> : s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lazy-section py-24 px-6" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>موثوق به في الخليج وحول العالم</span> : "TRUSTED ACROSS THE GULF & BEYOND"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {mode === "en" && (<>Real stories from <em style={{ color: GOLD }}>real journeys</em></>)}
              {mode === "ar" && (<span dir="rtl" className="font-arabic">قصص حقيقية من <em style={{ color: GOLD }}>رحلات حقيقية</em></span>)}
              {isBoth && (<>Real stories from <em style={{ color: GOLD }}>real journeys</em></>)}
            </h2>
            <p className="text-sm mt-3" style={{ color: TEXT_MUTED }}>
              {isAr ? <span className="font-arabic">من الرياض إلى كليفلاند، ومن الدوحة إلى فرانكفورت، ومن دبي إلى إسطنبول.</span> : "From Riyadh to Cleveland, Doha to Frankfurt, Dubai to Istanbul."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-7" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} fill={GOLD} color={GOLD} />)}
                </div>
                <p className="text-sm leading-relaxed mb-5 italic" style={{ color: TEXT }}>
                  "{isAr ? <span className="font-arabic" dir="rtl">{t.textAr}</span> : t.text}"
                </p>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>
                    {isAr ? <span className="font-arabic">{t.nameAr}</span> : t.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                    {isAr ? <span className="font-arabic">{t.roleAr}</span> : t.role}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <LazyOnView minHeight={320} rootMargin="400px">
            <ApprovedReviews />
          </LazyOnView>

          <div className="max-w-2xl mx-auto mt-16">
            <div className="text-center mb-6">
              <p className="font-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: GOLD }}>
                {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>شاركنا تجربتك</span> : "SHARE YOUR EXPERIENCE"}
              </p>
              <h3 className="font-display text-2xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
                <Bi en="Help us improve" ar="ساعدنا في التحسين" />
              </h3>
            </div>
            <LazyOnView minHeight={280} rootMargin="400px">
              <ReviewForm variant="dark" />
            </LazyOnView>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lazy-section py-24 px-6 relative overflow-hidden" style={{ background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 50%, ${GOLD}15 0%, transparent 60%)` }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
            {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>أسعار بسيطة</span> : "SIMPLE PRICING"}
          </p>
          <h2 className="font-display text-4xl md:text-5xl mb-5 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            {mode === "en" && (<>Start free. <em style={{ color: GOLD }}>Upgrade</em> anytime.</>)}
            {mode === "ar" && (<span dir="rtl" className="font-arabic">ابدأ مجاناً. <em style={{ color: GOLD }}>طوّر</em> اشتراكك في أي وقت.</span>)}
            {isBoth && (<>Start free. <em style={{ color: GOLD }}>Upgrade</em> anytime.</>)}
          </h2>
          <p className="text-base mb-14" style={{ color: TEXT_MUTED }}>
            {isAr ? <span className="font-arabic">مجاني للأبد لرحلة واحدة. طوّر اشتراكك للحصول على رحلات غير محدودة، ذكاء اصطناعي، وإضافات حسب الاستخدام.</span> : "Free forever for one trip. Upgrade for unlimited journeys, AI, and pay-as-you-go add-ons."}
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              { name: "Basic", nameAr: "المجاني", price: "Free", priceAr: "مجاني", per: "", features: [["1 active trip", "رحلة واحدة"], ["Basic medication tracking", "تتبّع أدوية أساسي"], ["10 AI msgs/day", "10 رسائل ذكاء اصطناعي يومياً"], ["Community support", "دعم مجتمعي"]], cta: "Get started", ctaAr: "ابدأ" },
              { name: "Professional", nameAr: "الاحترافي", price: "$9.99", priceAr: "$9.99", per: "/mo", features: [["Unlimited trips", "رحلات غير محدودة"], ["Unlimited AI", "ذكاء اصطناعي غير محدود"], ["Smart reminders", "تذكيرات ذكية"], ["Priority support", "دعم بالأولوية"]], cta: "Start free trial", ctaAr: "ابدأ التجربة المجانية", popular: true },
              { name: "Enterprise", nameAr: "المؤسسات", price: "Custom", priceAr: "حسب الطلب", per: "", features: [["Multi-patient", "متعدد المرضى"], ["Hospital APIs", "واجهات للمستشفيات"], ["HIPAA compliance", "متوافق مع HIPAA"], ["Dedicated manager", "مدير حساب مخصص"]], cta: "Contact sales", ctaAr: "تواصل مع المبيعات" },
            ].map((p) => (
              <div key={p.name} className="rounded-2xl p-7 relative transition-all hover:-translate-y-1" style={{ background: p.popular ? `linear-gradient(160deg, ${BG_DARK} 0%, ${BG_DARK_2} 100%)` : BG_DARK, border: p.popular ? `1px solid ${GOLD}` : `1px solid ${BORDER}`, boxShadow: p.popular ? `0 20px 60px ${GOLD}20` : "none" }}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider" style={{ background: GOLD, color: BG_DARK }}>
                    {isAr ? <span className="font-arabic">الأكثر شعبية</span> : "POPULAR"}
                  </div>
                )}
                <p className="font-display text-xl mb-2" style={{ color: TEXT }}>
                  {isAr ? <span className="font-arabic">{p.nameAr}</span> : p.name}
                </p>
                <p className="font-display text-4xl mb-2" style={{ color: p.popular ? GOLD : TEXT, fontWeight: 300 }}>
                  {isAr ? p.priceAr : p.price}<span className="text-sm font-normal" style={{ color: TEXT_MUTED }}>{p.per}</span>
                </p>
                <div className="space-y-2.5 my-5">
                  {p.features.map(([en, ar], i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Check size={13} color={GOLD} className="shrink-0" />
                      <span className="text-sm" style={{ color: TEXT_MUTED }}>
                        {isAr ? <span className="font-arabic">{ar}</span> : en}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={goToApp} className="w-full py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02]" style={{ background: p.popular ? GOLD : "rgba(255,255,255,0.06)", color: p.popular ? BG_DARK : TEXT, border: p.popular ? "none" : `1px solid ${BORDER}` }}>
                  {isAr ? <span className="font-arabic">{p.ctaAr}</span> : p.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs" style={{ color: TEXT_MUTED }}>
            {isAr ? <span className="font-arabic">شاهد المقارنة الكاملة للمميزات والإضافات داخل التطبيق.</span> : "See full feature comparison and pay-as-you-go add-ons inside the app."}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lazy-section py-24 px-6" style={{ background: BG_DARK }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>الأسئلة الشائعة</span> : "FAQ"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {isAr ? <span className="font-arabic">أسئلة شائعة</span> : "Common questions"}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left rounded-xl p-5 transition-all" style={{ background: BG_DARK_2, border: `1px solid ${openFaq === i ? GOLD : BORDER}` }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold" style={{ color: TEXT }}>
                    {isAr ? <span className="font-arabic" dir="rtl">{f.qAr}</span> : f.qEn}
                  </span>
                  <ChevronDown size={16} color={GOLD} className="shrink-0 transition-transform" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                    {isAr ? <span className="font-arabic" dir="rtl">{f.aAr}</span> : f.aEn}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center relative overflow-hidden" style={{ background: BG_DARK_2 }}>
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 0%, ${TEAL}20 0%, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto">
          <Sparkles size={28} color={GOLD} className="mx-auto mb-5" />
          <h2 className="font-display text-4xl md:text-5xl mb-5 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            {mode === "en" && (<>Travel for treatment with <em style={{ color: GOLD }}>confidence</em>.</>)}
            {mode === "ar" && (<span dir="rtl" className="font-arabic">سافر للعلاج <em style={{ color: GOLD }}>بثقة</em>.</span>)}
            {isBoth && (<>Travel for treatment with <em style={{ color: GOLD }}>confidence</em>.</>)}
          </h2>
          <p className="text-base mb-9" style={{ color: TEXT_MUTED }}>
            {isAr ? <span className="font-arabic">انضم إلى آلاف المرضى في الخليج والعالم الذين يستخدمون رُفَيِّق ليجعل رحلتهم العلاجية أبسط وأكثر أماناً ووضوحاً.</span> : "Join thousands of patients across the Gulf and the world using RufayQ to make their medical journey simpler, safer, and clearer."}
          </p>
          <button onClick={goToApp} className="px-9 py-4 rounded-full font-semibold text-sm inline-flex items-center gap-2 btn-press transition-all hover:scale-105" style={{ background: GOLD, color: BG_DARK, boxShadow: `0 15px 50px ${GOLD}40` }}>
            {isAr ? "افتح رُفَيِّق" : "Open RufayQ"} <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-6" style={{ background: BG_DARK, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
            {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>تواصل معنا</span> : "CONTACT US"}
          </p>
          <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            {mode === "en" && (<>We're here to <em style={{ color: GOLD }}>help</em>.</>)}
            {mode === "ar" && (<span dir="rtl" className="font-arabic">نحن هنا <em style={{ color: GOLD }}>للمساعدة</em>.</span>)}
            {isBoth && (<>We're here to <em style={{ color: GOLD }}>help</em>.</>)}
          </h2>
          <p className="text-sm mb-10" style={{ color: TEXT_MUTED }}>
            {isAr ? <span className="font-arabic">رد خلال 24 ساعة · واتساب للدعم العاجل</span> : "Reply within 24 hours · WhatsApp for urgent support"}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "📧", label: "Email", labelAr: "البريد", value: "support [at] rufayq.com", sub: "Replies within 24 hours", subAr: "رد خلال 24 ساعة", href: "mailto:support@rufayq.com?subject=RufayQ%20Support" },
              { emoji: "💬", label: "WhatsApp · Fast support", labelAr: "واتساب · دعم سريع", value: "+966 56 959 0418", sub: "Live chat · 8AM–10PM AST", subAr: "محادثة مباشرة · 8ص–10م", href: "https://wa.me/966569590418?text=Hello%20RufayQ%20%E2%80%94%20I%20need%20help%20with%3A" },
              { emoji: "📞", label: "Mobile", labelAr: "الجوال", value: "+966 56 959 0418", sub: "Direct line for urgent cases", subAr: "خط مباشر للحالات العاجلة", href: "tel:+966569590418" },
            ].map((c) => (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="rounded-2xl p-6 transition-all hover:-translate-y-1 block text-left" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="text-3xl mb-3">{c.emoji}</div>
                <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: TEXT_MUTED }}>
                  {(isAr ? c.labelAr : c.label).toUpperCase()}
                </p>
                <p className="text-sm font-semibold mb-1" style={{ color: GOLD }}>{c.value}</p>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {isAr ? <span className="font-arabic">{c.subAr}</span> : c.sub}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ background: BG_DARK, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <RufayQLogo size={26} variant="light" />
            <span className="font-display text-lg">
              <span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span>
            </span>
          </div>
          <p className="text-xs text-center" style={{ color: TEXT_MUTED }}>
            © 2026 RufayQ · {isAr ? <span className="font-arabic">جميع الحقوق محفوظة</span> : "All rights reserved"}<br />
            <span className="text-[10px]">{isAr ? <span className="font-arabic">متوافق مع نظام حماية البيانات السعودي والإماراتي · DHA · HIPAA · GDPR</span> : "Compliant with KSA PDPL · UAE PDPL · DHA · HIPAA · GDPR"}</span>
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">الخصوصية</span> : "Privacy"}</Link>
            <Link to="/terms" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">الشروط</span> : "Terms"}</Link>
            <a href="#contact" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">تواصل</span> : "Contact"}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
