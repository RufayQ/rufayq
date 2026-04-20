import { useState } from "react";
import { ArrowLeft, ChevronRight, LogOut, Shield, AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { toast } from "sonner";
import MedicalHistorySheet from "@/components/MedicalHistorySheet";

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

const passportData = {
  fullName: "Mohammed Abdullah Al-Rashidi",
  fullNameAr: "محمد عبدالله الراشدي",
  passportNo: "K482916",
  nationality: "Saudi Arabian",
  nationalityAr: "سعودي",
  dob: "15 Mar 1985",
  gender: "Male",
  issueDate: "Jan 12, 2024",
  expiryDate: "Jan 11, 2034",
  issuedBy: "Kingdom of Saudi Arabia",
  bloodType: "O+",
  nationalId: "•••• •••• •••• 4821",
  nationalIdFull: "1085 3921 7462 4821",
  visaType: "Schengen — Medical (C Type)",
  visaValid: "Apr 1 – Apr 30, 2026",
  insuranceRef: "BUPA-2026-7823",
  insurancePlan: "Gold International",
  emergencyName: "Sara Al-Rashidi",
  emergencyPhone: "+966 5X XXX XXXX",
  emergencyRelation: "Spouse · زوجة",
};

const SettingRow = ({ label, labelAr, value, accent, onClick }: { label: string; labelAr?: string; value?: string; accent?: string; onClick?: () => void }) => (
  <div onClick={onClick} className="flex items-center justify-between py-3 px-4 cursor-pointer" style={{ borderBottom: "1px solid var(--gray-light)" }}>
    <div>
      <p className="text-[13px]" style={{ color: accent || "var(--navy)" }}>{label}</p>
      {labelAr && <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>}
    </div>
    <div className="flex items-center gap-1">
      {value && <span className="text-[11px]" style={{ color: "var(--gray)" }}>{value}</span>}
      <ChevronRight size={14} style={{ color: accent || "var(--gray)" }} />
    </div>
  </div>
);

const ToggleRow = ({ label, labelAr, on, color }: { label: string; labelAr?: string; on: boolean; color?: string }) => {
  const [enabled, setEnabled] = useState(on);
  return (
    <div className="flex items-center justify-between py-3 px-4" style={{ borderBottom: "1px solid var(--gray-light)" }}>
      <div>
        <p className="text-[13px]" style={{ color: "var(--navy)" }}>{label}</p>
        {labelAr && <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>}
      </div>
      <button onClick={() => setEnabled(!enabled)} className="w-11 h-6 rounded-full relative transition-all" style={{ background: enabled ? (color || "var(--teal-deep)") : "var(--gray-light)" }}>
        <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: enabled ? 22 : 2 }} />
      </button>
    </div>
  );
};

