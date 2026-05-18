import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Bell, Moon, Sun, Smartphone, Share2, Volume2, Clock, Shield, Palette, ExternalLink, FileText, CreditCard, Mail, LifeBuoy, Sparkles, PlayCircle, CalendarClock, Plane, Hotel, Pill, Scan, FlaskConical, RotateCcw, Wallet, MessageSquare, AtSign, Phone, ChevronRight } from "lucide-react";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import { toast } from "sonner";
import { useLanguage, type LangMode } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { biometric } from "@/lib/native/biometric";
import { TOURS, clearTourDone } from "@/lib/tours";
import TourRunner from "@/components/TourRunner";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGuestCategories, type GuestCategory } from "@/hooks/useGuestCategories";

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
  const [subscreen, setSubscreen] = useState<null | "notifications">(null);
  if (subscreen === "notifications") {
    return <NotificationSettingsScreen onBack={() => setSubscreen(null)} />;
  }
  const { mode: langMode, setMode: setLangMode } = useLanguage();
  const isGuest = useGuestMode();
  const { categories: guestCats, setCategory: setGuestCat, resetAll: resetGuestCats } = useGuestCategories();

  const applyThemeNow = (t: string) => {
    const root = document.documentElement;
    if (t === "system") {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      root.classList.toggle("dark", t === "dark");
    }
  };

  // Map LanguageContext mode <-> Settings radio (single source of truth)
  const langRadio: "en" | "ar" | "bilingual" = langMode === "both" ? "bilingual" : langMode;
  const pickLang = (v: "en" | "ar" | "bilingual") => {
    const next: LangMode = v === "bilingual" ? "both" : v;
    setLangMode(next);
  };
  const [theme, setTheme] = useState(stored.theme ?? "light");
  const [pushNotif, setPushNotif] = useState(stored.pushNotif ?? true);
  const [medReminder, setMedReminder] = useState(stored.medReminder ?? true);
  const [appointmentAlert, setAppointmentAlert] = useState(stored.appointmentAlert ?? true);
  const [soundEnabled, setSoundEnabled] = useState(stored.soundEnabled ?? true);
  const [quietHours, setQuietHours] = useState(stored.quietHours ?? false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [autoBackup, setAutoBackup] = useState(stored.autoBackup ?? true);
  const [replayTourId, setReplayTourId] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [discoverByEmail, setDiscoverByEmail] = useState(false);
  const [discoverByPhone, setDiscoverByPhone] = useState(false);
  const [discoverEmail, setDiscoverEmail] = useState<string | null>(null);
  const [discoverPhone, setDiscoverPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUid(session?.user?.id || null);
    });
    (async () => {
      const [avail, enrolled] = await Promise.all([biometric.isAvailable(), biometric.isEnrolled()]);
      setBiometricAvailable(avail);
      setBiometricOn(enrolled);
    })();
    (async () => {
      const { data, error } = await supabase.rpc("get_chat_discovery");
      if (!error && Array.isArray(data) && data[0]) {
        setDiscoverByEmail(!!data[0].discoverable_by_email);
        setDiscoverByPhone(!!data[0].discoverable_by_phone);
        setDiscoverEmail(data[0].email ?? null);
        setDiscoverPhone(data[0].phone ?? null);
      }
    })();
  }, []);

  const toggleDiscovery = async (kind: "email" | "phone", next: boolean) => {
    const byEmail = kind === "email" ? next : discoverByEmail;
    const byPhone = kind === "phone" ? next : discoverByPhone;
    if (kind === "email" && next && !discoverEmail) {
      toast.error("Add an email to your profile first · أضف بريدك في الملف أولاً");
      return;
    }
    if (kind === "phone" && next && !discoverPhone) {
      toast.error("Add a phone to your profile first · أضف رقم هاتفك في الملف أولاً");
      return;
    }
    const { error } = await supabase.rpc("set_chat_discovery", { _by_email: byEmail, _by_phone: byPhone });
    if (error) { toast.error("Could not update · تعذر التحديث"); return; }
    if (kind === "email") setDiscoverByEmail(next); else setDiscoverByPhone(next);
    toast.success(next ? "Discoverable · مرئي" : "Hidden · مخفي");
  };

  const toggleBiometric = async (next: boolean) => {
    if (!biometricAvailable) {
      toast.error("Biometric not available on this device · غير متاح على هذا الجهاز");
      return;
    }
    if (next) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Sign in first to enable biometrics · سجّل دخولك أولاً");
        return;
      }
      const ok = await biometric.enroll(session.user.id, session.user.email || "RufayQ");
      if (ok) {
        setBiometricOn(true);
        toast.success("Biometric enabled · تم التفعيل");
      } else {
        toast.info("Biometric setup cancelled · تم الإلغاء");
      }
    } else {
      await biometric.clear();
      setBiometricOn(false);
      toast.success("Biometric disabled · تم التعطيل");
    }
  };

  const replayableTours = TOURS.filter((t) => t.steps.length > 0);
  const activeReplayTour = replayTourId ? TOURS.find((t) => t.id === replayTourId) : null;

  const update = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) => (val: T) => {
    setter(val);
    const current = JSON.parse(localStorage.getItem("rufayq_settings") || "{}");
    localStorage.setItem("rufayq_settings", JSON.stringify({ ...current, [key]: val }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative px-5 pt-6 pb-4 flex items-center gap-3" style={{ background: "linear-gradient(145deg, var(--header-teal-from), var(--header-teal-to))" }}>
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
            <RadioOption label="English Only" labelAr="الإنجليزية فقط" selected={langRadio === "en"} onSelect={() => pickLang("en")} />
            <RadioOption label="العربية فقط" labelAr="Arabic Only" selected={langRadio === "ar"} onSelect={() => pickLang("ar")} />
            <RadioOption label="Bilingual · ثنائي اللغة" labelAr="الإنجليزية والعربية" selected={langRadio === "bilingual"} onSelect={() => pickLang("bilingual")} />
          </div>
        </div>

        {/* Guest Mode — per-category demo data toggles */}
        {isGuest && (
          <div className="mx-4 mt-5">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-2">
                <Sparkles size={13} style={{ color: "var(--gold)" }} />
                <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>GUEST DEMO DATA · بيانات تجريبية</p>
              </div>
              <button
                onClick={() => { resetGuestCats(); toast.success("Demo data reset · أُعيد التعيين"); }}
                className="flex items-center gap-1 text-[10px] btn-press"
                style={{ color: "var(--teal-deep)" }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
            <p className="px-1 mb-2 text-[10px] leading-snug" style={{ color: "var(--gray)" }}>
              Toggle dummy data per category. Affects guest mode only.
              <span className="font-arabic block" dir="rtl">تفعيل/تعطيل البيانات التجريبية لكل فئة في وضع الضيف.</span>
            </p>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              {([
                { key: "appointments" as GuestCategory, icon: <CalendarClock size={15} style={{ color: "var(--teal-deep)" }} />, label: "Appointments", labelAr: "المواعيد" },
                { key: "tickets" as GuestCategory, icon: <Plane size={15} style={{ color: "var(--teal-mid)" }} />, label: "Tickets (Flights/Trains)", labelAr: "التذاكر" },
                { key: "hotels" as GuestCategory, icon: <Hotel size={15} style={{ color: "var(--gold)" }} />, label: "Hotel Stays", labelAr: "إقامات الفنادق" },
                { key: "meds" as GuestCategory, icon: <Pill size={15} style={{ color: "var(--warning)" }} />, label: "Medications", labelAr: "الأدوية" },
                { key: "radiology" as GuestCategory, icon: <Scan size={15} style={{ color: "var(--navy)" }} />, label: "Radiology / Imaging", labelAr: "الأشعة" },
                { key: "lab" as GuestCategory, icon: <FlaskConical size={15} style={{ color: "var(--success)" }} />, label: "Lab Results", labelAr: "نتائج التحاليل" },
              ]).map((row) => (
                <ToggleRow
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  labelAr={row.labelAr}
                  on={guestCats[row.key]}
                  onChange={(v) => { setGuestCat(row.key, v); toast(v ? `${row.label} demo enabled` : `${row.label} demo disabled`, { duration: 1500 }); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notifications — opens dedicated screen */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Bell size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>NOTIFICATIONS · الإشعارات</p>
          </div>
          <button
            onClick={() => setSubscreen("notifications")}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl btn-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <div className="flex items-center gap-3">
              <Bell size={15} style={{ color: "var(--teal-deep)" }} />
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--navy)" }}>Notification Settings</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
                  إعدادات الإشعارات
                </p>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        {/* Chat Discovery */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <MessageSquare size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>CHAT DISCOVERY · اكتشاف الدردشة</p>
          </div>
          <p className="px-1 mb-2 text-[10px] leading-snug" style={{ color: "var(--gray)" }}>
            Let other users find and message you by your exact email or phone.
            <span className="font-arabic block" dir="rtl">السماح للآخرين بإيجادك ومراسلتك عبر بريدك أو هاتفك بالضبط.</span>
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ToggleRow
              icon={<AtSign size={15} style={{ color: "var(--teal-deep)" }} />}
              label={discoverEmail ? `Discoverable by email (${discoverEmail})` : "Discoverable by email"}
              labelAr="مرئي عبر البريد"
              on={discoverByEmail} onChange={(v) => toggleDiscovery("email", v)}
            />
            <ToggleRow
              icon={<Phone size={15} style={{ color: "var(--gold)" }} />}
              label={discoverPhone ? `Discoverable by phone (${discoverPhone})` : "Discoverable by phone"}
              labelAr="مرئي عبر الهاتف"
              on={discoverByPhone} onChange={(v) => toggleDiscovery("phone", v)} color="var(--gold)"
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
              selected={theme === "light"} onSelect={() => { update("theme", setTheme)("light"); applyThemeNow("light"); }}
            />
            <RadioOption
              label="Dark Mode" labelAr="الوضع الداكن"
              selected={theme === "dark"} onSelect={() => { update("theme", setTheme)("dark"); applyThemeNow("dark"); }}
            />
            <RadioOption
              label="System Default" labelAr="حسب النظام"
              selected={theme === "system"} onSelect={() => { update("theme", setTheme)("system"); applyThemeNow("system"); }}
            />
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Shield size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>SECURITY · الأمان</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ToggleRow
              icon={<Smartphone size={15} style={{ color: biometricAvailable ? "var(--teal-deep)" : "var(--gray)" }} />}
              label={biometricAvailable ? "Biometric Login" : "Biometric Login (unavailable)"}
              labelAr="تسجيل الدخول البيومتري"
              on={biometricOn} onChange={toggleBiometric}
            />
            <ToggleRow
              icon={<Shield size={15} style={{ color: "var(--success)" }} />}
              label="Auto Backup" labelAr="نسخ احتياطي تلقائي"
              on={autoBackup} onChange={update("autoBackup", setAutoBackup)} color="var(--success)"
            />
          </div>
        </div>

        {/* Tour replay */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Sparkles size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>GUIDED TOUR · الجولة الإرشادية</p>
          </div>
          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              const uid = session?.user?.id;
              if (!uid) {
                toast.error("Sign in first to replay the tour · سجّل الدخول أولاً");
                return;
              }
              try {
                localStorage.setItem(`rufayq_fresh_${uid}`, "1");
                localStorage.removeItem(`rufayq_tour_done_${uid}`);
                window.dispatchEvent(new CustomEvent("rufayq:fresh-user", { detail: { userId: uid } }));
              } catch { /* noop */ }
              toast.success("Tour will restart · ستُعاد الجولة");
              setTimeout(() => onBack(), 350);
            }}
            className="w-full flex items-center justify-between py-3 px-4 btn-press rounded-xl"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={15} style={{ color: "var(--gold)" }} />
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--navy)" }}>Replay welcome tour</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إعادة تشغيل الجولة الإرشادية</p>
              </div>
            </div>
            <ExternalLink size={13} style={{ color: "var(--gray)" }} />
          </button>

          {/* Replay onboarding slides */}
          <button
            onClick={() => {
              try { localStorage.removeItem("rufayq_onboarded"); } catch { /* noop */ }
              toast.success("Onboarding will replay · ستُعاد شاشات الترحيب", { duration: 2000 });
              setTimeout(() => { window.location.reload(); }, 400);
            }}
            className="w-full flex items-center justify-between py-3 px-4 btn-press rounded-xl mt-2"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <div className="flex items-center gap-3">
              <PlayCircle size={15} style={{ color: "var(--teal-deep)" }} />
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--navy)" }}>Replay onboarding slides</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إعادة عرض شاشات الترحيب</p>
              </div>
            </div>
            <RotateCcw size={13} style={{ color: "var(--gray)" }} />
          </button>

          {/* On-demand tour list */}
          {replayableTours.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              {replayableTours.map((t, i, arr) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (currentUid) clearTourDone(currentUid, t.id);
                    setReplayTourId(t.id);
                  }}
                  className="w-full flex items-center justify-between py-3 px-4 btn-press text-left"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--gray-light)" : "none" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayCircle size={15} style={{ color: "var(--teal-deep)" }} />
                    <div className="min-w-0">
                      <p className="text-[13px] truncate" style={{ color: "var(--navy)" }}>{t.titleEn}</p>
                      <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{t.titleAr}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                    {t.kind}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {activeReplayTour && (
          <TourRunner
            tour={activeReplayTour}
            onFinish={() => setReplayTourId(null)}
            allowSkip
          />
        )}

        {/* About & Links */}
        <div className="mx-4 mt-5">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <Globe size={13} style={{ color: "var(--gold)" }} />
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>ABOUT & LINKS · حول</p>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            {(() => {
              const isAr = window.location.pathname.startsWith("/ar");
              const walletHref = isAr ? "/ar/app/wallet" : "/app/wallet";
              return [
              { icon: <Globe size={15} style={{ color: "var(--teal-deep)" }} />, label: "Visit RufayQ Website", labelAr: "زيارة موقع رُفَيِّق", href: "https://rufayq.com" },
              { icon: <CreditCard size={15} style={{ color: "var(--gold)" }} />, label: "Pricing & Plans", labelAr: "الأسعار والباقات", href: "/pricing" },
              { icon: <Wallet size={15} style={{ color: "var(--gold)" }} />, label: "Wallet & Refund Ledger", labelAr: "المحفظة وسجل الاسترداد", href: walletHref },
              { icon: <LifeBuoy size={15} style={{ color: "var(--teal-mid)" }} />, label: "Help Center", labelAr: "مركز المساعدة", href: "/#faq" },
              { icon: <Mail size={15} style={{ color: "var(--success)" }} />, label: "Contact Support", labelAr: "تواصل معنا", href: "mailto:support@rufayq.com" },
              { icon: <FileText size={15} style={{ color: "var(--gray)" }} />, label: "Privacy Policy (PDPL · HIPAA · GDPR)", labelAr: "سياسة الخصوصية", href: "/privacy" },
              { icon: <FileText size={15} style={{ color: "var(--gray)" }} />, label: "Terms of Service", labelAr: "شروط الاستخدام", href: "/terms" },
              ];
            })().map((link, i, arr) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 px-4 btn-press"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--gray-light)" : "none" }}
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  <div>
                    <p className="text-[13px]" style={{ color: "var(--navy)" }}>{link.label}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{link.labelAr}</p>
                  </div>
                </div>
                <ExternalLink size={13} style={{ color: "var(--gray)" }} />
              </a>
            ))}
          </div>
        </div>

        <p className="text-center font-mono text-[9px] mt-4" style={{ color: "var(--gray)" }}>
          RufayQ v1.0 · Settings · <a href="https://rufayq.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>rufayq.com</a>
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
