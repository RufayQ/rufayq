import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Building2, Stethoscope, Shield, Globe2, ChevronDown, ChevronUp, Mail } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import { Seo } from "@/seo/Seo";
import { useLanguage } from "@/contexts/LanguageContext";
import { faqSchema, breadcrumbSchema } from "@/seo/schema";

const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.65)", GOLD = "#C5965A", TEAL = "#004D5B";

interface Audience {
  id: string;
  icon: typeof Building2;
  titleEn: string; titleAr: string;
  blurbEn: string; blurbAr: string;
  bulletsEn: string[]; bulletsAr: string[];
}

const AUDIENCES: Audience[] = [
  {
    id: "hospitals",
    icon: Stethoscope,
    titleEn: "Hospitals & Clinics", titleAr: "المستشفيات والعيادات",
    blurbEn: "Manage international patients end-to-end — from inquiry to post-discharge.",
    blurbAr: "إدارة المرضى الدوليين من الاستفسار إلى ما بعد الخروج.",
    bulletsEn: [
      "Bilingual patient portal (EN/AR + 6 more)",
      "RCM-grade authorization & claims workflows",
      "Bedside translation + discharge automation",
      "NPHIES-ready (KSA) and FHIR-compatible export",
    ],
    bulletsAr: [
      "بوابة مرضى ثنائية (إنجليزي/عربي + ٦ لغات)",
      "مسارات موافقات ومطالبات بمعايير الدورة الإيرادية",
      "ترجمة بجانب السرير وأتمتة الخروج",
      "متوافق مع نفيس وصادر FHIR",
    ],
  },
  {
    id: "insurers",
    icon: Shield,
    titleEn: "Insurers & TPAs", titleAr: "شركات التأمين وإدارة المطالبات",
    blurbEn: "Reduce overseas-treatment leakage with a coordinated patient app.",
    blurbAr: "قلّل تسرّب مطالبات العلاج الخارجي بتطبيق مريض موحّد.",
    bulletsEn: [
      "Pre-approval orchestration with audit trail",
      "AI-prepared claims with human review",
      "Real-time treatment-stage notifications",
      "Member co-branded white-label option",
    ],
    bulletsAr: [
      "تنظيم الموافقات المسبقة مع سجل تدقيق",
      "مطالبات يُعدّها الذكاء الاصطناعي ويراجعها البشر",
      "تنبيهات فورية لمراحل العلاج",
      "خيار علامة بيضاء مشتركة مع العضو",
    ],
  },
  {
    id: "ministries",
    icon: Building2,
    titleEn: "Ministries & Sponsors", titleAr: "الوزارات والجهات الراعية",
    blurbEn: "Coordinate sponsored patient cohorts traveling for specialized care.",
    blurbAr: "نسّق أفواج المرضى المبتعثين للعلاج المتخصص.",
    bulletsEn: [
      "Cohort-level dashboards & cost analytics",
      "Sponsor approvals & per-diem tracking",
      "Compliance reporting (HIPAA / Saudi PDPL)",
      "Embassy & repatriation coordination",
    ],
    bulletsAr: [
      "لوحات أفواج وتحليل تكاليف",
      "موافقات الراعي وتتبع البدل اليومي",
      "تقارير الامتثال (HIPAA / حماية البيانات)",
      "تنسيق السفارات والإعادة للوطن",
    ],
  },
  {
    id: "agencies",
    icon: Globe2,
    titleEn: "Medical Tourism Agencies", titleAr: "وكالات السياحة العلاجية",
    blurbEn: "Replace WhatsApp + Excel with a regulated patient platform.",
    blurbAr: "استبدل واتساب وإكسل بمنصة مرضى منظَّمة.",
    bulletsEn: [
      "Branded patient app (your logo, your colors)",
      "Lead-to-revenue funnel & commission tracking",
      "Multi-destination, multi-currency invoicing",
      "Hospital network & SLA management",
    ],
    bulletsAr: [
      "تطبيق مريض بعلامتك (شعارك وألوانك)",
      "مسار التحويل من العميل المحتمل للإيراد",
      "فوترة متعددة الوجهات والعملات",
      "إدارة شبكة المستشفيات واتفاقيات الخدمة",
    ],
  },
];

interface Bundle {
  id: "essentials" | "growth" | "platform";
  nameEn: string; nameAr: string;
  badgeEn?: string; badgeAr?: string;
  pitchEn: string; pitchAr: string;
  forEn: string; forAr: string;
  inclusionsEn: string[]; inclusionsAr: string[];
  highlight?: boolean;
}

