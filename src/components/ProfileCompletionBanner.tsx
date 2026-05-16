import { useEffect, useState } from "react";
import { ChevronRight, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Open the profile screen so the user can fill missing data. */
  onOpenProfile: () => void;
}

const DISMISS_KEY_PREFIX = "rufayq_profile_banner_dismissed_v1";

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
 * Dismissible per browser-tab session, scoped per device id.
 */
const ProfileCompletionBanner = ({ onOpenProfile }: Props) => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [score, setScore] = useState<number | null>(null);
  const [contactVerified, setContactVerified] = useState<boolean>(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve device id with auth fallback so a fresh tab still scopes correctly.
      let id: string | null = null;
      try { id = localStorage.getItem("rufayq_device_id"); } catch { /* noop */ }
      if (!id) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user?.id) id = `auth_${data.user.id}`;
        } catch { /* noop */ }
      }
      if (!id || cancelled) return;
      setDeviceId(id);

      try {
        const dismissedFlag =
          localStorage.getItem(`${DISMISS_KEY_PREFIX}:${id}`) === "1" ||
          sessionStorage.getItem(`${DISMISS_KEY_PREFIX}:${id}`) === "1";
        if (dismissedFlag) { setDismissed(true); return; }
      } catch { /* noop */ }

      const [pRes, mRes] = await Promise.all([
        supabase.from("profiles").select("full_name_en,full_name_ar,date_of_birth,gender,nationality,saudi_id,passport_number,contact_verified").eq("device_id", id).maybeSingle() as any,
        supabase.from("medical_profiles").select("blood_type,emergency_contact_name").eq("device_id", id).maybeSingle() as any,
      ]);
      if (cancelled) return;
      if (pRes?.error) console.warn("[profile-banner] profiles", pRes.error);
      if (mRes?.error) console.warn("[profile-banner] medical_profiles", mRes.error);
      const profile = (pRes?.data as ProfileRow) || null;
      const medical = (mRes?.data as MedicalRow) || null;
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
    if (deviceId) {
      try { localStorage.setItem(`${DISMISS_KEY_PREFIX}:${deviceId}`, "1"); } catch { /* noop */ }
      try { sessionStorage.setItem(`${DISMISS_KEY_PREFIX}:${deviceId}`, "1"); } catch { /* noop */ }
    }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-2xl p-3 mb-2"
      dir={isAr ? "rtl" : "ltr"}
      style={{
        // Solid fallback first, then color-mix overlay for modern engines.
        background: "rgba(197,150,90,0.12)",
        backgroundImage: "linear-gradient(color-mix(in oklab, var(--gold) 12%, var(--white)), color-mix(in oklab, var(--gold) 12%, var(--white)))",
        border: "1px solid rgba(197,150,90,0.35)",
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
          className="p-2 rounded-full btn-press"
          aria-label={t("Dismiss", "إغلاق")}
          style={{ color: "var(--navy)", background: "rgba(0,0,0,0.05)" }}
        >
          <X size={16} />
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
