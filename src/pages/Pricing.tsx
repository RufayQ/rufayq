import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Star, ChevronDown, ChevronUp, Globe2, MapPin, Bug } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import { Seo } from "@/seo/Seo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CountryPicker from "@/components/CountryPicker";
import FamilySetupModal from "@/components/FamilySetupModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ADDON_META, COUNTRY_CURRENCY, type AddOnId, type TierId } from "@/data/currencyMaster";
import { faqSchema, breadcrumbSchema } from "@/seo/schema";

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.65)", GOLD = "#C5965A", TEAL = "#004D5B";

interface TierMeta {
  id: "free" | TierId;
  eyebrowEn: string; eyebrowAr: string;
  nameEn: string; nameAr: string;
  descEn: string; descAr: string;
  ctaEn: string; ctaAr: string;
  highlight?: boolean;
  featuresEn: string[]; featuresAr: string[];
}

const TIERS: TierMeta[] = [
  {
    id: "free", eyebrowEn: "Discover", eyebrowAr: "اكتشف", nameEn: "Free", nameAr: "مجاني",
    descEn: "For patients exploring options before committing.",
    descAr: "للمرضى الذين يستكشفون الخيارات قبل الالتزام.",
    ctaEn: "Start free", ctaAr: "ابدأ مجاناً",
    featuresEn: ["AI chat — 20 messages / month", "Document upload — up to 5 files", "Basic journey tracker", "Read access to 3 condition guides", "No medical consultant access"],
    featuresAr: ["رفيق ذكي — ٢٠ رسالة شهرياً", "رفع المستندات — حتى ٥ ملفات", "متتبع رحلات أساسي", "قراءة ٣ أدلة حالات", "بدون مستشار طبي"],
  },
  {
    id: "starter", eyebrowEn: "Essential", eyebrowAr: "أساسي", nameEn: "Starter", nameAr: "ستارتر",
    descEn: "One patient, one destination, the core toolkit.",
    descAr: "مريض واحد، وجهة واحدة، الأدوات الأساسية.",
    ctaEn: "Get Starter", ctaAr: "ابدأ ستارتر",
    featuresEn: ["Everything in Free", "Unlimited AI chat", "Unlimited documents with OCR + auto-route", "Full journey tracker (flight, hotel, hospital)", "Medication manager with interaction alerts", "Email + chat support"],
    featuresAr: ["كل ما في المجاني", "رفيق ذكي بلا حدود", "مستندات غير محدودة مع OCR", "متتبع رحلة كامل", "إدارة أدوية بتنبيهات تداخل", "دعم بالبريد والمحادثة"],
  },
  {
    id: "companion", eyebrowEn: "Most chosen", eyebrowAr: "الأكثر اختياراً", nameEn: "Companion", nameAr: "كومبانيون",
    descEn: "The complete medical-travel experience.",
    descAr: "تجربة السفر الطبي الكاملة.",
    ctaEn: "Get Companion", ctaAr: "ابدأ كومبانيون", highlight: true,
    featuresEn: ["Everything in Starter", "Care Hub — full video library", "Real-time symptom monitoring", "Translated discharge summaries", "KSA doctor coordination handoff", "1 free Medical Consultant session / month", "Priority 24/7 support"],
    featuresAr: ["كل ما في ستارتر", "مركز الرعاية — مكتبة فيديو كاملة", "متابعة أعراض فورية", "ملخصات خروج مترجمة", "تنسيق مع الطبيب السعودي", "جلسة مستشار طبي مجانية شهرياً", "دعم ٢٤/٧ بأولوية"],
  },
  {
    id: "family", eyebrowEn: "Up to 4 patients", eyebrowAr: "حتى ٤ مرضى", nameEn: "Family", nameAr: "فاميلي",
    descEn: "For families with multiple patients or caregivers abroad.",
    descAr: "للعائلات بمرضى أو مرافقين متعددين.",
    ctaEn: "Get Family", ctaAr: "ابدأ فاميلي",
    featuresEn: ["Everything in Companion", "Up to 4 patient profiles", "Shared family coordinator role", "Caregiver notifications + task assignment", "Consolidated family timeline", "2 free Medical Consultant sessions / month"],
    featuresAr: ["كل ما في كومبانيون", "حتى ٤ ملفات مرضى", "دور منسّق عائلي مشترك", "تنبيهات وإسناد مهام للمرافقين", "خط زمني عائلي موحّد", "جلستان مجانيتان مع المستشار"],
  },
];

