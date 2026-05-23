/**
 * MedicalDisclaimer — Saudi-patient-friendly disclaimer in EN + AR with a
 * "Learn more" link to /privacy (covers data, scope, MoH compliance note).
 * RufayQ is a companion for treatment-abroad logistics, not a substitute
 * for licensed clinical care.
 */
import { ShieldAlert, ExternalLink } from "lucide-react";

const MedicalDisclaimer = ({ href = "/privacy" }: { href?: string }) => (
  <div className="mt-4 mx-4">
    <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>DISCLAIMER · إخلاء مسؤولية</p>
    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(197,150,90,0.06), rgba(11,26,42,0.04))", border: "1px solid var(--gray-light)" }}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}>
          <ShieldAlert size={16} />
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--navy)" }}>
            RufayQ supports Saudi patients traveling for treatment with logistics,
            records, and guidance. It does <strong>not</strong> provide medical
            diagnosis, prescriptions, or replace your treating physician, MoH
            referral, or licensed healthcare provider. In an emergency call
            <strong> 997</strong> (KSA) or local emergency services.
          </p>
          <p className="font-arabic text-[12px] leading-relaxed" dir="rtl" style={{ color: "var(--navy)" }}>
            رُفَيِّق يساعد المرضى السعوديين المسافرين للعلاج في تنظيم الرحلة
            والسجلات والإرشاد العام، ولا يُغني عن استشارة الطبيب المعالج أو
            الإحالة الرسمية من وزارة الصحة ولا يُقدّم تشخيصاً أو وصفات طبية.
            في الحالات الطارئة اتصل بـ <strong>997</strong> أو خدمات الطوارئ المحلية.
          </p>
          <a href={href} className="inline-flex items-center gap-1.5 text-[11px] font-bold mt-1 btn-press" style={{ color: "var(--teal-deep)" }}>
            Learn more · اعرف المزيد <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default MedicalDisclaimer;
