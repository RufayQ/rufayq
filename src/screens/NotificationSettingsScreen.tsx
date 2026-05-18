import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Clock, Compass, Pill, Stethoscope, Volume2, Moon, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = "rufayq_settings";

const readStored = (): Record<string, any> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
};

const writeStored = (patch: Record<string, any>) => {
  const cur = readStored();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
};

const Row = ({
  icon, label, labelAr, on, onChange, disabled, color,
}: {
  icon: React.ReactNode; label: string; labelAr: string;
  on: boolean; onChange: (v: boolean) => void; disabled?: boolean; color?: string;
}) => (
  <div
    className="flex items-center justify-between py-3 px-4"
    style={{ borderBottom: "1px solid var(--gray-light)", opacity: disabled ? 0.5 : 1 }}
  >
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-[13px]" style={{ color: "var(--navy)" }}>{label}</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
    </div>
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className="w-11 h-6 rounded-full relative transition-all"
      style={{ background: on ? (color || "var(--teal-deep)") : "var(--gray-light)" }}
    >
      <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? 22 : 2 }} />
    </button>
  </div>
);

const NotificationSettingsScreen = ({ onBack }: Props) => {
  const stored = readStored();
  const [pushNotif, setPushNotif] = useState<boolean>(stored.pushNotif ?? true);
  const [journeyAlert, setJourneyAlert] = useState<boolean>(stored.journeyAlert ?? true);
  const [medReminder, setMedReminder] = useState<boolean>(stored.medReminder ?? true);
  const [followUpAlert, setFollowUpAlert] = useState<boolean>(stored.followUpAlert ?? true);
  const [appointmentAlert, setAppointmentAlert] = useState<boolean>(stored.appointmentAlert ?? true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(stored.soundEnabled ?? true);
  const [quietHours, setQuietHours] = useState<boolean>(stored.quietHours ?? false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => { writeStored({ pushNotif }); }, [pushNotif]);
  useEffect(() => { writeStored({ journeyAlert }); }, [journeyAlert]);
  useEffect(() => { writeStored({ medReminder }); }, [medReminder]);
  useEffect(() => { writeStored({ followUpAlert }); }, [followUpAlert]);
  useEffect(() => { writeStored({ appointmentAlert }); }, [appointmentAlert]);
  useEffect(() => { writeStored({ soundEnabled }); }, [soundEnabled]);
  useEffect(() => { writeStored({ quietHours }); }, [quietHours]);

  const togglePush = async (next: boolean) => {
    if (next && permission !== "granted" && permission !== "unsupported") {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          toast.error("Permission denied · تم رفض الإذن");
          return;
        }
      } catch {
        toast.error("Could not request permission · تعذر طلب الإذن");
        return;
      }
    }
    setPushNotif(next);
    toast.success(next ? "Push notifications enabled · تم التفعيل" : "Push notifications disabled · تم التعطيل");
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="relative px-5 pt-6 pb-4 flex items-center gap-3"
        style={{ background: "linear-gradient(145deg, var(--header-teal-from), var(--header-teal-to))" }}
      >
        <button onClick={onBack} className="btn-press" aria-label="Back · رجوع">
          <ArrowLeft size={20} color="white" />
        </button>
        <div className="flex-1">
          <p className="font-display text-lg text-white">Notification Settings</p>
          <p className="font-arabic text-xs" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>
            إعدادات الإشعارات
          </p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto pb-8"
        style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}
      >
        {/* Master push toggle */}
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Bell size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>PUSH · الإشعارات الفورية</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <Row
              icon={<Bell size={15} style={{ color: "var(--teal-deep)" }} />}
              label="Enable Push Notifications"
              labelAr="تفعيل الإشعارات الفورية"
              on={pushNotif && permission !== "denied"}
              onChange={togglePush}
              disabled={permission === "unsupported"}
            />
          </div>
          {permission === "denied" && (
            <p className="px-1 mt-2 text-[10px] leading-snug" style={{ color: "var(--warning)" }}>
              Notifications are blocked in your browser settings.
              <span className="font-arabic block" dir="rtl">الإشعارات محظورة في إعدادات المتصفح.</span>
            </p>
          )}
          {permission === "unsupported" && (
            <p className="px-1 mt-2 text-[10px] leading-snug" style={{ color: "var(--gray)" }}>
              Push notifications are not supported on this device.
              <span className="font-arabic block" dir="rtl">الإشعارات الفورية غير مدعومة على هذا الجهاز.</span>
            </p>
          )}
        </div>

        {/* Alert categories */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Stethoscope size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>ALERTS · التنبيهات</p>
          </div>
          <p className="px-1 mb-2 text-[10px] leading-snug" style={{ color: "var(--gray)" }}>
            Choose which categories deliver alerts on this device.
            <span className="font-arabic block" dir="rtl">اختر الفئات التي تصلك إشعاراتها على هذا الجهاز.</span>
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <Row
              icon={<Compass size={15} style={{ color: "var(--teal-mid)" }} />}
              label="Journey Alerts" labelAr="تنبيهات الرحلة"
              on={journeyAlert} onChange={setJourneyAlert} disabled={!pushNotif}
            />
            <Row
              icon={<Pill size={15} style={{ color: "var(--warning)" }} />}
              label="Medication Reminders" labelAr="تذكيرات الأدوية"
              on={medReminder} onChange={setMedReminder} disabled={!pushNotif} color="var(--warning)"
            />
            <Row
              icon={<Stethoscope size={15} style={{ color: "var(--success)" }} />}
              label="Follow-up Alerts" labelAr="تنبيهات المتابعة"
              on={followUpAlert} onChange={setFollowUpAlert} disabled={!pushNotif} color="var(--success)"
            />
            <Row
              icon={<CalendarClock size={15} style={{ color: "var(--teal-deep)" }} />}
              label="Appointment Alerts" labelAr="تنبيهات المواعيد"
              on={appointmentAlert} onChange={setAppointmentAlert} disabled={!pushNotif}
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Clock size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>DELIVERY · التسليم</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <Row
              icon={<Volume2 size={15} style={{ color: "var(--navy)" }} />}
              label="Sound" labelAr="الصوت"
              on={soundEnabled} onChange={setSoundEnabled} disabled={!pushNotif}
            />
            <Row
              icon={<Moon size={15} style={{ color: "var(--gray)" }} />}
              label="Quiet Hours (10PM–7AM)" labelAr="ساعات الهدوء (١٠م–٧ص)"
              on={quietHours} onChange={setQuietHours} disabled={!pushNotif}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsScreen;