const ADDON_ORDER: AddOnId[] = ["medicalConsultant", "rushTranslation", "priorityCoordinator", "caregiverSeat", "physioNetwork", "claimsConcierge"];

const FAQ_EN = [
  { q: "Can I change plans later?", a: "Yes — upgrade, downgrade, or cancel anytime from Settings. Pro-rated credits apply for mid-cycle changes." },
  { q: "What currencies do you support?", a: "SAR, AED, EGP, USD, and EUR. We auto-detect from your locale and let you switch anytime." },
  { q: "What happens if I cancel mid-month?", a: "You keep paid features until the end of the billing period. No partial refunds, but no surprise charges either." },
  { q: "Is my medical data secure?", a: "Yes — encrypted at rest and in transit, never sold, and never used to train third-party AI. See our Security page for details." },
  { q: "How do Medical Consultant sessions work?", a: "45-minute private video call with a physician-coordinator who has reviewed your case beforehand. Companion includes 1/month, Family 2/month; extra sessions can be purchased." },
  { q: "Do you accept health insurance?", a: "Subscriptions are not insurance-eligible, but our Insurance Claims Concierge add-on can recover treatment costs from BUPA Arabia, Tawuniya, and others." },
];
const FAQ_AR = [
  { q: "هل يمكنني تغيير الخطة لاحقاً؟", a: "نعم — ترقية أو تخفيض أو إلغاء في أي وقت من الإعدادات. أرصدة بالنسبة للتغييرات في منتصف الدورة." },
  { q: "أي عملات تدعمون؟", a: "ر.س، د.إ، ج.م، دولار، ويورو. نكتشف تلقائياً من موقعك ويمكنك التبديل في أي وقت." },
  { q: "ماذا يحدث إن ألغيت في منتصف الشهر؟", a: "تحتفظ بالميزات المدفوعة حتى نهاية فترة الفوترة. بدون استرداد جزئي وبدون رسوم مفاجئة." },
  { q: "هل بياناتي الطبية آمنة؟", a: "نعم — مشفّرة في الراحة والنقل، لا تُباع ولا تُستخدم لتدريب ذكاء اصطناعي خارجي. راجع صفحة الأمان." },
  { q: "كيف تعمل جلسات المستشار الطبي؟", a: "مكالمة فيديو خاصة ٤٥ دقيقة مع طبيب-منسّق راجع حالتك مسبقاً. كومبانيون = ١ شهرياً، فاميلي = ٢؛ يمكن شراء جلسات إضافية." },
  { q: "هل تقبلون التأمين الصحي؟", a: "الاشتراكات غير مغطاة بالتأمين، لكن إضافة مساعد المطالبات تستردّ تكاليف العلاج من بوبا والتعاونية وغيرها." },
];

