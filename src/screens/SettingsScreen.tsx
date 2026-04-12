import { useState } from "react";
import { ArrowLeft, Globe, Bell, Moon, Sun, Smartphone, Share2, Volume2, Clock, Shield, Palette } from "lucide-react";
import { toast } from "sonner";

interface SettingsScreenProps {
  onBack: () => void;
}

const ToggleRow = ({
  icon, label, labelAr, on, onChange, color,
}: {
  icon: React.ReactNode; label: string; labelAr: string; on: boolean; onChange: (v: boolean) => void; color?: string;
}) => (
  <div className="flex items-center justify-between py-3 px-4" style={{ borderBottom: "1px solid var(--gray-light)" }}>
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-[13px]" style={{ color: "var(--navy)" }}>{label}</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full relative transition-all"
      style={{ background: on ? (color || "var(--teal-deep)") : "var(--gray-light)" }}
    >
      <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? 22 : 2 }} />
    </button>
  </div>
);

const RadioOption = ({
  label, labelAr, selected, onSelect,
}: {
  label: string; labelAr: string; selected: boolean; onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className="w-full flex items-center justify-between py-3 px-4 btn-press"
    style={{ borderBottom: "1px solid var(--gray-light)" }}
  >
    <div>
      <p className="text-[13px]" style={{ color: "var(--navy)" }}>{label}</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
    </div>
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ border: `2px solid ${selected ? "var(--teal-deep)" : "var(--gray-light)"}` }}
    >
      {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--teal-deep)" }} />}
    </div>
  </button>
);

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const stored = JSON.parse(localStorage.getItem("rufayq_settings") || "{}");

  const [language, setLanguage] = useState(stored.language ?? "bilingual");
  const [theme, setTheme] = useState(stored.theme ?? "light");
  const [pushNotif, setPushNotif] = useState(stored.pushNotif ?? true);
  const [medReminder, setMedReminder] = useState(stored.medReminder ?? true);
  const [appointmentAlert, setAppointmentAlert] = useState(stored.appointmentAlert ?? true);
  const [soundEnabled, setSoundEnabled] = useState(stored.soundEnabled ?? true);
  const [quietHours, setQuietHours] = useState(stored.quietHours ?? false);
  const [biometric, setBiometric] = useState(stored.biometric ?? true);
  const [autoBackup, setAutoBackup] = useState(stored.autoBackup ?? true);

  const update = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => {
    setter(val);
    const current = JSON.parse(localStorage.getItem("rufayq_settings") || "{}");
    localStorage.setItem("rufayq_settings", JSON.stringify({ ...current, [key]: val }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 flex items-center gap-3" style={{ background: "linear-gradient(145deg, #004D5B, #006D7C)" }}>
        <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
        <div className="flex-1">
          <p className="font-display text-lg text-white">Settings</p>
          <p className="font-arabic text-xs" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>الإعدادات</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>

        {/* Language */}
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Globe size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>LANGUAGE · اللغة</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <RadioOption label="English Only" labelAr="الإنجليزية فقط" selected={language === "en"} onSelect={() => update("language", setLanguage)("en")} />
            <RadioOption label="العربية فقط" labelAr="Arabic Only" selected={language === "ar"} onSelect={() => update("language", setLanguage)("ar")} />
            <RadioOption label="Bilingual · ثنائي اللغة" labelAr="الإنجليزية والعربية" selected={language === "bilingual"} onSelect={() => update("language", setLanguage)("bilingual")} />
          </div>
        </div>

        {/* Notifications */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Bell size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>NOTIFICATIONS · الإشعارات</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ToggleRow
              icon={<Bell size={15} style={{ color: "var(--teal-deep)" }} />}
              label="Push Notifications" labelAr="الإشعارات الفورية"
              on={pushNotif} onChange={(v) => { update("pushNotif", setPushNotif)(v); toast(v ? "Notifications enabled · الإشعارات مفعلة" : "Notifications disabled · الإشعارات معطلة"); }}
            />
            <ToggleRow
              icon={<Clock size={15} style={{ color: "var(--warning)" }} />}
              label="Medication Reminders" labelAr="تذكيرات الأدوية"
              on={medReminder} onChange={update("medReminder", setMedReminder)} color="var(--warning)"
            />
            <ToggleRow
              icon={<Share2 size={15} style={{ color: "var(--teal-mid)" }} />}
              label="Appointment Alerts" labelAr="تنبيهات المواعيد"
              on={appointmentAlert} onChange={update("appointmentAlert", setAppointmentAlert)}
            />
            <ToggleRow
              icon={<Volume2 size={15} style={{ color: "var(--navy)" }} />}
              label="Sound" labelAr="الصوت"
              on={soundEnabled} onChange={update("soundEnabled", setSoundEnabled)}
            />
            <ToggleRow
              icon={<Moon size={15} style={{ color: "var(--gray)" }} />}
              label="Quiet Hours (10PM–7AM)" labelAr="ساعات الهدوء (١٠م–٧ص)"
              on={quietHours} onChange={update("quietHours", setQuietHours)}
            />
          </div>
        </div>

        {/* Theme / Appearance */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Palette size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>APPEARANCE · المظهر</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <RadioOption
              label="Light Mode" labelAr="الوضع الفاتح"
              selected={theme === "light"} onSelect={() => setTheme("light")}
            />
            <RadioOption
              label="Dark Mode" labelAr="الوضع الداكن"
              selected={theme === "dark"} onSelect={() => setTheme("dark")}
            />
            <RadioOption
              label="System Default" labelAr="حسب النظام"
              selected={theme === "system"} onSelect={() => setTheme("system")}
            />
          </div>
          <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--gray)" }}>
            Theme changes will apply in a future update · سيتم تطبيق تغييرات المظهر في تحديث قادم
          </p>
        </div>

        {/* Security & Privacy */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Shield size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>SECURITY · الأمان</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ToggleRow
              icon={<Smartphone size={15} style={{ color: "var(--teal-deep)" }} />}
              label="Biometric Login" labelAr="تسجيل الدخول البيومتري"
              on={biometric} onChange={setBiometric}
            />
            <ToggleRow
              icon={<Shield size={15} style={{ color: "var(--success)" }} />}
              label="Auto Backup" labelAr="نسخ احتياطي تلقائي"
              on={autoBackup} onChange={setAutoBackup} color="var(--success)"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mx-4 mt-6">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm btn-press"
            style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}
          >
            Save Changes · حفظ التغييرات
          </button>
        </div>

        <p className="text-center font-mono text-[9px] mt-4" style={{ color: "var(--gray)" }}>
          RufayQ v1.0 · Settings
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