const InfoField = ({ label, value, masked, onCopy }: { label: string; value: string; masked?: boolean; onCopy?: () => void }) => {
  const [show, setShow] = useState(!masked);
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>{label}</p>
        <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
          {masked && !show ? "•••• •••• ••••" : value}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {masked && (
          <button onClick={() => setShow(!show)} className="p-1 btn-press">
            {show ? <EyeOff size={13} style={{ color: "var(--gray)" }} /> : <Eye size={13} style={{ color: "var(--gray)" }} />}
          </button>
        )}
        {onCopy && (
          <button onClick={onCopy} className="p-1 btn-press">
            <Copy size={13} style={{ color: "var(--teal-deep)" }} />
          </button>
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ onBack, onLogout }: ProfileScreenProps) => {
  const [showPassport, setShowPassport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied · تم النسخ`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-5 pt-3 pb-6 text-center" style={{ background: "var(--navy)" }}>
        <button onClick={onBack} className="absolute left-4 top-3 btn-press"><ArrowLeft size={20} color="white" /></button>

        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center font-arabic text-2xl font-bold" style={{ border: "2px solid var(--gold)", background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}>
          م
        </div>
        <p className="font-display text-xl text-white mt-2">{passportData.fullName}</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>{passportData.fullNameAr}</p>
        <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>Passport: {passportData.passportNo}</p>
        <span className="inline-block mt-2 font-mono text-[10px] px-3 py-1 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
          Active Trip — Berlin
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-6" style={{ background: "var(--off-white)" }}>
        {/* Trip Summary */}
        <div className="mx-4 mt-3 rounded-xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>CURRENT TRIP</p>
          <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--navy)" }}>Berlin, Germany — Orthopedic Surgery</p>
          <p className="font-mono text-xs mt-0.5" style={{ color: "var(--gray)" }}>Apr 8 — Apr 20, 2026</p>
          <div className="w-full h-1.5 rounded-full mt-2" style={{ background: "var(--gray-light)" }}>
            <div className="h-1.5 rounded-full" style={{ width: "58%", background: "var(--teal-bright)" }} />
          </div>
        </div>

        {/* Passport & ID Section */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>PASSPORT & IDENTITY</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <button onClick={() => setShowPassport(!showPassport)} className="w-full flex items-center justify-between py-3 px-4 btn-press" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🛂</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Saudi Passport</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>جواز السفر السعودي</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{ color: "var(--teal-deep)" }}>{passportData.passportNo}</span>
                <ChevronRight size={14} style={{ color: "var(--gray)", transform: showPassport ? "rotate(90deg)" : "none", transition: "transform 200ms" }} />
              </div>
            </button>
            
            {showPassport && (
              <div className="px-4 py-3 space-y-1" style={{ background: "var(--off-white)" }}>
                <InfoField label="FULL NAME" value={passportData.fullName} onCopy={() => copyToClipboard(passportData.fullName, "Name")} />
                <InfoField label="PASSPORT NUMBER" value={passportData.passportNo} onCopy={() => copyToClipboard(passportData.passportNo, "Passport No.")} />
                <InfoField label="NATIONALITY" value={passportData.nationality} />
                <InfoField label="DATE OF BIRTH" value={passportData.dob} />
                <InfoField label="GENDER" value={passportData.gender} />
                <InfoField label="ISSUE DATE" value={passportData.issueDate} />
                <InfoField label="EXPIRY DATE" value={passportData.expiryDate} />
                <InfoField label="BLOOD TYPE" value={passportData.bloodType} />
                
                {/* Expiry warning */}
                <div className="rounded-lg px-3 py-2 mt-2 flex items-center gap-2" style={{ background: "rgba(61,170,110,0.08)", border: "1px solid rgba(61,170,110,0.2)" }}>
                  <Shield size={13} color="#3DAA6E" />
                  <p className="text-[10px]" style={{ color: "#3DAA6E" }}>Passport valid for 7+ years — no renewal needed</p>
                </div>
              </div>
            )}

            <button onClick={() => copyToClipboard(passportData.nationalIdFull, "National ID")} className="w-full flex items-center justify-between py-3 px-4 btn-press" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🪪</span>
                <div className="text-left">
                  <p className="text-[13px]" style={{ color: "var(--navy)" }}>National ID</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>الهوية الوطنية</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>{passportData.nationalId}</span>
                <Copy size={11} style={{ color: "var(--teal-deep)", opacity: 0.5 }} />
              </div>
            </button>

            <div className="flex items-center justify-between py-3 px-4" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🛂</span>
                <div>
                  <p className="text-[13px]" style={{ color: "var(--navy)" }}>Schengen Visa</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>تأشيرة شنغن</p>
                </div>
              </div>
              <span className="font-mono text-[10px]" style={{ color: "var(--teal-deep)" }}>{passportData.visaValid}</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>EMERGENCY CONTACT</p>
          <div className="rounded-xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-arabic text-sm font-bold" style={{ background: "rgba(217,79,79,0.1)", color: "#D94F4F" }}>س</div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{passportData.emergencyName}</p>
                <p className="text-[11px]" style={{ color: "var(--gray)" }}>{passportData.emergencyRelation}</p>
                <button onClick={() => copyToClipboard(passportData.emergencyPhone, "Phone")} className="font-mono text-[11px] flex items-center gap-1 btn-press" style={{ color: "var(--teal-deep)" }}>
                  {passportData.emergencyPhone} <Copy size={10} style={{ opacity: 0.5 }} />
                </button>
              </div>
              <button className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white btn-press" style={{ background: "#D94F4F" }}>
                Call · اتصل
              </button>
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>INSURANCE</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <button onClick={() => copyToClipboard(passportData.insuranceRef, "Insurance Ref")} className="w-full flex items-center justify-between py-3 px-4 btn-press" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Bupa International</p>
                  <p className="text-[10px]" style={{ color: "var(--gray)" }}>{passportData.insurancePlan}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px]" style={{ color: "var(--gold)" }}>{passportData.insuranceRef}</span>
                <Copy size={11} style={{ color: "var(--teal-deep)", opacity: 0.5 }} />
              </div>
            </button>
          </div>
        </div>

        {/* Medical */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>MEDICAL</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <SettingRow label="Past Medical History" labelAr="التاريخ المرضي السابق" value="View / Edit" onClick={() => setShowHistory(true)} />
            <SettingRow label="Surgical History" labelAr="التاريخ الجراحي" value="View / Edit" onClick={() => setShowHistory(true)} />
            <SettingRow label="Family History" labelAr="التاريخ العائلي" value="View / Edit" onClick={() => setShowHistory(true)} />
            <SettingRow label="Allergies" labelAr="الحساسية" value="None recorded" />
            <SettingRow label="Blood Type" labelAr="فصيلة الدم" value={passportData.bloodType} />
          </div>
        </div>

        {/* Legal */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>LEGAL</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <SettingRow label="Privacy Policy" labelAr="سياسة الخصوصية" />
            <SettingRow label="PDPL Compliance" labelAr="الامتثال لنظام حماية البيانات" />
            <SettingRow label="Terms of Service" labelAr="شروط الخدمة" />
          </div>
        </div>

        {/* Support */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>SUPPORT</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <SettingRow label="Contact RufayQ Team" labelAr="تواصل مع فريق رُفَيِّق" />
            <SettingRow label="Emergency: Call Coordinator" labelAr="طوارئ: اتصل بالمنسق" accent="var(--error)" />
            <SettingRow label="Rate the App" labelAr="قيّم التطبيق" />
          </div>
        </div>

        {/* Preferences */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>PREFERENCES</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div className="flex items-center justify-between py-3 px-4" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div>
                <p className="text-[13px]" style={{ color: "var(--navy)" }}>Language</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>اللغة</p>
              </div>
              <span className="font-arabic text-xs" style={{ color: "var(--teal-deep)" }}>العربية / Arabic</span>
            </div>
            <ToggleRow label="Notifications" labelAr="الإشعارات" on={true} />
            <ToggleRow label="Biometric Login" labelAr="تسجيل الدخول البيومتري" on={true} />
            <ToggleRow label="Dark Mode" labelAr="الوضع الداكن" on={false} />
            <ToggleRow label="Share Data with Care Team" labelAr="مشاركة البيانات مع فريق الرعاية" on={true} color="var(--gold)" />
          </div>
        </div>

        {/* Sign Out */}
        <div className="mx-4 mt-6">
          <button onClick={onLogout} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 btn-press" style={{ background: "var(--white)", border: "1px solid var(--error)", color: "var(--error)" }}>
            <LogOut size={16} /> Sign Out · تسجيل الخروج
          </button>
        </div>

        <p className="text-center font-mono text-[9px] mt-4 pb-4" style={{ color: "var(--gray)" }}>
          RufayQ v1.0 · April 2026
        </p>
      </div>

      {showHistory && <MedicalHistorySheet onClose={() => setShowHistory(false)} />}
    </div>
  );
};

export default ProfileScreen;