const Pricing = () => {
  const isAr = useLocation().pathname.startsWith("/ar");
  const { mode } = useLanguage();
  const { format, getPrice, getAddon, currency, setCurrency, country, countryManual, detectionSource, geoLoading, debug } = useCurrency();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const showAr = mode === "ar";
  const showEn = mode !== "ar";

  const tierPrice = (id: "free" | TierId) => {
    if (id === "free") return showAr ? "مجاني" : "Free";
    const p = getPrice(id, period);
    return format(p);
  };

  // Show skeletons for paid prices and the detection note while async geo
  // resolves, so the UI doesn't flash a wrong currency or shift layout.
  const showPriceSkeleton = geoLoading && !countryManual;

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <Seo
        title={isAr ? "أسعار رُفَيِّق" : "Pricing"}
        description={isAr
          ? "اشتراك واحد لكل خطوة من رحلتك العلاجية. خطط من المجاني إلى فاميلي بأسعار محلية بالريال السعودي والدرهم والجنيه والدولار واليورو."
          : "One subscription for every step of your medical journey. Plans from Free to Family in SAR, AED, EGP, USD, and EUR."}
        canonical={isAr ? "/ar/pricing" : "/pricing"}
        jsonLd={[
          breadcrumbSchema([
            { name: isAr ? "الرئيسية" : "Home", path: isAr ? "/ar" : "/" },
            { name: isAr ? "الأسعار" : "Pricing", path: isAr ? "/ar/pricing" : "/pricing" },
          ]),
          faqSchema(FAQ_EN),
        ]}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link to={isAr ? "/ar#pricing" : "/#pricing"} className="flex items-center gap-2.5">
            <ArrowLeft size={16} color={TEXT} style={{ transform: isAr ? "scaleX(-1)" : undefined }} />
            <RufayQLogo size={28} variant="light" />
            <span className="font-display text-lg"><span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <CurrencySwitcher />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        {showEn && <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-4" style={{ fontWeight: 300 }}>One subscription. <span style={{ color: GOLD }}>Every step</span> of your medical journey.</h1>}
        {showAr && <h1 dir="rtl" className="font-arabic text-3xl md:text-5xl mb-4" style={{ color: GOLD, fontWeight: 600 }}>اشتراك واحد. كل خطوة من رحلتك العلاجية.</h1>}
        {showEn && <p className="text-base md:text-lg max-w-2xl mx-auto mb-8" style={{ color: MUTED }}>Choose the plan that fits your journey. Upgrade, downgrade, or cancel anytime.</p>}
        {showAr && <p dir="rtl" className="font-arabic max-w-2xl mx-auto mb-8" style={{ color: MUTED }}>اختر الخطة التي تناسب رحلتك. ترقية أو تخفيض أو إلغاء في أي وقت.</p>}

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full mb-3" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          {(["monthly", "annual"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-5 py-2 rounded-full text-xs font-semibold transition-all"
              style={{ background: period === p ? GOLD : "transparent", color: period === p ? "#06101A" : MUTED }}>
              {p === "monthly" ? (showAr ? "شهري" : "Monthly") : (showAr ? "سنوي — وفّر شهرين" : "Annual — Save 2 months")}
            </button>
          ))}
        </div>
        {/* delayDuration prevents accidental tooltip popups on touch/mobile —
            the badge & toggle live in a tight horizontal row, easy to brush. */}
        <TooltipProvider delayDuration={700} skipDelayDuration={300}>
          <div className="text-[11px] flex items-center gap-2 flex-wrap justify-center" style={{ color: MUTED }} dir={showAr ? "rtl" : "ltr"}>
            <span>{showAr ? `الأسعار بـ ${currency}` : `Prices shown in ${currency}`}</span>
            <CurrencySwitcher variant="inline" />
            <span style={{ color: MUTED }}>·</span>
            <CountryPicker />
            {/* Detected vs Manual source badge — confirms where the price comes from */}
            {country && (() => {
              const sourceLabelEn: Record<typeof detectionSource, string> = {
                manual: "Manual override",
                ip: "IP address",
                locale: "Browser language",
                timezone: "System timezone",
                stored: "Saved preference",
                default: "Default",
              };
              const sourceLabelAr: Record<typeof detectionSource, string> = {
                manual: "اختيار يدوي",
                ip: "عنوان IP",
                locale: "لغة المتصفح",
                timezone: "المنطقة الزمنية",
                stored: "تفضيل محفوظ",
                default: "افتراضي",
              };
              const sourceLabel = showAr ? sourceLabelAr[detectionSource] : sourceLabelEn[detectionSource];
              const tooltipTitle = countryManual
                ? (showAr ? `المصدر: ${sourceLabel}` : `Source: ${sourceLabel}`)
                : (showAr ? `المصدر: ${sourceLabel}` : `Source: ${sourceLabel}`);
              const tooltipDetail = countryManual
                ? (showAr ? "تم اختيار الدولة يدوياً" : "Country was manually overridden")
                : (showAr ? "تم اكتشاف موقعك تلقائياً" : "Detected automatically from your location");
              const ariaLabel = `${tooltipTitle} — ${tooltipDetail}`;
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      data-testid="detection-badge"
                      data-detection-source={detectionSource}
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                      className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold inline-flex items-center gap-1 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                      style={countryManual
                        ? { background: "rgba(197,150,90,0.18)", color: GOLD, border: `1px solid ${GOLD}55` }
                        : { background: "rgba(94,229,176,0.12)", color: "#5EE5B0", border: "1px solid rgba(94,229,176,0.35)" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: countryManual ? GOLD : "#5EE5B0" }} />
                      {countryManual
                        ? (showAr ? `يدوي · ${country}` : `Manual · ${country}`)
                        : (showAr ? `تلقائي · ${country}` : `Detected · ${country}`)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align={showAr ? "end" : "start"} dir={showAr ? "rtl" : "ltr"} className={showAr ? "font-arabic text-right" : "text-left"}>
                    <div data-testid="detection-tooltip-title" className="font-semibold">{tooltipTitle}</div>
                    <div className="opacity-80 text-[11px]">{tooltipDetail}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })()}
            {/* Quick local↔USD toggle — lets visitors flip between their local currency and USD without opening the picker */}
            {country && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== "USD" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="currency-toggle"
                    type="button"
                    onClick={() => setCurrency(currency === "USD" ? COUNTRY_CURRENCY[country]! : "USD")}
                    className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold transition-all hover:scale-105 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                    style={{ background: "transparent", color: TEXT, border: `1px solid ${BORDER}` }}
                    aria-label={
                      currency === "USD"
                        ? (showAr ? `تبديل العملة إلى ${COUNTRY_CURRENCY[country]}` : `Switch currency to ${COUNTRY_CURRENCY[country]}`)
                        : (showAr ? "تبديل العملة إلى الدولار الأمريكي" : "Switch currency to US Dollar")
                    }
                  >
                    <Globe2 size={10} aria-hidden="true" style={{ transform: showAr ? "scaleX(-1)" : undefined }} />
                    {currency === "USD"
                      ? (showAr ? `عرض بـ ${COUNTRY_CURRENCY[country]}` : `Show in ${COUNTRY_CURRENCY[country]}`)
                      : (showAr ? "عرض بالدولار" : "Show in USD")}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align={showAr ? "end" : "start"} dir={showAr ? "rtl" : "ltr"} className={showAr ? "font-arabic text-right" : "text-left"}>
                  {showAr ? "تبديل بين العملة المحلية والدولار" : "Toggle between local currency and USD"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Inline note: explains how location was determined and any fallback used */}
          {showPriceSkeleton && !country && (
            <div
              data-testid="detection-note-skeleton"
              aria-hidden="true"
              className="mt-2 mx-auto h-3 w-56 rounded-full animate-pulse"
              style={{ background: "rgba(232,236,240,0.08)" }}
            />
          )}
          {country && !countryManual && (
            <p
              data-testid="detection-note"
              className={`mt-2 text-[10px] flex items-center justify-center gap-1.5 ${showAr ? "font-arabic" : ""}`}
              style={{ color: MUTED }}
              dir={showAr ? "rtl" : "ltr"}
            >
              <MapPin size={10} style={{ transform: showAr ? "scaleX(-1)" : undefined }} />
              {(() => {
                const loc = country;
                if (showAr) {
                  switch (detectionSource) {
                    case "ip": return `استناداً إلى عنوان IP الخاص بك · ${loc}`;
                    case "locale": return `استناداً إلى لغة المتصفح · ${loc} (تعذّر تحديد IP)`;
                    case "timezone": return `استناداً إلى المنطقة الزمنية · ${loc} (تعذّر تحديد IP)`;
                    case "stored": return `من تفضيلاتك السابقة · ${loc}`;
                    default: return `الموقع الافتراضي · ${loc}`;
                  }
                }
                switch (detectionSource) {
                  case "ip": return `Based on your IP address · ${loc}`;
                  case "locale": return `Fell back to browser language · ${loc} (IP lookup unavailable)`;
                  case "timezone": return `Fell back to timezone · ${loc} (IP lookup unavailable)`;
                  case "stored": return `From your previous preference · ${loc}`;
                  default: return `Default location · ${loc}`;
                }
              })()}
            </p>
          )}

          {/* Detection debug — surfaces every raw signal used so issues can be
              triaged without opening devtools. Hidden behind a small link. */}
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              data-testid="detection-debug-toggle"
              onClick={() => setDebugOpen((v) => !v)}
              aria-expanded={debugOpen}
              aria-controls="detection-debug-panel"
              className="text-[10px] inline-flex items-center gap-1 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded"
              style={{ color: MUTED }}
            >
              <Bug size={10} aria-hidden="true" />
              {showAr ? (debugOpen ? "إخفاء معلومات الكشف" : "معلومات الكشف") : (debugOpen ? "Hide detection debug" : "Detection debug")}
            </button>
          </div>
          {debugOpen && (
            <div
              id="detection-debug-panel"
              data-testid="detection-debug-panel"
              role="region"
              aria-label={showAr ? "معلومات كشف الموقع" : "Location detection debug"}
              dir="ltr"
              className="mt-2 mx-auto max-w-md rounded-lg p-3 text-left font-mono text-[10px] leading-relaxed"
              style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}
            >
              {([
                ["source", detectionSource],
                ["country", country ?? "—"],
                ["countryManual", String(countryManual)],
                ["currency", currency],
                ["geoLoading", String(geoLoading)],
                ["debug.ipCountry", debug.ipCountry ?? "—"],
                ["debug.localeCountry", debug.localeCountry ?? "—"],
                ["debug.timezone", debug.timezone ?? "—"],
                ["debug.timezoneCountry", debug.timezoneCountry ?? "—"],
                ["debug.storedCountry", debug.storedCountry ?? "—"],
                ["debug.storedCurrency", debug.storedCurrency ?? "—"],
                ["debug.manualCountry", debug.manualCountry ?? "—"],
                ["debug.manualCurrency", debug.manualCurrency ?? "—"],
                ["debug.perCountryOverride", debug.perCountryOverride ?? "—"],
                ["debug.languages", debug.languages.join(", ") || "—"],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span style={{ color: MUTED }}>{k}</span>
                  <span data-debug-key={k}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </TooltipProvider>
      </header>

      {/* Tier cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t) => (
            <div key={t.id}
              className="relative rounded-3xl p-6 flex flex-col"
              style={{
                background: t.highlight ? `linear-gradient(180deg, ${GOLD}18, ${BG2})` : BG2,
                border: `1px solid ${t.highlight ? GOLD : BORDER}`,
                boxShadow: t.highlight ? `0 20px 60px -20px ${GOLD}55` : undefined,
              }}>
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
                  style={{ background: GOLD, color: "#06101A" }}>
                  {showAr ? "الأكثر شيوعاً ★" : "★ MOST POPULAR"}
                </div>
              )}
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>
                {showAr ? t.eyebrowAr : t.eyebrowEn}
              </p>
              <h3 className="font-display text-2xl mb-1" style={{ color: TEXT }}>{showAr ? t.nameAr : t.nameEn}</h3>
              <p className="text-xs mb-4" style={{ color: MUTED, minHeight: 32 }}>{showAr ? t.descAr : t.descEn}</p>
              <div className="mb-5">
                <span className="font-display text-3xl font-semibold" style={{ color: TEXT }}>{tierPrice(t.id)}</span>
                {t.id !== "free" && (
                  <span className="text-xs ms-1" style={{ color: MUTED }}>
                    {period === "monthly" ? (showAr ? "/ شهر" : "/ month") : (showAr ? "/ سنة" : "/ year")}
                  </span>
                )}
                {t.id === "free" && <span className="text-xs ms-1" style={{ color: MUTED }}>{showAr ? "للأبد" : "forever"}</span>}
                {t.id !== "free" && period === "annual" && (
                  <div className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#1FA77744", color: "#5EE5B0" }}>
                    {showAr ? "وفّر شهرين" : "Save 2 months"}
                  </div>
                )}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {(showAr ? t.featuresAr : t.featuresEn).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: TEXT }} dir={showAr ? "rtl" : "ltr"}>
                    <Check size={14} className="mt-0.5 flex-shrink-0" color={GOLD} />
                    <span className={showAr ? "font-arabic" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
              {t.id === "family" ? (
                <button onClick={() => setFamilyOpen(true)}
                  className="block w-full text-center px-4 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: GOLD, color: "#06101A" }}>
                  {showAr ? t.ctaAr : t.ctaEn}
                </button>
              ) : (
                <Link to={t.id === "free" ? "/auth" : "/app"}
                  className="block text-center px-4 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: t.highlight ? GOLD : "transparent", color: t.highlight ? "#06101A" : TEXT, border: t.highlight ? "none" : `1px solid ${BORDER}` }}>
                  {showAr ? t.ctaAr : t.ctaEn}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Enterprise tier — contact sales */}
        <div className="mt-6 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5"
          style={{ background: `linear-gradient(135deg, ${TEAL}55, ${BG2})`, border: `1px solid ${BORDER}` }}>
          <div className="flex-1">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: GOLD }}>
              {showAr ? "للمؤسسات" : "Enterprise"}
            </p>
            <h3 className="font-display text-2xl md:text-3xl mb-2" style={{ color: TEXT }}>
              {showAr ? "حلول للمستشفيات وشركات التأمين والوكالات الحكومية" : "For hospitals, insurers & government agencies"}
            </h3>
            <p className="text-sm mb-3" style={{ color: MUTED }} dir={showAr ? "rtl" : "ltr"}>
              {showAr
                ? "استخدام غير محدود، تكامل مع NPHIES و EHR، SSO، اتفاقية معالجة البيانات (DPA)، فوترة سنوية بالفاتورة، ومدير حساب مخصص."
                : "Unlimited seats, NPHIES & EHR integration, SSO, signed DPA, annual invoice billing, and a dedicated account manager."}
            </p>
            <div className="flex flex-wrap gap-2">
              {(showAr
                ? ["NPHIES", "تكامل EHR", "SSO / SAML", "DPA موقّعة", "فوترة بالفاتورة", "SLA ٩٩٫٩٪"]
                : ["NPHIES", "EHR Integration", "SSO / SAML", "Signed DPA", "Invoice billing", "99.9% SLA"]
              ).map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2 py-1 rounded-full" style={{ background: BG, color: GOLD, border: `1px solid ${BORDER}` }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <Link to="/enterprise" className="text-center px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap" style={{ background: GOLD, color: "#06101A" }}>
              {showAr ? "تواصل مع المبيعات" : "Contact sales"}
            </Link>
            <a href="mailto:enterprise@rufayq.com" className="text-center text-[11px]" style={{ color: MUTED }}>
              enterprise@rufayq.com
            </a>
          </div>
        </div>

        {/* Family workflow + Admin/management workflow */}
        <div className="mt-10 grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>
              {showAr ? "كيف تعمل خطة فاميلي" : "How Family works"}
            </p>
            <h3 className="font-display text-xl mb-3" style={{ color: TEXT }}>
              {showAr ? "ملف واحد. حتى ٤ مرضى. منسّق عائلي." : "One account. Up to 4 patients. One family coordinator."}
            </h3>
            <ol className="space-y-2 text-sm" style={{ color: TEXT }} dir={showAr ? "rtl" : "ltr"}>
              {(showAr ? [
                "ادفع اشتراك فاميلي مرة واحدة من حسابك.",
                "أنشئ حتى ٤ ملفات مرضى تحت مظلتك (أبناء، والدين، زوج).",
                "ادعُ مرافقين بصلاحيات قراءة أو إدارة عبر البريد أو رقم الجوال.",
                "تظهر جميع الرحلات والأدوية والمستندات في خط زمني عائلي موحّد.",
                "كل مريض يحتفظ بخصوصية بياناته الطبية — يتحكم بمن يرى ماذا.",
              ] : [
                "Pay for a single Family subscription from your account.",
                "Create up to 4 patient profiles under your umbrella (kids, parents, spouse).",
                "Invite caregivers with read or manage permissions via email or mobile.",
                "All trips, medications, and documents appear in one consolidated family timeline.",
                "Each patient still owns their medical privacy — they control who sees what.",
              ]).map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono font-bold flex-shrink-0" style={{ color: GOLD }}>{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: GOLD }}>
              {showAr ? "إدارة الاشتراكات" : "Subscription management"}
            </p>
            <h3 className="font-display text-xl mb-3" style={{ color: TEXT }}>
              {showAr ? "تطبيق وإدارة الباقة من لوحة التحكم" : "Apply & manage your plan from one dashboard"}
            </h3>
            <ol className="space-y-2 text-sm" style={{ color: TEXT }} dir={showAr ? "rtl" : "ltr"}>
              {(showAr ? [
                "اختر الباقة وادفع بأمان عبر مدى أو فيزا أو Apple Pay.",
                "تظهر باقتك فوراً في الإعدادات → الاشتراك مع تاريخ التجديد.",
                "يستلم فريق رُفَيِّق إشعار التفعيل ويُجهّز رحلتك خلال ساعة.",
                "ترقية، تخفيض، أو إلغاء بنقرة واحدة — تطبق فوراً مع تسوية بالنسبة.",
                "الفواتير وإيصالات ضريبة القيمة المضافة متاحة للتحميل في أي وقت.",
              ] : [
                "Choose your tier and pay securely via Mada, Visa, or Apple Pay.",
                "Your plan appears instantly in Settings → Subscription with the renewal date.",
                "RufayQ ops gets the activation notice and prepares your journey within an hour.",
                "Upgrade, downgrade, or cancel in one tap — applied instantly with prorated billing.",
                "Invoices and VAT-compliant receipts are downloadable any time.",
              ]).map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono font-bold flex-shrink-0" style={{ color: GOLD }}>{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { en: "Built-in clinical access", ar: "وصول سريري مدمج", dEn: `One Medical Consultant session/month — worth ${format(getAddon("medicalConsultant"))} on its own.`, dAr: `جلسة مستشار طبي شهرياً — تساوي ${format(getAddon("medicalConsultant"))} منفردة.` },
            { en: "Translated for your Saudi doctor", ar: "مترجم لطبيبك السعودي", dEn: "Discharge summaries converted for KSA physician handoff.", dAr: "ملخصات خروج محوّلة للتسليم للطبيب السعودي." },
            { en: "Less than 1% of a typical procedure", ar: "أقل من ١٪ من تكلفة العملية", dEn: `${format(getPrice("companion", "annual"))}/year vs. SAR 150,000 average procedure cost.`, dAr: `${format(getPrice("companion", "annual"))}/سنة مقابل ١٥٠,٠٠٠ ر.س متوسط تكلفة عملية.` },
          ].map((b, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              <p className="text-sm font-semibold mb-2" style={{ color: GOLD }}>{showAr ? b.ar : b.en}</p>
              <p className="text-xs" style={{ color: MUTED }} dir={showAr ? "rtl" : "ltr"}>{showAr ? b.dAr : b.dEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          {showEn && <h2 className="font-display text-3xl md:text-4xl mb-2" style={{ fontWeight: 400 }}>Add-ons — Go deeper when you need to</h2>}
          {showAr && <h2 dir="rtl" className="font-arabic text-2xl md:text-3xl mb-2" style={{ color: GOLD }}>إضافات — تعمّق عند الحاجة</h2>}
          <p className="text-sm" style={{ color: MUTED }}>
            {showAr ? "كل خطة قابلة للتوسيع. ادفع فقط عند الاستخدام." : "Every plan can be extended. Pay only when you use them."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {ADDON_ORDER.map((id) => {
            const meta = ADDON_META[id];
            const price = getAddon(id);
            const hero = meta.hero;
            return (
              <div key={id}
                className="rounded-2xl p-6 flex flex-col"
                style={{
                  background: hero ? `linear-gradient(135deg, ${GOLD}1A, ${BG2})` : BG2,
                  border: `1px solid ${hero ? GOLD : BORDER}`,
                }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-lg flex items-center gap-1.5" style={{ color: TEXT }}>
                    {hero && <Star size={14} fill={GOLD} color={GOLD} />}
                    {showAr ? meta.nameAr : meta.nameEn}
                  </h3>
                  <span className="font-mono text-sm font-bold whitespace-nowrap" style={{ color: GOLD }}>
                    {format(price)} <span className="text-[10px] font-normal" style={{ color: MUTED }}>{showAr ? meta.unitAr : meta.unitEn}</span>
                  </span>
                </div>
                <p className="text-xs mb-4 flex-1" style={{ color: MUTED }} dir={showAr ? "rtl" : "ltr"}>{showAr ? meta.descAr : meta.descEn}</p>
                <Link to="/app" className="self-start text-xs font-semibold px-4 py-2 rounded-full transition-all hover:scale-105"
                  style={{ background: hero ? GOLD : "transparent", color: hero ? "#06101A" : TEXT, border: hero ? "none" : `1px solid ${BORDER}` }}>
                  {showAr ? meta.ctaAr : meta.ctaEn}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        {showEn && <h2 className="font-display text-3xl text-center mb-8" style={{ fontWeight: 400 }}>Frequently asked</h2>}
        {showAr && <h2 dir="rtl" className="font-arabic text-2xl text-center mb-8" style={{ color: GOLD }}>الأسئلة الشائعة</h2>}
        <div className="space-y-2">
          {(showAr ? FAQ_AR : FAQ_EN).map((f, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left"
                dir={showAr ? "rtl" : "ltr"}>
                <span className={`text-sm font-semibold ${showAr ? "font-arabic" : ""}`} style={{ color: TEXT }}>{f.q}</span>
                {openFaq === i ? <ChevronUp size={16} color={GOLD} /> : <ChevronDown size={16} color={MUTED} />}
              </button>
              {openFaq === i && (
                <p className={`px-4 pb-4 text-xs leading-relaxed ${showAr ? "font-arabic" : ""}`} style={{ color: MUTED }} dir={showAr ? "rtl" : "ltr"}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-14 text-center" style={{ background: `linear-gradient(135deg, ${TEAL}, ${BG2})`, border: `1px solid ${BORDER}` }}>
          {showEn && <h3 className="font-display text-2xl md:text-3xl mb-2" style={{ fontWeight: 400 }}>Building for a hospital, insurer, or facilitator?</h3>}
          {showAr && <h3 dir="rtl" className="font-arabic text-xl md:text-2xl mb-2" style={{ color: GOLD }}>تبني لمستشفى أو شركة تأمين أو وسيط؟</h3>}
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            {showAr ? "رُفَيِّق إنتربرايز منصة مرنة — علامة بيضاء، تكامل تأمين، تحليلات. أسعار مخصصة." : "RufayQ Enterprise is a modular platform — white-label, insurer integration, analytics. Custom pricing."}
          </p>
          <Link to="/enterprise" className="inline-block px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{ background: GOLD, color: "#06101A" }}>
            {showAr ? "شاهد خيارات إنتربرايز ←" : "See Enterprise options →"}
          </Link>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: BORDER, color: MUTED }}>
        © 2026 RufayQ · <Link to={isAr ? "/ar/privacy" : "/privacy"} style={{ color: GOLD }}>{isAr ? "الخصوصية" : "Privacy"}</Link> · <Link to={isAr ? "/ar/terms" : "/terms"} style={{ color: GOLD }}>{isAr ? "الشروط" : "Terms"}</Link>
      </footer>
    </div>
  );
};

export default Pricing;
