import { useEffect, useState } from "react";
import { ChevronRight, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Open the profile screen so the user can fill missing data. */
  onOpenProfile: () => void;
}

const DISMISS_KEY = "rufayq_profile_banner_dismissed_v1";

type ProfileRow = {
  full_name_en: string | null;
  full_name_ar: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  saudi_id: string | null;
  passport_number: string | null;
  contact_verified: boolean | null;
};

type MedicalRow = {
  blood_type: string | null;
  emergency_contact_name: string | null;
};

/**
 * Compact home-screen nudge that:
 *  • shows a 0–100% completion bar based on profile + medical baseline,
 *  • exposes a "Contact not verified" sub-row when the account has no
 *    verified phone/email yet (placeholder until OTP infra exists).
 * Hidden once score ≥ 90% AND contact_verified === true.
 * Dismissible per browser-tab session (sessionStorage).
 */
const ProfileCompletionBanner = ({ onOpenProfile }: Props) => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [score, setScore] = useState<number | null>(null);
  const [contactVerified, setContactVerified] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deviceId = localStorage.getItem("rufayq_device_id");
      if (!deviceId) return;
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("full_name_en,full_name_ar,date_of_birth,gender,nationality,saudi_id,passport_number,contact_verified").eq("device_id", deviceId).maybeSingle() as any,
        supabase.from("medical_profiles").select("blood_type,emergency_contact_name").eq("device_id", deviceId).maybeSingle() as any,
      ]);
      if (cancelled) return;
      const profile = (p as ProfileRow) || null;
      const medical = (m as MedicalRow) || null;
      const checks: boolean[] = [
        !!profile?.full_name_en,
        !!profile?.date_of_birth,
        !!profile?.gender,
        !!profile?.nationality,
        !!(profile?.saudi_id || profile?.passport_number),
        !!medical?.blood_type,
        !!medical?.emergency_contact_name,
        !!profile?.contact_verified,
      ];
      const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
      setScore(pct);
      setContactVerified(!!profile?.contact_verified);
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed) return null;
  if (score === null) return null;
  if (score >= 90 && contactVerified) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-2xl p-3 mb-2"
      style={{
        background: "color-mix(in oklab, var(--gold) 12%, var(--white))",
        border: "1px solid color-mix(in oklab, var(--gold) 35%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex-1 text-start"
          aria-label={t("Complete your profile", "أكمل ملفك الشخصي")}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>
              {t("Complete your profile", "أكمل ملفك الشخصي")}
            </span>
            <span className="text-[12px] font-mono" style={{ color: "var(--navy)" }}>{score}%</span>
          </div>
          <div className="h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: "var(--gold)" }} />
          </div>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold" style={{ color: "var(--gold)" }}>
            {t("Open profile", "فتح الملف")} <ChevronRight size={12} />
          </div>
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-md"
          aria-label={t("Dismiss", "إغلاق")}
          style={{ color: "var(--gray)" }}
        >
          <X size={14} />
        </button>
      </div>

      {!contactVerified && (
        <div
          className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]"
          style={{
            background: "rgba(0,0,0,0.04)",
            color: "var(--navy)",
          }}
        >
          <ShieldAlert size={12} style={{ color: "var(--gold)" }} />
          <span>
            {t("Contact not verified", "لم يتم التحقق من جهة الاتصال")}
            <span style={{ opacity: 0.6 }}> · {t("verification coming soon", "قريباً")}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionBanner;
