import MarkdownPage from "@/components/MarkdownPage";
import { Seo } from "@/seo/Seo";
import { useLanguage } from "@/contexts/LanguageContext";

const Security = () => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  return (
  <>
    <Seo
      title={isAr ? "الأمن والامتثال" : "Security & Compliance"}
      description={
        isAr
          ? "ممارسات الأمن، التشفير، والامتثال (PDPL، HIPAA) في رُفَيِّق."
          : "RufayQ security practices: encryption, regulatory alignment (PDPL, HIPAA), incident response, and audit posture."
      }
    />
    <MarkdownPage
    slug="security"
    defaultTitle="Security & Compliance"
    defaultTitleAr="الأمن والامتثال"
    otherLink={{ to: "/privacy", label: "Privacy Policy" }}
    fallback={
      <div className="rounded-2xl p-8" style={{ background: "#0B1A28", border: "1px solid rgba(197,150,90,0.12)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(232,236,240,0.75)" }}>
          Our Security & Compliance documentation is being finalised. This page will outline our data
          protection practices, encryption standards, regulatory alignment (PDPL, HIPAA-style controls),
          incident response, and audit posture.
        </p>
      </div>
    }
  />
);

export default Security;
