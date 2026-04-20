import { Link } from "react-router-dom";
import { FileText, AlertTriangle, Scale, UserCheck } from "lucide-react";
import MarkdownPage from "@/components/MarkdownPage";
import { Seo } from "@/seo/Seo";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const GOLD = "#C5965A", TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)";
  const BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";

  const sections = [
    { icon: UserCheck, title: "1. Acceptance of Terms", titleAr: "قبول الشروط",
      body: <p>By creating a RufayQ account, ticking the consent checkbox during signup, or otherwise using the App, you confirm that you are at least 18 years old (or have the consent of a legal guardian) and that you accept these Terms in full, together with our <Link to="/privacy" style={{ color: GOLD }}>Privacy Policy</Link>.</p> },
    { icon: AlertTriangle, title: "2. RufayQ is NOT a Medical Service", titleAr: "ليست خدمة طبية",
      body: <>
        <p>RufayQ is an organisational and informational <strong>companion</strong>. It is <strong style={{ color: GOLD }}>not</strong>:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>A licensed medical practitioner, hospital, or pharmacy.</li>
          <li>A diagnostic tool or substitute for professional medical advice.</li>
          <li>An emergency service. <strong>For medical emergencies, contact your local emergency number immediately.</strong></li>
          <li>An airline, travel agency, or insurance company.</li>
        </ul>
        <p className="mt-3">All AI-generated responses, translations, dosage explanations, and document interpretations are for informational support only. Always verify with your treating physician before acting on any information from the App.</p>
      </> },
    { icon: FileText, title: "3. User Responsibilities", titleAr: "مسؤوليات المستخدم",
      body: <ul className="list-disc pl-5 space-y-1">
        <li>You are responsible for the accuracy of all data you enter.</li>
        <li>RufayQ does not connect to airline, hospital, or insurance back-end systems. Always confirm flight times, gates, appointments, and policies directly with the official source.</li>
        <li>You agree not to use the App to upload unlawful, infringing, or harmful content.</li>
        <li>You are responsible for keeping your device and account credentials secure.</li>
      </ul> },
    { icon: Scale, title: "4. Subscriptions, Trials & Payments", titleAr: "الاشتراكات والمدفوعات",
      body: <ul className="list-disc pl-5 space-y-1">
        <li>Free tier supports one active trip with limited AI usage.</li>
        <li>Paid tiers and pay-as-you-go add-ons are billed as displayed on the Pricing page.</li>
        <li>14-day free trial is available once per device.</li>
        <li>Refunds within 14 days of upgrade, in line with our money-back guarantee.</li>
        <li>Local taxes (VAT) may apply per your jurisdiction.</li>
      </ul> },
    { icon: Scale, title: "5. Intellectual Property", titleAr: "الملكية الفكرية",
      body: <p>All trademarks, logos, designs, AI prompts, and source code in RufayQ are the exclusive property of RufayQ or its licensors.</p> },
    { icon: AlertTriangle, title: "6. Limitation of Liability", titleAr: "حدود المسؤولية",
      body: <p>To the fullest extent permitted by Saudi law, RufayQ shall not be liable for any indirect, incidental, special, or consequential damages — including but not limited to missed flights, missed doses, or treatment outcomes — arising from your use of the App.</p> },
    { icon: Scale, title: "7. Governing Law & Dispute Resolution", titleAr: "القانون الحاكم",
      body: <p>These Terms are governed by the laws of the Kingdom of Saudi Arabia. Any dispute shall be settled by the competent courts of Riyadh, KSA.</p> },
    { icon: UserCheck, title: "8. Changes to These Terms", titleAr: "تعديل الشروط",
      body: <p>We may update these Terms from time to time. Material changes will be notified through the App at least 14 days before they take effect.</p> },
    { icon: FileText, title: "9. Contact", titleAr: "تواصل معنا",
      body: <p>
        Legal · <a href="mailto:legal@rufayq.com" style={{ color: GOLD }}>legal@rufayq.com</a><br />
        General support · <a href="mailto:support@rufayq.com" style={{ color: GOLD }}>support@rufayq.com</a><br />
        WhatsApp · <a href="https://wa.me/966569590418" style={{ color: GOLD }}>+966 56 959 0418</a>
      </p> },
  ];

  const fallback = (
    <div className="space-y-8">
      {sections.map((s, i) => (
        <section key={i} className="rounded-2xl p-7" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}>
              <s.icon size={18} color={GOLD} />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-tight" style={{ color: TEXT }}>{s.title}</h2>
              <p className="font-arabic text-xs" dir="rtl" style={{ color: MUTED }}>{s.titleAr}</p>
            </div>
          </div>
          <div className="text-sm leading-relaxed" style={{ color: MUTED }}>{s.body}</div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <Seo
        title={isAr ? "شروط الاستخدام" : "Terms of Service"}
        description={
          isAr
            ? "شروط استخدام تطبيق رُفَيِّق — مسؤوليات المستخدم، حدود الخدمة، وأحكام عامة."
            : "RufayQ Terms of Service — user responsibilities, service limitations, and general provisions."
        }
      />
      <MarkdownPage
        slug="terms"
        defaultTitle="Terms of Service"
        defaultTitleAr="شروط الاستخدام"
        fallback={fallback}
        otherLink={{ to: isAr ? "/ar/privacy" : "/privacy", label: "← Privacy" }}
      />
    </>
  );
};

export default Terms;
