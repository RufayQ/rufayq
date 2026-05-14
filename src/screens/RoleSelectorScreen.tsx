/**
 * RoleSelectorScreen
 * ──────────────────
 * Shown BEFORE sign-in so the user picks the persona they want to log into
 * (Patient or Doctor). The chosen role is persisted in `localStorage`
 * (`rufayq_role`) and later validated against the user's `user_roles`
 * records during the post-login handshake in `Index.tsx`.
 *
 *  flow:
 *  onboarding → role → login → DB role check → main / provider portal
 *
 * Bilingual EN/AR. Honours `LanguageContext`. Uses semantic design tokens
 * only — no hardcoded colors.
 *
 * Validation states:
 *   - "untouched"   : Continue is disabled but always visible
 *   - "needs_choice": inline hint shown after attempting to continue
 *   - "saving"      : button shows spinner, prevents double-submit
 *   - "error"       : caught storage failure → bilingual toast + retry
 */
import { useEffect, useState } from "react";
import { Stethoscope, HeartPulse, Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export type AppRolePref = "patient" | "doctor";

export const ROLE_PREF_KEY = "rufayq_role";
/** Bumped when the role-selector contract changes; forces a re-pick. */
export const ROLE_PREF_VERSION = 1;
const ROLE_VERSION_KEY = "rufayq_role_version";

interface Props {
  onSelect: (role: AppRolePref) => void;
  /** Optional: lets the user back out if they already had a session. */
  onBack?: () => void;
}

/** Reads + version-validates the stored preference. */
export function getStoredRole(): AppRolePref | null {
  try {
    const v = Number(localStorage.getItem(ROLE_VERSION_KEY) || "0");
    if (v !== ROLE_PREF_VERSION) return null;
    const r = localStorage.getItem(ROLE_PREF_KEY);
    return r === "patient" || r === "doctor" ? r : null;
  } catch {
    return null;
  }
}

/** Persist a role choice using the same contract as the role selector. */
export function setStoredRole(role: AppRolePref) {
  try {
    localStorage.setItem(ROLE_PREF_KEY, role);
    localStorage.setItem(ROLE_VERSION_KEY, String(ROLE_PREF_VERSION));
  } catch { /* noop */ }
}

export function clearStoredRole() {
  try {
    localStorage.removeItem(ROLE_PREF_KEY);
    localStorage.removeItem(ROLE_VERSION_KEY);
  } catch { /* noop */ }
}

const STR = {
  title:    { en: "Welcome to Rufayq",                                    ar: "أهلاً بك في رفايق" },
  subtitle: { en: "Choose how you'll sign in. We'll verify your account matches.",
              ar: "اختر طريقة دخولك وسنتحقق من تطابق حسابك." },
  patient:  { en: "I'm a Traveller",                                      ar: "أنا مسافر" },
  patientS: { en: "Track journey, records, meds and care plan",           ar: "تتبّع الرحلة والسجلات والأدوية والخطة العلاجية" },
  doctor:   { en: "I'm a Doctor",                                         ar: "أنا طبيب" },
  doctorS:  { en: "Manage patients, claims and approvals",                ar: "إدارة المرضى والمطالبات والموافقات" },
  cont:     { en: "Continue to sign in",                                  ar: "متابعة لتسجيل الدخول" },
  pickHint: { en: "Please select an option to continue",                  ar: "الرجاء اختيار خيار للمتابعة" },
  saveErr:  { en: "Couldn't save your choice. Please try again.",         ar: "تعذّر حفظ اختيارك. حاول مرة أخرى." },
};

const RoleSelectorScreen = ({ onSelect }: Props) => {
  const { showEn, showAr, mode } = useLanguage();
  const isRtl = mode === "ar";
  const [picked, setPicked] = useState<AppRolePref | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const existing = getStoredRole();
    if (existing) setPicked(existing);
  }, []);

  const confirm = () => {
    if (!picked) {
      setShowHint(true);
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem(ROLE_PREF_KEY, picked);
      localStorage.setItem(ROLE_VERSION_KEY, String(ROLE_PREF_VERSION));
    } catch {
      setSaving(false);
      toast.error(STR.saveErr.en, { description: STR.saveErr.ar });
      return;
    }
    requestAnimationFrame(() => onSelect(picked));
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="role-selector"
      className="flex-1 flex flex-col px-6 pt-10 pb-6 overflow-y-auto"
      style={{ background: "var(--off-white)" }}
    >
      <h1
        className="text-2xl font-semibold text-center"
        style={{ color: "var(--ink, var(--navy))", fontFamily: "var(--font-display)" }}
      >
        {showEn && STR.title.en}
        {showEn && showAr && <span style={{ opacity: 0.5 }}> · </span>}
        {showAr && <span dir="rtl">{STR.title.ar}</span>}
      </h1>
      <p
        className="text-sm text-center mt-3"
        style={{ color: "var(--muted, var(--gray))" }}
      >
        {showEn && STR.subtitle.en}
        {showEn && showAr && <br />}
        {showAr && <span dir="rtl">{STR.subtitle.ar}</span>}
      </p>

      <div className="w-full mt-8 flex flex-col gap-4">
        <RoleCard
          active={picked === "patient"}
          onClick={() => { setPicked("patient"); setShowHint(false); }}
          icon={<HeartPulse size={28} />}
          title={STR.patient}
          subtitle={STR.patientS}
          showEn={showEn}
          showAr={showAr}
          isRtl={isRtl}
          ariaLabel="patient"
          testId="role-patient"
        />
        <RoleCard
          active={picked === "doctor"}
          onClick={() => { setPicked("doctor"); setShowHint(false); }}
          icon={<Stethoscope size={28} />}
          title={STR.doctor}
          subtitle={STR.doctorS}
          showEn={showEn}
          showAr={showAr}
          isRtl={isRtl}
          ariaLabel="doctor"
          testId="role-doctor"
        />
      </div>

      {showHint && !picked && (
        <p
          role="alert"
          className="mt-3 text-xs text-center"
          style={{ color: "var(--danger, #b3261e)" }}
        >
          {showEn && STR.pickHint.en}
          {showEn && showAr && " · "}
          {showAr && <span dir="rtl">{STR.pickHint.ar}</span>}
        </p>
      )}

      {/* Footer pinned to bottom but always visible — no mt-auto reliance. */}
      <div className="mt-8 pt-2 sticky bottom-0" style={{ background: "var(--off-white)" }}>
        <button
          type="button"
          data-testid="role-continue"
          onClick={confirm}
          disabled={saving}
          aria-disabled={!picked || saving}
          className="w-full rounded-2xl py-4 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: picked ? "var(--teal-deep, var(--teal-600))" : "var(--gray-light, var(--muted))",
            color: "var(--white, var(--off-white))",
          }}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <ArrowRight size={16} aria-hidden />
          )}
          <span>
            {showEn && STR.cont.en}
            {showEn && showAr && " · "}
            {showAr && <span dir="rtl">{STR.cont.ar}</span>}
          </span>
        </button>
      </div>
    </div>
  );
};

