/**
 * RoleSelectorScreen
 * ──────────────────
 * Shown ONCE after the user's first successful sign-in. Lets them pick the
 * persona the app should boot into (Patient or Doctor). The choice is
 * persisted in `localStorage` under `rufayq_role` and consumed by
 * `Index.tsx` / `useRolePreference()`.
 *
 * Bilingual EN/AR with RTL handled by parent layout. Uses semantic design
 * tokens only — no hardcoded colors.
 */
import { useState } from "react";
import { Stethoscope, HeartPulse, Check } from "lucide-react";

export type AppRolePref = "patient" | "doctor";

interface Props {
  onSelect: (role: AppRolePref) => void;
}

export const ROLE_PREF_KEY = "rufayq_role";

const RoleSelectorScreen = ({ onSelect }: Props) => {
  const [picked, setPicked] = useState<AppRolePref | null>(null);

  const confirm = () => {
    if (!picked) return;
    localStorage.setItem(ROLE_PREF_KEY, picked);
    onSelect(picked);
  };

  return (
    <div
      className="flex-1 flex flex-col items-center px-6 pt-10 pb-8"
      style={{ background: "var(--off-white)" }}
    >
      <h1
        className="text-2xl font-semibold text-center"
        style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
      >
        Welcome to Rufayq
      </h1>
      <p className="text-sm text-center mt-1" style={{ color: "var(--muted)" }} dir="rtl">
        أهلاً بك في رفايق
      </p>
      <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>
        Choose how you'll use the app. You can switch later in Settings.
      </p>

      <div className="w-full mt-8 flex flex-col gap-4">
        <RoleCard
          active={picked === "patient"}
          onClick={() => setPicked("patient")}
          icon={<HeartPulse size={28} />}
          title="I'm a Patient"
          titleAr="أنا مريض"
          subtitle="Track journey, records, meds and care plan"
          subtitleAr="تتبّع الرحلة والسجلات والأدوية"
        />
        <RoleCard
          active={picked === "doctor"}
          onClick={() => setPicked("doctor")}
          icon={<Stethoscope size={28} />}
          title="I'm a Doctor"
          titleAr="أنا طبيب"
          subtitle="Manage patients, claims and approvals"
          subtitleAr="إدارة المرضى والمطالبات"
        />
      </div>

      <button
        onClick={confirm}
        disabled={!picked}
        className="mt-auto w-full rounded-2xl py-4 font-medium transition disabled:opacity-40"
        style={{
          background: "var(--teal-600)",
          color: "var(--off-white)",
        }}
      >
        Continue
      </button>
    </div>
  );
};

const RoleCard = ({
  active, onClick, icon, title, titleAr, subtitle, subtitleAr,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; titleAr: string; subtitle: string; subtitleAr: string;
}) => (
  <button
    onClick={onClick}
    className="w-full text-start rounded-2xl p-4 border-2 transition flex items-center gap-4"
    style={{
      borderColor: active ? "var(--teal-600)" : "var(--hairline)",
      background: active ? "color-mix(in oklab, var(--teal-600) 8%, var(--off-white))" : "var(--off-white)",
    }}
  >
    <div
      className="rounded-xl p-3 shrink-0"
      style={{ background: "var(--teal-600)", color: "var(--off-white)" }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{title}</span>
        {active && <Check size={18} style={{ color: "var(--teal-600)" }} />}
      </div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{subtitle}</div>
      <div className="text-xs mt-1" dir="rtl" style={{ color: "var(--muted)" }}>
        {titleAr} · {subtitleAr}
      </div>
    </div>
  </button>
);

export default RoleSelectorScreen;
