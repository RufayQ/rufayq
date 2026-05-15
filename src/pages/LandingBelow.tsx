import { Link } from "react-router-dom";
import { lazy, useState } from "react";
import {
  PlaneIcon as Plane, PillIcon as Pill, FileTextIcon as FileText,
  SparklesIcon as Sparkles, HeartIcon as Heart, MessageCircleIcon as MessageCircle,
  StarIcon as Star, ChevronDownIcon as ChevronDown, CheckIcon as Check,
} from "@/components/HeroIcons";
import LazyOnView from "@/components/LazyOnView";
import RufayQLogo from "@/components/RufayQLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLandingSections } from "@/hooks/useLandingSections";

// Lazy-load social-proof + form components (each is its own chunk)
const ApprovedReviews = lazy(() => import("@/components/ApprovedReviews"));
const ReviewForm = lazy(() => import("@/components/ReviewForm"));

interface Props {
  goToApp: () => void;
  /** Theme tokens passed in from Landing so we don't duplicate constants. */
  theme: {
    BG_DARK: string;
    BG_DARK_2: string;
    BORDER: string;
    TEXT: string;
    TEXT_MUTED: string;
    GOLD: string;
    GOLD_BRIGHT: string;
    TEAL: string;
  };
}

/**
 * Below-the-fold sections of the Landing page: Features, How it works,
 * Testimonials, Pricing, FAQ, Final CTA, Contact, Footer.
 * Loaded lazily after the hero paints — keeps initial JS small for mobile FCP/LCP.
 */
