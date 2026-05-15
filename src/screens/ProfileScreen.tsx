import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, LogOut, Shield, AlertTriangle, Copy, Eye, EyeOff, Phone } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { toast } from "sonner";
import MedicalHistorySheet from "@/components/MedicalHistorySheet";
import ConsentsSheet from "@/components/ConsentsSheet";
import RcmStatusPanel from "@/components/RcmStatusPanel";
import EmergencyContactsSheet, { loadEmergencyContacts, CATEGORY_META, type EmergencyContact } from "@/components/EmergencyContactsSheet";
import { usePendingClaimsCount } from "@/hooks/usePendingClaimsCount";
import { useGuestMode } from "@/hooks/useGuestMode";
import ConnectedAccountsCard from "@/components/profile/ConnectedAccountsCard";

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
  const isGuest = useGuestMode();
  const [showPassport, setShowPassport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConsents, setShowConsents] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const { count: pendingClaims } = usePendingClaimsCount();

  useEffect(() => { setEmergencyContacts(loadEmergencyContacts()); }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied · تم النسخ`);
  };

  if (!isGuest) {
    return (
      <div className="flex flex-col h-full">
        <div className="relative px-5 pt-3 pb-6 text-center" style={{ background: "var(--navy)" }}>
          <button onClick={onBack} className="absolute left-4 top-3 btn-press"><ArrowLeft size={20} color="white" /></button>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ border: "2px solid var(--gold)", background: "rgba(197,150,90,0.15)", color: "var(--gold)" }}>
            <LogoMark size={28} />
          </div>
          <p className="font-display text-xl text-white mt-2">Your Profile</p>
          <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.5)" }}>ملفك الشخصي</p>
        </div>

        <div className="flex-1 overflow-y-auto pb-6" style={{ background: "var(--off-white)" }}>
          <div className="mx-4 mt-3 rounded-xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[14px] font-semibold" style={{ color: "var(--navy)" }}>No demo identity data is shown for signed-in users.</p>
            <p className="text-[12px] mt-1" style={{ color: "var(--gray)" }}>Your personal details will appear here once connected to your account records.</p>
            <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>لن تظهر أي بيانات تجريبية للمستخدمين المسجلين، وستظهر بياناتك هنا عند ربطها بحسابك.</p>
          </div>

          <div className="mt-4 mx-4">
            <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>MEDICAL</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <SettingRow label="Past Medical History" labelAr="التاريخ المرضي السابق" value="View / Edit" onClick={() => setShowHistory(true)} />
              <SettingRow label="Surgical History" labelAr="التاريخ الجراحي" value="View / Edit" onClick={() => setShowHistory(true)} />
              <SettingRow label="Family History" labelAr="التاريخ العائلي" value="View / Edit" onClick={() => setShowHistory(true)} />
            </div>
          </div>

          <div className="mt-4 mx-4">
            <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>PROVIDER ACCESS</p>
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <button onClick={() => setShowConsents(true)} className="w-full flex items-center justify-between py-3 px-4 btn-press">
                <div className="text-left">
                  <p className="text-[13px]" style={{ color: "var(--navy)" }}>Manage Provider Consents</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إدارة وصول المزوّدين</p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--gray)" }} />
              </button>
            </div>
          </div>

          <div className="mt-4 mx-4">
            <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>INSURANCE & RCM STATUS</p>
            <RcmStatusPanel />
          </div>

          {/* Emergency contacts (registered users) */}
          <div className="mt-4 mx-4">
            <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>EMERGENCY CONTACTS · جهات الطوارئ</p>
            <button onClick={() => setShowEmergency(true)} className="w-full rounded-xl px-4 py-3 flex items-center justify-between btn-press" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <div className="flex items-center gap-3">
                <Phone size={15} style={{ color: "#D94F4F" }} />
                <div className="text-left">
                  <p className="text-[13px]" style={{ color: "var(--navy)" }}>Manage emergency contacts</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إدارة جهات الاتصال للطوارئ</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: emergencyContacts.length ? "var(--teal-light)" : "var(--gray-light)", color: emergencyContacts.length ? "var(--teal-deep)" : "var(--gray)" }}>
                {emergencyContacts.length || "0"} {emergencyContacts.length === 1 ? "contact" : "contacts"}
              </span>
            </button>
          </div>

          <ConnectedAccountsCard />

          <div className="mx-4 mt-6">
            <button onClick={onLogout} className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 btn-press" style={{ background: "var(--white)", border: "1px solid var(--error)", color: "var(--error)" }}>
              <LogOut size={16} /> Sign Out · تسجيل الخروج
            </button>
          </div>
        </div>

        {showHistory && <MedicalHistorySheet onClose={() => setShowHistory(false)} />}
        {showConsents && <ConsentsSheet onClose={() => setShowConsents(false)} />}
        {showEmergency && <EmergencyContactsSheet onClose={() => setShowEmergency(false)} onChange={setEmergencyContacts} />}
      </div>
    );
  }

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

        {/* Emergency Contacts (categorized) */}
        <div className="mt-4 mx-4">
          <div className="flex items-center justify-between mb-1 px-1">
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>EMERGENCY CONTACTS · جهات الطوارئ</p>
            <button onClick={() => setShowEmergency(true)} className="text-[10px] font-bold btn-press" style={{ color: "var(--teal-deep)" }}>
              {emergencyContacts.length ? "Manage →" : "+ Add"}
            </button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            {emergencyContacts.length === 0 ? (
              <button onClick={() => setShowEmergency(true)} className="w-full p-4 flex items-center gap-3 btn-press text-left">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(217,79,79,0.1)" }}>
                  <Phone size={16} style={{ color: "#D94F4F" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Set up emergency contacts</p>
                  <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>أضف جهات اتصال للطوارئ</p>
                </div>
                <ChevronRight size={14} style={{ color: "var(--gray)" }} />
              </button>
            ) : (
              emergencyContacts.slice(0, 3).map((c, i) => {
                const m = CATEGORY_META[c.category];
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i > 0 ? "1px solid var(--gray-light)" : "none" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-base" style={{ background: "rgba(217,79,79,0.08)" }}>
                      {m.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{c.name}</p>
                      <p className="text-[10px]" style={{ color: m.color }}>
                        {c.category === "custom" ? c.customLabel || m.en : m.en}
                      </p>
                    </div>
                    <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white btn-press inline-flex items-center gap-1" style={{ background: "#D94F4F" }}>
                      <Phone size={10} /> Call
                    </a>
                  </div>
                );
              })
            )}
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

        {/* Provider Access (Phase 3 consents) */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>PROVIDER ACCESS</p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <button onClick={() => setShowConsents(true)} className="w-full flex items-center justify-between py-3 px-4 btn-press" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div className="text-left">
                <p className="text-[13px]" style={{ color: "var(--navy)" }}>Manage Provider Consents</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>إدارة وصول المزوّدين</p>
              </div>
              <div className="flex items-center gap-2">
                {pendingClaims > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                    {pendingClaims} pending
                  </span>
                )}
                <ChevronRight size={14} style={{ color: "var(--gray)" }} />
              </div>
            </button>
          </div>
        </div>

        {/* RCM Insurance Status (Phase 4 — read-only) */}
        <div className="mt-4 mx-4">
          <p className="font-mono text-[10px] tracking-widest mb-1 px-1" style={{ color: "var(--gold)" }}>INSURANCE & RCM STATUS</p>
          <RcmStatusPanel />
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
      {showConsents && <ConsentsSheet onClose={() => setShowConsents(false)} />}
      {showEmergency && <EmergencyContactsSheet onClose={() => setShowEmergency(false)} onChange={setEmergencyContacts} />}
    </div>
  );
};

export default ProfileScreen;
