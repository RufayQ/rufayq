import { useState } from "react";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import LogoMark from "@/components/LogoMark";

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

const SettingRow = ({ label, labelAr, value, accent }: { label: string; labelAr?: string; value?: string; accent?: string }) => (
  <div className="flex items-center justify-between py-3 px-4 cursor-pointer" style={{ borderBottom: "1px solid var(--gray-light)" }}>
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

const ProfileScreen = ({ onBack, onLogout }: ProfileScreenProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-5 pt-3 pb-6 text-center" style={{ background: "var(--navy)" }}>
        <button onClick={onBack} className="absolute left-4 top-3 btn-press"><ArrowLeft size={20} color="white" /></button>

        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center font-arabic text-2xl font-bold" style={{ border: "2px solid var(--gold)", background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}>
          م
        </div>
        <p className="font-display text-xl text-white mt-2">Mohammed Al-Rashidi</p>
        <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>محمد الراشدي</p>
        <p className="font-mono text-[11px] mt-1" style={{ color: "var(--gold)" }}>ID: •••• •••• ••••</p>
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

        {/* Sections */}
        {[
          {
            title: "ACCOUNT",
            rows: [
              { label: "Personal Information", labelAr: "المعلومات الشخصية" },
              { label: "Saudi ID / Passport", labelAr: "الهوية / الجواز" },
              { label: "Insurance Details", labelAr: "تفاصيل التأمين" },
              { label: "Emergency Contact", labelAr: "جهة الاتصال الطارئة" },
            ],
          },
          {
            title: "MEDICAL",
            rows: [
              { label: "Medical History", labelAr: "التاريخ الطبي" },
              { label: "Allergies", labelAr: "الحساسية", value: "None recorded" },
              { label: "Blood Type", labelAr: "فصيلة الدم", value: "O+" },
            ],
          },
          {
            title: "LEGAL",
            rows: [
              { label: "Privacy Policy", labelAr: "سياسة الخصوصية" },
              { label: "PDPL Compliance", labelAr: "الامتثال لنظام حماية البيانات" },
              { label: "Terms of Service", labelAr: "شروط الخدمة" },
            ],
          },
          {
            title: "SUPPORT",
            rows: [
              { label: "Contact RufayQ Team", labelAr: "تواصل مع فريق رُفَيِّق" },
              { label: "Emergency: Call Coordinator", labelAr: "طوارئ: اتصل بالمنسق", accent: "var(--error)" },
              { label: "Rate the App", labelAr: "قيّم التطبيق" },
            ],
          },
        ].map((section) => (
          <div key={section.title} className="mt-4 mx-4">
            <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>{section.title}</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              {section.rows.map((row) => (
                <SettingRow key={row.label} {...row} />
              ))}
            </div>
          </div>
        ))}

        {/* Preferences with toggles */}
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
    </div>
  );
};

export default ProfileScreen;