const RoleCard = ({
  active, onClick, icon, title, subtitle, showEn, showAr, isRtl, ariaLabel, testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: { en: string; ar: string };
  subtitle: { en: string; ar: string };
  showEn: boolean;
  showAr: boolean;
  isRtl: boolean;
  ariaLabel: string;
  testId?: string;
}) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    aria-pressed={active}
    aria-label={ariaLabel}
    dir={isRtl ? "rtl" : "ltr"}
    className="w-full text-start rounded-2xl p-4 border-2 transition flex items-center gap-4"
    style={{
      borderColor: active ? "var(--teal-deep, var(--teal-600))" : "var(--gray-light, var(--hairline))",
      background: active
        ? "color-mix(in oklab, var(--teal-deep, var(--teal-600)) 8%, var(--off-white))"
        : "var(--white, var(--off-white))",
    }}
  >
    <div
      className="rounded-xl p-3 shrink-0"
      style={{ background: "var(--teal-deep, var(--teal-600))", color: "var(--white, var(--off-white))" }}
      aria-hidden
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span style={{ color: "var(--navy, var(--ink))", fontWeight: 600 }}>
          {showEn && title.en}
          {showEn && showAr && <span style={{ opacity: 0.5 }}> · </span>}
          {showAr && <span dir="rtl">{title.ar}</span>}
        </span>
        {active && (
          <Check size={18} style={{ color: "var(--teal-deep, var(--teal-600))" }} aria-hidden />
        )}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--gray, var(--muted))" }}>
        {showEn && subtitle.en}
      </div>
      {showAr && (
        <div className="text-xs mt-0.5" dir="rtl" style={{ color: "var(--gray, var(--muted))" }}>
          {subtitle.ar}
        </div>
      )}
    </div>
  </button>
);

export default RoleSelectorScreen;