const BUNDLES: Bundle[] = [
  {
    id: "essentials",
    nameEn: "Essentials", nameAr: "الأساسيات",
    pitchEn: "Single-site rollout, core RCM, branded portal.",
    pitchAr: "نشر بموقع واحد، دورة إيرادية أساسية، بوابة بعلامتك.",
    forEn: "Up to 1,000 active patients · 1 facility",
    forAr: "حتى ١٬٠٠٠ مريض نشط · منشأة واحدة",
    inclusionsEn: [
      "Bilingual patient portal + provider dashboard",
      "Authorization + claims worklists",
      "Standard onboarding (4 weeks)",
      "Email + chat support, business hours",
    ],
    inclusionsAr: [
      "بوابة مرضى ولوحة مزوّد ثنائيتي اللغة",
      "قوائم عمل موافقات ومطالبات",
      "تأهيل قياسي (٤ أسابيع)",
      "دعم بالبريد والمحادثة في ساعات العمل",
    ],
  },
  {
    id: "growth",
    nameEn: "Growth", nameAr: "النمو",
    badgeEn: "Most chosen", badgeAr: "الأكثر اختياراً",
    pitchEn: "Multi-site, advanced RCM, AI claims scrubber, custom integrations.",
    pitchAr: "متعدد المواقع، دورة إيرادية متقدمة، فاحص مطالبات بالذكاء الاصطناعي.",
    forEn: "Up to 10,000 active patients · multi-facility",
    forAr: "حتى ١٠٬٠٠٠ مريض نشط · مواقع متعددة",
    inclusionsEn: [
      "Everything in Essentials",
      "AI claims scrubber + denial analytics",
      "HIS/EMR integrations (HL7/FHIR)",
      "Dedicated CSM, 8-week implementation",
      "24/7 priority support, 1-hour SLA",
    ],
    inclusionsAr: [
      "كل ما في الأساسيات",
      "فاحص مطالبات ذكي وتحليل الرفض",
      "تكامل HIS/EMR (HL7/FHIR)",
      "مدير حساب مخصص، تنفيذ ٨ أسابيع",
      "دعم ٢٤/٧ بأولوية، اتفاقية ساعة واحدة",
    ],
    highlight: true,
  },
  {
    id: "platform",
    nameEn: "Platform", nameAr: "المنصة",
    badgeEn: "White-label", badgeAr: "علامة بيضاء",
    pitchEn: "Full white-label, network-of-networks, on-prem option.",
    pitchAr: "علامة بيضاء كاملة، شبكة من الشبكات، خيار محلي.",
    forEn: "Unlimited patients · multi-tenant · cross-border",
    forAr: "مرضى غير محدودين · متعدد المستأجرين · عابر للحدود",
    inclusionsEn: [
      "Everything in Growth",
      "Full white-label (mobile + web)",
      "Multi-tenant org hierarchy",
      "On-prem / sovereign-cloud deployment",
      "Co-engineered roadmap, named exec sponsor",
    ],
    inclusionsAr: [
      "كل ما في النمو",
      "علامة بيضاء كاملة (جوال وويب)",
      "هرمية مؤسسات متعددة المستأجرين",
      "نشر محلي / سحابة سيادية",
      "خارطة طريق مشتركة وراعٍ تنفيذي",
    ],
  },
];

const FAQ_EN = [
  { q: "How is enterprise pricing structured?", a: "Custom — based on patient volume, sites, integrations, and support tier. We share a written quote within 3 business days of your discovery call." },
  { q: "What's the typical deployment timeline?", a: "Essentials: 4 weeks. Growth: 8 weeks. Platform: 12–16 weeks including HIS/EMR integration and white-label theming." },
  { q: "Where is patient data hosted?", a: "By default in KSA region (Riyadh). Sovereign-cloud or on-prem deployment available for Platform-tier customers under HIPAA, ISO 27001, and Saudi PDPL." },
  { q: "Can we co-brand the patient app?", a: "Growth tier includes co-branding (logo + accent color). Platform tier includes full white-label across iOS, Android, and web." },
  { q: "Do you offer a pilot program?", a: "Yes — 90-day paid pilots are available for Essentials and Growth tiers, with credit toward the annual contract upon conversion." },
];
const FAQ_AR = [
  { q: "كيف يتم تسعير المؤسسات؟", a: "مخصّص — حسب حجم المرضى والمواقع والتكاملات ومستوى الدعم. نرسل عرض سعر خطي خلال ٣ أيام عمل من مكالمة الاستكشاف." },
  { q: "ما الجدول الزمني المعتاد للنشر؟", a: "الأساسيات: ٤ أسابيع. النمو: ٨ أسابيع. المنصة: ١٢-١٦ أسبوعاً شاملةً تكامل HIS/EMR وتخصيص العلامة." },
  { q: "أين تُستضاف بيانات المرضى؟", a: "افتراضياً في منطقة السعودية (الرياض). نشر سحابة سيادية أو محلي متاح لعملاء المنصة وفق HIPAA و ISO 27001 ونظام حماية البيانات السعودي." },
  { q: "هل يمكننا تخصيص تطبيق المريض بعلامتنا؟", a: "النمو يشمل تخصيصاً مشتركاً (شعار + لون). المنصة تشمل علامة بيضاء كاملة على iOS وأندرويد والويب." },
  { q: "هل تقدمون برنامج تجريبي؟", a: "نعم — برامج تجريبية مدفوعة لمدة ٩٠ يوماً للأساسيات والنمو، مع رصيد مقابل العقد السنوي عند التحويل." },
];

