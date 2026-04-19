import { Link } from "react-router-dom";
import { Shield, Lock, Globe, FileCheck } from "lucide-react";
import MarkdownPage from "@/components/MarkdownPage";

const Privacy = () => {
  const GOLD = "#C5965A", TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)";
  const BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.12)";

  const sections = [
    { icon: Shield, title: "1. Regulatory Compliance", titleAr: "الامتثال التنظيمي",
      body: (
        <>
          <p>RufayQ is designed to comply with the following data-protection and patient-privacy frameworks relevant to our users in Saudi Arabia, the GCC, and international medical destinations:</p>
          <ul className="list-disc pl-5 mt-3 space-y-1.5">
            <li><strong style={{ color: GOLD }}>KSA — Personal Data Protection Law (PDPL)</strong> issued by SDAIA, Royal Decree M/19, and its Executive Regulations.</li>
            <li><strong style={{ color: GOLD }}>KSA — National Cybersecurity Authority (NCA)</strong> Essential Cybersecurity Controls (ECC-1:2018).</li>
            <li><strong style={{ color: GOLD }}>KSA — Ministry of Health</strong> e-Health regulations & National Health Information Exchange standards.</li>
            <li><strong style={{ color: GOLD }}>UAE — Federal Decree-Law No. 45 of 2021</strong> (PDPL) and Dubai Health Authority (DHA) patient confidentiality regulations (Law No. 6 of 2018 — DHA Health Information).</li>
            <li><strong style={{ color: GOLD }}>USA — HIPAA</strong> (Health Insurance Portability and Accountability Act, 45 CFR Parts 160, 162 & 164) for users connected to U.S. providers.</li>
            <li><strong style={{ color: GOLD }}>EU — GDPR</strong> Articles 6 & 9 covering special categories of personal health data, applied for users treated in EU jurisdictions.</li>
          </ul>
        </>
      ) },
    { icon: Lock, title: "2. Data We Collect", titleAr: "البيانات التي نجمعها",
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Identity:</strong> full name (EN/AR), Saudi National ID or passport number, date of birth, gender, nationality.</li>
          <li><strong>Contact:</strong> mobile number, email address, emergency contact.</li>
          <li><strong>Health data (special category):</strong> medical history, allergies, chronic conditions, current medications, blood type, prescriptions, lab results, imaging, discharge summaries, treatment plans.</li>
          <li><strong>Travel data:</strong> flight tickets, hotel bookings, hospital appointments, treating physicians, companions.</li>
          <li><strong>Technical:</strong> device identifier, app usage logs, crash reports.</li>
        </ul>
      ) },
    { icon: Globe, title: "3. How We Use Your Data", titleAr: "كيف نستخدم بياناتك",
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To organize your treatment journey (tickets, medications, appointments, records).</li>
          <li>To provide AI-assisted bilingual translation and explanation of your medical documents — without sharing identifying data with the AI provider beyond the minimum required.</li>
          <li>To send you reminders for medications, appointments, and travel events.</li>
          <li>To deliver customer support and respond to enquiries.</li>
          <li>RufayQ <strong style={{ color: GOLD }}>never sells</strong> your personal or medical data and does not use it for advertising.</li>
        </ul>
      ) },
    { icon: FileCheck, title: "4. Your Rights", titleAr: "حقوقك",
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Right of access:</strong> request a copy of all data we hold about you.</li>
          <li><strong>Right of rectification:</strong> correct inaccurate or incomplete data.</li>
          <li><strong>Right of erasure ("right to be forgotten"):</strong> request permanent deletion, subject to legal retention obligations.</li>
          <li><strong>Right to data portability:</strong> export your data in a machine-readable format.</li>
          <li><strong>Right to withdraw consent</strong> for processing of health data at any time.</li>
          <li><strong>Right to lodge a complaint</strong> with the relevant supervisory authority (SDAIA in KSA, UAE Data Office, EU DPA, or HHS OCR in the U.S.).</li>
          <li>Contact our Data Protection Officer at <a href="mailto:dpo@rufayq.com" style={{ color: GOLD }}>dpo@rufayq.com</a>.</li>
        </ul>
      ) },
    { icon: Shield, title: "5. Security & Encryption", titleAr: "الأمان والتشفير",
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li>All data in transit is protected with TLS 1.3.</li>
          <li>All data at rest is encrypted with AES-256.</li>
          <li>Access is restricted via role-based authentication and audit logging.</li>
          <li>Cloud infrastructure is hosted on certified providers (ISO 27001, SOC 2 Type II).</li>
          <li>We perform regular vulnerability assessments aligned with NCA ECC-1 controls.</li>
        </ul>
      ) },
    { icon: Globe, title: "6. International Data Transfers", titleAr: "نقل البيانات الدولي",
      body: <p>Where your treatment is in a country outside KSA, transfer of your medical data to that destination is performed only with your explicit consent and in line with PDPL Article 29 and GDPR Chapter V safeguards (Standard Contractual Clauses or equivalent).</p> },
    { icon: FileCheck, title: "7. Retention", titleAr: "مدة الاحتفاظ",
      body: <p>Personal and medical data is retained while your account is active and for up to 7 years thereafter, in line with KSA medical-record retention requirements. You may request earlier deletion at any time.</p> },
    { icon: Shield, title: "8. Contact", titleAr: "تواصل معنا",
      body: (
        <p>
          Data Protection Officer · <a href="mailto:dpo@rufayq.com" style={{ color: GOLD }}>dpo@rufayq.com</a><br />
          General support · <a href="mailto:support@rufayq.com" style={{ color: GOLD }}>support@rufayq.com</a><br />
          WhatsApp · <a href="https://wa.me/966569590418" style={{ color: GOLD }}>+966 56 959 0418</a>
        </p>
      ) },
  ];

  const fallback = (
    <>
      <div className="rounded-2xl p-6 mb-10" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
        <p className="text-sm leading-relaxed" style={{ color: TEXT }}>
          RufayQ ("we", "us", "the App") is a bilingual AI medical companion built for patients traveling abroad for treatment. We treat your personal data — and especially your <em style={{ color: GOLD }}>health data</em> — with the highest level of confidentiality and security.
        </p>
      </div>
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
    </>
  );

  return (
    <MarkdownPage
      slug="privacy"
      defaultTitle="Privacy Policy"
      defaultTitleAr="سياسة الخصوصية"
      fallback={fallback}
      otherLink={{ to: "/terms", label: "Terms →" }}
    />
  );
};

export default Privacy;
