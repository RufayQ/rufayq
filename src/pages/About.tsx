import { Link } from "react-router-dom";
import { Seo } from "@/seo/Seo";
import { useLanguage } from "@/contexts/LanguageContext";
import { personSchema, AUTHORS } from "@/seo/schema";
import RufayQLogo from "@/components/RufayQLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const t = {
  en: {
    title: "About RufayQ — Built by clinicians and patients, for patients",
    description:
      "RufayQ is the bilingual AI companion for Gulf patients travelling abroad for treatment. Founded by Dr. Abdelrahman Morsy and Sara Aljandal.",
    h1: "About RufayQ",
    intro:
      "RufayQ exists because medical travel is hard, lonely, and expensive — and the tools patients are given are not built for them. We are building the companion we wish our families had.",
    missionH: "Our mission",
    missionP:
      "Make every step of a patient's medical journey — from first symptom to final follow-up — clearer, calmer, and bilingually accessible across English and Arabic.",
    teamH: "The founders",
    morsyP:
      "Dr. Abdelrahman Morsy is a physician with cross-border medical-tourism experience. He leads RufayQ's clinical content, partnerships with hospitals, and the medical-consultant program.",
    saraP:
      "Sara Aljandal is a product builder focused on patient experience. She leads RufayQ's product, design, and bilingual UX research with patients across Saudi Arabia and the Gulf.",
    contactH: "Talk to us",
    contactP: "Email us at hello@rufayq.com or message us on WhatsApp at +966 56 959 0418.",
    backHome: "← Back to home",
  },
  ar: {
    title: "عن رُفَيِّق — مبني من قِبَل أطباء ومرضى، للمرضى",
    description:
      "رُفَيِّق هو الرفيق الطبي ثنائي اللغة (عربي/إنجليزي) لمرضى الخليج المسافرين للعلاج خارج بلدانهم. أسسه د. عبدالرحمن مرسي وسارة الجندل.",
    h1: "عن رُفَيِّق",
    intro:
      "رُفَيِّق وُلد لأن السفر للعلاج صعب، مُرهِق، ومُكلِف — والأدوات الحالية لم تُصمَّم لخدمة المريض. نحن نبني الرفيق الذي تمنّينا أن تجده عائلاتنا.",
    missionH: "مهمتنا",
    missionP:
      "أن نجعل كل خطوة من رحلتك العلاجية — من أول عَرَض إلى آخر متابعة — أوضح، أهدأ، وثنائية اللغة عربي/إنجليزي.",
    teamH: "المؤسسون",
    morsyP:
      "د. عبدالرحمن مرسي طبيب لديه خبرة عبر الحدود في السياحة العلاجية. يقود المحتوى الطبي، الشراكات مع المستشفيات، وبرنامج المستشار الطبي في رُفَيِّق.",
    saraP:
      "سارة الجندل خبيرة منتجات تركّز على تجربة المريض. تقود المنتج، التصميم، وأبحاث تجربة المستخدم ثنائية اللغة مع مرضى من السعودية والخليج.",
    contactH: "تواصل معنا",
    contactP: "راسلنا على hello@rufayq.com أو واتساب +966 56 959 0418.",
    backHome: "→ العودة للرئيسية",
  },
};

const About = () => {
  const { mode } = useLanguage();
  const lang = mode === "ar" ? "ar" : "en";
  const c = t[lang];
  const isAr = lang === "ar";

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: c.h1,
      description: c.description,
      inLanguage: lang,
    },
    personSchema("drMorsy", isAr ? "/ar/about" : "/about", c.morsyP),
    personSchema("saraAljandal", isAr ? "/ar/about" : "/about", c.saraP),
  ];

  return (
    <>
      <Seo title={c.title} description={c.description} jsonLd={ld} />
      <div style={{ background: "#06101A", color: "#E8ECF0", minHeight: "100vh" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(232,236,240,0.08)",
          }}
        >
          <Link to={isAr ? "/ar" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <RufayQLogo size={32} />
            <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>RufayQ</span>
          </Link>
          <LanguageSwitcher />
        </header>

        <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 120px", direction: isAr ? "rtl" : "ltr" }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "#C5965A",
              background: "rgba(197,150,90,0.08)",
              border: "1px solid rgba(197,150,90,0.2)",
              marginBottom: 24,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {isAr ? "عَنّا" : "ABOUT"}
          </span>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 24px",
              fontFamily: isAr ? "'Noto Naskh Arabic', serif" : "'Cormorant Garamond', serif",
            }}
          >
            {c.h1}
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.65, color: "rgba(232,236,240,0.75)", margin: "0 0 48px" }}>
            {c.intro}
          </p>

          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", color: "#C5965A" }}>{c.missionH}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(232,236,240,0.8)", margin: 0 }}>{c.missionP}</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px", color: "#C5965A" }}>{c.teamH}</h2>

            <article style={{ marginBottom: 32, padding: 24, background: "rgba(232,236,240,0.03)", borderRadius: 12, border: "1px solid rgba(232,236,240,0.06)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>
                {isAr ? "د. عبدالرحمن مرسي" : "Dr. Abdelrahman Morsy"}
              </h3>
              <p style={{ fontSize: 12, color: "#C5965A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
                {isAr ? "كبير المسؤولين الطبيين" : "Chief Medical Officer"}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(232,236,240,0.75)", margin: 0 }}>{c.morsyP}</p>
            </article>

            <article style={{ padding: 24, background: "rgba(232,236,240,0.03)", borderRadius: 12, border: "1px solid rgba(232,236,240,0.06)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>
                {isAr ? "سارة الجندل" : "Sara Aljandal"}
              </h3>
              <p style={{ fontSize: 12, color: "#C5965A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
                {isAr ? "شريك مؤسس" : "Co-founder"}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(232,236,240,0.75)", margin: 0 }}>{c.saraP}</p>
            </article>
          </section>

          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 12px", color: "#C5965A" }}>{c.contactH}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(232,236,240,0.8)", margin: 0 }}>{c.contactP}</p>
          </section>

          <Link
            to={isAr ? "/ar" : "/"}
            style={{ display: "inline-block", marginTop: 56, color: "#C5965A", textDecoration: "none", fontSize: 14 }}
          >
            {c.backHome}
          </Link>
        </main>
      </div>
    </>
  );
};

export default About;