const Enterprise = () => {
  const isAr = useLocation().pathname.startsWith("/ar");
  const { language } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const ar = isAr || language === "ar";

  const titleEn = "Enterprise — RufayQ for hospitals, insurers, and ministries";
  const titleAr = "المؤسسات — رُفَيِّق للمستشفيات والتأمين والوزارات";
  const descEn = "Bilingual medical-travel infrastructure for hospitals, insurers, ministries, and agencies. Custom pricing, sovereign hosting, white-label.";
  const descAr = "بنية تحتية ثنائية اللغة للسفر العلاجي للمستشفيات وشركات التأمين والوزارات والوكالات. تسعير مخصص واستضافة سيادية وعلامة بيضاء.";

  const faqs = ar ? FAQ_AR : FAQ_EN;

  return (
    <>
      <Seo
        kind="enterprise"
        titleEn={titleEn} titleAr={titleAr}
        descriptionEn={descEn} descriptionAr={descAr}
        jsonLd={[
          breadcrumbSchema(ar ? [{ name: "الرئيسية", url: "https://rufayq.com/ar" }, { name: "المؤسسات", url: "https://rufayq.com/ar/enterprise" }] : [{ name: "Home", url: "https://rufayq.com/" }, { name: "Enterprise", url: "https://rufayq.com/enterprise" }]),
          faqSchema(faqs),
        ]}
      />
      <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }} dir={ar ? "rtl" : "ltr"}>
        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${BG}E6`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to={ar ? "/ar" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: TEXT }}>
              <RufayQLogo size={28} />
              <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>RufayQ</span>
            </Link>
            <nav style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14 }}>
              <Link to={ar ? "/ar/pricing" : "/pricing"} style={{ color: MUTED, textDecoration: "none" }}>{ar ? "الأسعار" : "Pricing"}</Link>
              <Link to={ar ? "/ar" : "/"} style={{ color: MUTED, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <ArrowLeft size={14} /> {ar ? "الرئيسية" : "Home"}
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section style={{ padding: "80px 24px 56px", textAlign: "center" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 999, border: `1px solid ${GOLD}55`, background: `${GOLD}10`, color: GOLD, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20 }}>
              {ar ? "للمؤسسات" : "For Enterprise"}
            </div>
            <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              {ar ? "بنية رحلة العلاج، بمعايير المؤسسات." : "Medical-travel infrastructure, built for institutions."}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: MUTED, margin: "0 auto 32px", maxWidth: 680 }}>
              {ar
                ? "هل تنسّق المرضى الدوليين، أو تدير تكاليف العلاج بالخارج، أو تشغّل شبكة سياحة علاجية؟ رُفَيِّق يوفّر التطبيق والبوابة والدورة الإيرادية وعلامة بيضاء — تحت مظلّتك."
                : "Whether you coordinate international patients, manage overseas treatment spend, or operate a medical-tourism network — RufayQ ships the patient app, provider portal, RCM workflows, and white-label brand under your roof."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:enterprise@rufayq.com?subject=Enterprise%20inquiry" style={{ padding: "14px 28px", borderRadius: 999, background: GOLD, color: "#0A0F1C", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Mail size={16} /> {ar ? "تواصل مع المبيعات" : "Talk to sales"}
              </a>
              <Link to={ar ? "/ar/pricing" : "/pricing"} style={{ padding: "14px 28px", borderRadius: 999, border: `1px solid ${BORDER}`, color: TEXT, textDecoration: "none" }}>
                {ar ? "أسعار المرضى" : "See patient pricing"}
              </Link>
            </div>
            <p style={{ marginTop: 20, fontSize: 13, color: MUTED }}>
              {ar ? "تسعير مخصّص · تنفيذ ٤-١٦ أسبوعاً · استضافة سيادية متاحة" : "Custom pricing · 4–16 week implementation · sovereign hosting available"}
            </p>
          </div>
        </section>

        {/* Audiences */}
        <section style={{ padding: "40px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 40px" }}>
              {ar ? "مَن نخدم" : "Who we serve"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {AUDIENCES.map(a => {
                const Icon = a.icon;
                return (
                  <article key={a.id} style={{ padding: 24, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${TEAL}30`, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Icon size={22} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{ar ? a.titleAr : a.titleEn}</h3>
                    <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5, margin: "0 0 14px" }}>{ar ? a.blurbAr : a.blurbEn}</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {(ar ? a.bulletsAr : a.bulletsEn).map((b, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: TEXT }}>
                          <Check size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 3 }} /> {b}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bundles */}
        <section style={{ padding: "60px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 12px" }}>
              {ar ? "حزم على مستوى المؤسسات" : "Enterprise bundles"}
            </h2>
            <p style={{ textAlign: "center", color: MUTED, margin: "0 0 40px", fontSize: 15 }}>
              {ar ? "تسعير مخصّص يتمّ مشاركته بعد مكالمة الاستكشاف. لا أرقام معلّقة هنا." : "Custom pricing shared after discovery. No anchor numbers — we quote the work that fits you."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {BUNDLES.map(b => (
                <article key={b.id} style={{
                  padding: 28, background: BG2,
                  border: b.highlight ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                  borderRadius: 20, position: "relative",
                  boxShadow: b.highlight ? `0 0 40px ${GOLD}25` : "none",
                }}>
                  {b.badgeEn && (
                    <div style={{ position: "absolute", top: -12, [ar ? "right" : "left"]: 24, padding: "4px 12px", borderRadius: 999, background: GOLD, color: "#0A0F1C", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {ar ? b.badgeAr : b.badgeEn}
                    </div>
                  )}
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{ar ? b.nameAr : b.nameEn}</h3>
                  <p style={{ fontSize: 14, color: MUTED, margin: "0 0 8px", minHeight: 42 }}>{ar ? b.pitchAr : b.pitchEn}</p>
                  <p style={{ fontSize: 12, color: GOLD, margin: "0 0 20px", letterSpacing: "0.04em" }}>{ar ? b.forAr : b.forEn}</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {(ar ? b.inclusionsAr : b.inclusionsEn).map((inc, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14 }}>
                        <Check size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} /> {inc}
                      </li>
                    ))}
                  </ul>
                  <a href={`mailto:enterprise@rufayq.com?subject=${encodeURIComponent(b.nameEn + " bundle inquiry")}`} style={{
                    display: "block", textAlign: "center", padding: "12px 20px", borderRadius: 12,
                    background: b.highlight ? GOLD : "transparent",
                    color: b.highlight ? "#0A0F1C" : TEXT,
                    border: b.highlight ? "none" : `1px solid ${BORDER}`,
                    fontWeight: 600, textDecoration: "none",
                  }}>
                    {ar ? "اطلب عرض سعر" : "Request a quote"}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section style={{ padding: "40px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, textAlign: "center" }}>
            {[
              { en: "HIPAA-aligned", ar: "متوافق HIPAA" },
              { en: "Saudi PDPL", ar: "نظام حماية البيانات" },
              { en: "ISO 27001 (in-progress)", ar: "ISO 27001 (قيد الاعتماد)" },
              { en: "NPHIES-ready", ar: "جاهز لنفيس" },
            ].map((t, i) => (
              <div key={i}>
                <Shield size={20} style={{ color: GOLD, marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ar ? t.ar : t.en}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: "60px 24px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 32px" }}>
              {ar ? "الأسئلة الشائعة" : "Frequently asked"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(open ? null : i)} style={{ width: "100%", padding: 18, background: "transparent", border: "none", color: TEXT, textAlign: ar ? "right" : "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                      <span>{f.q}</span>
                      {open ? <ChevronUp size={18} style={{ color: GOLD }} /> : <ChevronDown size={18} style={{ color: MUTED }} />}
                    </button>
                    {open && <div style={{ padding: "0 18px 18px", color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section style={{ padding: "60px 24px 100px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: 40, background: `linear-gradient(135deg, ${TEAL}55, ${GOLD}25)`, border: `1px solid ${GOLD}55`, borderRadius: 24 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>
              {ar ? "هل أنت مستعد للنشر داخل مؤسستك؟" : "Ready to deploy inside your institution?"}
            </h2>
            <p style={{ color: MUTED, fontSize: 15, margin: "0 0 24px", lineHeight: 1.6 }}>
              {ar ? "احجز مكالمة استكشاف مدّتها ٣٠ دقيقة. سنشارك عرض سعر خطي خلال ٣ أيام عمل." : "Book a 30-minute discovery call. We share a written quote within 3 business days."}
            </p>
            <a href="mailto:enterprise@rufayq.com?subject=Enterprise%20discovery%20call" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 999, background: GOLD, color: "#0A0F1C", fontWeight: 600, textDecoration: "none" }}>
              <Mail size={16} /> enterprise@rufayq.com
            </a>
          </div>
        </section>

        <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "32px 24px", textAlign: "center", color: MUTED, fontSize: 13 }}>
          © {new Date().getFullYear()} RufayQ · {ar ? "كل الحقوق محفوظة" : "All rights reserved"}
        </footer>
      </div>
    </>
  );
};

export default Enterprise;