const LandingBelow = ({ goToApp, theme }: Props) => {
  const { mode } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const isAr = mode === "ar";
  const isBoth = mode === "both";
  const { BG_DARK, BG_DARK_2, BORDER, TEXT, TEXT_MUTED, GOLD, TEAL } = theme;

  // Admin-editable text overlay (Site Pages → "Landing Sections"). Falls back
  // to the hardcoded defaults below when a field is left blank in the editor,
  // so layout / fonts / colors / icons remain code-controlled.
  const sections = useLandingSections();
  const sec = (key: "features" | "how" | "pricing" | "faq" | "contact" | "providers") =>
    isAr ? sections.ar[key] : sections.en[key];

  const features = [
    { icon: Plane, en: "Smart Journey", ar: "رحلة ذكية", descEn: "Track flights, hotels, and appointments — auto-built from a scan of your tickets.", descAr: "تتبّع الرحلات والفنادق والمواعيد — يُنشأ تلقائياً من مسح تذاكرك." },
    { icon: Pill, en: "Medication Tracker", ar: "تتبّع الأدوية", descEn: "Bilingual schedule with reminders, missed-dose tracking, and notes per medication.", descAr: "جدول ثنائي اللغة مع تذكير، وتتبّع الجرعات الفائتة، وملاحظات لكل دواء." },
    { icon: FileText, en: "Records Vault", ar: "خزانة الملفات الطبية", descEn: "Encrypted storage for prescriptions, labs, imaging, and discharge summaries.", descAr: "تخزين مشفّر للوصفات والتحاليل والأشعة وتقارير الخروج." },
    { icon: MessageCircle, en: "RufayQ AI Companion", ar: "رُفَيِّق الذكي", descEn: "Ask in Arabic or English about any medical document — instant bilingual answers.", descAr: "اسأل بالعربية أو الإنجليزية عن أي وثيقة طبية — إجابات فورية بكلتا اللغتين." },
    { icon: Sparkles, en: "Smart Scan", ar: "مسح ذكي", descEn: "AI extracts dosages, dates, and key info from prescriptions and reports.", descAr: "يستخلص الذكاء الاصطناعي الجرعات والتواريخ والمعلومات الأساسية من الوصفات والتقارير." },
    { icon: Heart, en: "Care Hub", ar: "مركز الرعاية", descEn: "Recovery checklists, vitals, exercises, and patient education for post-op care.", descAr: "قوائم التعافي والعلامات الحيوية والتمارين والتثقيف الصحي بعد العملية." },
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

  const agents = [
    { id: "medai",     emoji: "🏥", en: "MedAI",     ar: "المرافق الطبي",       descEn: "Your medical journey, end-to-end.",         descAr: "رحلتك الطبية من البداية للنهاية.",   color: "var(--color-medai)" },
    { id: "shopai",    emoji: "🛍️", en: "ShopAI",    ar: "مرافق التسوق",        descEn: "Smart shopping & gifts abroad.",            descAr: "تسوّق ذكي وهدايا في الخارج.",         color: "var(--color-shopai)" },
    { id: "tourai",    emoji: "🗺️", en: "TourAI",    ar: "المرشد السياحي",      descEn: "Cultural sights, tailored to you.",         descAr: "معالم ثقافية مصمّمة لك.",             color: "var(--color-tourai)" },
    { id: "tasteai",   emoji: "🍽️", en: "TasteAI",   ar: "مرافق المطاعم",       descEn: "Restaurants that fit your diet.",           descAr: "مطاعم تناسب حميتك.",                  color: "var(--color-tasteai)" },
    { id: "exploreai", emoji: "🎯", en: "ExploreAI", ar: "مرافق الأنشطة",       descEn: "Activities that match your energy.",        descAr: "أنشطة تناسب طاقتك.",                  color: "var(--color-exploreai)" },
    { id: "planai",    emoji: "🧭", en: "PlanAI",    ar: "منسق الرحلة",         descEn: "Orchestrates every agent for you.",         descAr: "ينسّق كل المرافقين من أجلك.",         color: "var(--color-planai)" },
  ];

  const beyondStats = [
    { value: "14–21",   unit: isAr ? "يوم" : "days", labelEn: "Average trip duration abroad", labelAr: "متوسط مدة الرحلة" },
    { value: "2.8x",    unit: "",                    labelEn: "Family companions per patient", labelAr: "مرافقين عائليين لكل مريض" },
    { value: "SAR 8,400", unit: "",                  labelEn: "Avg. leisure spend per trip",   labelAr: "متوسط الإنفاق الترفيهي" },
  ];

  return (
    <>
      {/* OUR AI COMPANIONS */}
      <section id="agents" className="lazy-section py-24 px-6 relative" style={{ scrollMarginTop: 80, background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>ستة مرافقين ذكيين</span> : "SIX AI AGENTS, ONE COMPANION"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {mode === "en" && <>Your AI <em style={{ color: GOLD }}>Companions</em></>}
              {mode === "ar" && <span dir="rtl" className="font-arabic">رُفَيِّقاتك <em style={{ color: GOLD }}>الذكيون</em></span>}
              {isBoth && <>Your AI <em style={{ color: GOLD }}>Companions</em><span dir="rtl" className="font-arabic block text-2xl md:text-3xl mt-2" style={{ opacity: 0.85 }}>رُفَيِّقاتك الذكيون</span></>}
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_MUTED }}>
              {isAr ? <span className="font-arabic">من العلاج إلى الثقافة والترفيه — كل مرافق متخصص في رحلة جزء من حياتك بالخارج.</span> : "From treatment to culture and leisure — each agent specializes in one part of your time abroad."}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agents.map((a) => (
              <a
                key={a.id}
                href={`/agents/${a.id}`}
                className="group rounded-2xl p-5 transition-all hover:-translate-y-1 flex flex-col text-center"
                style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-all group-hover:scale-110 text-2xl"
                  style={{ background: `${a.color}25`, border: `1px solid ${a.color}` }}
                  aria-hidden="true"
                >
                  {a.emoji}
                </div>
                <h3 className="font-display text-lg font-semibold mb-1" style={{ color: TEXT }}>{a.en}</h3>
                <p className="font-arabic text-xs mb-2" dir="rtl" style={{ color: GOLD }}>{a.ar}</p>
                <p className="text-xs leading-relaxed mb-3 flex-1" style={{ color: TEXT_MUTED }}>
                  {isAr ? <span className="font-arabic" dir="rtl">{a.descAr}</span> : a.descEn}
                </p>
                <span className="text-[11px] font-mono tracking-wide mt-auto" style={{ color: a.color }}>
                  {isAr ? "اعرف أكثر ←" : "Learn more →"}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* BEYOND MEDICINE — 3-stat row */}
      <section id="beyond" className="lazy-section py-20 px-6 relative" style={{ scrollMarginTop: 80, background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>ما وراء العلاج</span> : "BEYOND MEDICINE"}
            </p>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {isAr ? <span className="font-arabic">رحلتك أكبر من المستشفى</span> : <>Your trip is <em style={{ color: GOLD }}>more</em> than the hospital</>}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {beyondStats.map((s, i) => (
              <div key={i} className="rounded-2xl p-7 text-center" style={{ background: BG_DARK, border: `1px solid ${BORDER}` }}>
                <p className="font-display text-4xl md:text-5xl mb-1" style={{ color: GOLD, fontWeight: 300 }}>
                  {s.value}{s.unit && <span className="text-xl ms-2" style={{ color: TEXT_MUTED }}>{s.unit}</span>}
                </p>
                <p className="text-sm mt-3" style={{ color: TEXT_MUTED }}>
                  {isAr ? <span className="font-arabic" dir="rtl">{s.labelAr}</span> : s.labelEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lazy-section py-24 px-6 relative" style={{ scrollMarginTop: 80, background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>كل شيء في تطبيق واحد</span> : "EVERYTHING IN ONE APP"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {sec("features").title ? sec("features").title : (
                <>
                  {mode === "en" && (<>One companion for the <em style={{ color: GOLD }}>whole</em> journey</>)}
                  {mode === "ar" && (<span dir="rtl" className="font-arabic">رفيق واحد <em style={{ color: GOLD }}>لكل</em> الرحلة</span>)}
                  {isBoth && (<>One companion for the <em style={{ color: GOLD }}>whole</em> journey<span dir="rtl" className="font-arabic block text-2xl md:text-3xl mt-2" style={{ opacity: 0.85 }}>رفيق واحد لكل الرحلة</span></>)}
                </>
              )}
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_MUTED }}>
              {sec("features").subtitle
                ? sec("features").subtitle
                : (isAr ? <span className="font-arabic">من حجز رحلتك إلى التعافي في المنزل — رُفَيِّق ينظّم كل تفصيل ويشرحه.</span> : "From booking your flight to recovering at home — RufayQ keeps every detail organized and explained.")}
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
      <section id="how" className="lazy-section py-24 px-6 relative" style={{ scrollMarginTop: 80, background: BG_DARK_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>كيف يعمل</span> : "HOW IT WORKS"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {sec("how").title ? sec("how").title : (isAr ? <span className="font-arabic">ثلاث خطوات نحو الوضوح</span> : "Three steps to clarity")}
            </h2>
            {sec("how").subtitle && <p className="text-sm mt-3" style={{ color: TEXT_MUTED }}>{sec("how").subtitle}</p>}
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
                {isAr ? <span className="font-arabic">ساعدنا في التحسين</span> : "Help us improve"}
              </h3>
            </div>
            <LazyOnView minHeight={280} rootMargin="400px">
              <ReviewForm variant="dark" />
            </LazyOnView>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lazy-section py-24 px-6" style={{ scrollMarginTop: 80, background: BG_DARK }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>الأسئلة الشائعة</span> : "FAQ"}
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
              {sec("faq").title ? sec("faq").title : (isAr ? <span className="font-arabic">أسئلة شائعة</span> : "Common questions")}
            </h2>
            {sec("faq").subtitle && <p className="text-sm mt-3" style={{ color: TEXT_MUTED }}>{sec("faq").subtitle}</p>}
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

      {/* News & Articles now lives at /news (linked from the gold nav CTA). */}

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
            {isAr ? "افتح رُفَيِّق" : "Open RufayQ"}
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-6" style={{ scrollMarginTop: 80, background: BG_DARK, borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] mb-4" style={{ color: GOLD }}>
            {isAr ? <span className="font-arabic" style={{ letterSpacing: 2 }}>تواصل معنا</span> : "CONTACT US"}
          </p>
          <h2 className="font-display text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT, fontWeight: 300 }}>
            {sec("contact").title ? sec("contact").title : (
              <>
                {mode === "en" && (<>We're here to <em style={{ color: GOLD }}>help</em>.</>)}
                {mode === "ar" && (<span dir="rtl" className="font-arabic">نحن هنا <em style={{ color: GOLD }}>للمساعدة</em>.</span>)}
                {isBoth && (<>We're here to <em style={{ color: GOLD }}>help</em>.</>)}
              </>
            )}
          </h2>
          <p className="text-sm mb-10" style={{ color: TEXT_MUTED }}>
            {sec("contact").subtitle
              ? sec("contact").subtitle
              : (isAr ? <span className="font-arabic">رد خلال 24 ساعة · واتساب للدعم العاجل</span> : "Reply within 24 hours · WhatsApp for urgent support")}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "📧", label: "Email", labelAr: "البريد", value: "support [at] rufayq.com", sub: "Replies within 24 hours", subAr: "رد خلال 24 ساعة", href: "mailto:support@rufayq.com?subject=RufayQ%20Support", aria: "Email RufayQ support" },
              { emoji: "💬", label: "Chat on WhatsApp", labelAr: "تواصل عبر واتساب", value: "", sub: "Live chat · 8AM–10PM AST", subAr: "محادثة مباشرة · 8ص–10م", href: "https://wa.me/966569590418?text=Hello%20RufayQ%20%E2%80%94%20I%20need%20help%20with%3A", aria: "Open WhatsApp chat with RufayQ support" },
              { emoji: "📞", label: "Call us", labelAr: "اتصل بنا", value: "", sub: "Direct line for urgent cases", subAr: "خط مباشر للحالات العاجلة", href: "tel:+966569590418", aria: "Call RufayQ support" },
            ].map((c) => (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label={c.aria} className="rounded-2xl p-6 transition-all hover:-translate-y-1 block text-left" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
                <div className="text-3xl mb-3">{c.emoji}</div>
                <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: TEXT_MUTED }}>
                  {(isAr ? c.labelAr : c.label).toUpperCase()}
                </p>
                {c.value && <p className="text-sm font-semibold mb-1" style={{ color: GOLD }}>{c.value}</p>}
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
            <Link to={isAr ? "/ar/privacy" : "/privacy"} className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">الخصوصية</span> : "Privacy"}</Link>
            <Link to={isAr ? "/ar/terms" : "/terms"} className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">الشروط</span> : "Terms"}</Link>
            <a href="#news" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">الأخبار</span> : "News"}</a>
            <a href="#contact" className="text-xs transition-colors hover:text-white" style={{ color: TEXT_MUTED }}>{isAr ? <span className="font-arabic">تواصل</span> : "Contact"}</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingBelow;
