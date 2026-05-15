import { useMemo } from "react";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const COMMON_PASSWORDS = [
  "password", "password1", "password123", "12345678", "123456789",
  "qwerty", "qwerty123", "letmein", "iloveyou", "welcome",
  "admin", "admin123", "test", "test123", "testfamily",
  "rufayq", "abcdefg", "11111111", "00000000",
];

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  notCommon: boolean;
  notIdentity: boolean;
  symbol: boolean; // bonus
}

export const evaluatePassword = (
  password: string,
  identity: { firstName?: string; lastName?: string; phone?: string } = {},
): PasswordChecks => {
  const pw = password || "";
  const lower = pw.toLowerCase();
  const phoneDigits = (identity.phone || "").replace(/\D/g, "");
  const pwDigits = pw.replace(/\D/g, "");

  // Identity match: any name token >=3 chars contained, OR any 4+ consecutive run from phone digits.
  const tokens = [identity.firstName, identity.lastName]
    .map((s) => (s || "").trim().toLowerCase())
    .filter((s) => s.length >= 3);
  const containsName = tokens.some((t) => lower.includes(t));
  let containsPhoneRun = false;
  if (phoneDigits.length >= 4 && pwDigits.length >= 4) {
    for (let i = 0; i + 4 <= phoneDigits.length; i++) {
      const run = phoneDigits.slice(i, i + 4);
      if (pwDigits.includes(run)) { containsPhoneRun = true; break; }
    }
  }

  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    notCommon: pw.length > 0 && !COMMON_PASSWORDS.some((c) => lower.includes(c)),
    notIdentity: pw.length > 0 && !containsName && !containsPhoneRun,
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
};

export const REQUIRED_KEYS: (keyof PasswordChecks)[] = [
  "length", "upper", "lower", "number", "notCommon", "notIdentity",
];

// Signup-only required keys (notCommon removed per product decision).
export const SIGNUP_REQUIRED_KEYS: (keyof PasswordChecks)[] = [
  "length", "upper", "lower", "number", "notIdentity",
];

export const allRequiredPass = (c: PasswordChecks) =>
  REQUIRED_KEYS.every((k) => c[k]);

// Fair-and-above gate for QuickSignup: at least 3 of the 5 signup rules pass.
export const fairAndAbovePass = (c: PasswordChecks) =>
  SIGNUP_REQUIRED_KEYS.filter((k) => c[k]).length >= 3;

interface Props {
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  visible?: boolean;
}

const PasswordStrength = ({ password, firstName, lastName, phone, visible = true }: Props) => {
  const { mode } = useLanguage();
  const isAr = mode === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const checks = useMemo(
    () => evaluatePassword(password, { firstName, lastName, phone }),
    [password, firstName, lastName, phone],
  );

  if (!visible || !password) return null;

  const requiredCount = REQUIRED_KEYS.filter((k) => checks[k]).length;
  const totalScore = requiredCount + (checks.symbol ? 1 : 0);

  let band: { label: string; color: string; segments: number };
  if (requiredCount <= 2) band = { label: t("Weak", "ضعيفة"), color: "#E5484D", segments: 1 };
  else if (requiredCount <= 4) band = { label: t("Fair", "مقبولة"), color: "#F5A524", segments: 2 };
  else if (requiredCount === 5) band = { label: t("Good", "جيدة"), color: "#0FB5C9", segments: 3 };
  else band = { label: totalScore >= 7 ? t("Strong", "قوية جداً") : t("Strong", "قوية"), color: "#C5965A", segments: 4 };

  const rules: { key: keyof PasswordChecks; label: string; bonus?: boolean }[] = [
    { key: "length", label: t("At least 8 characters", "8 أحرف على الأقل") },
    { key: "upper", label: t("Uppercase letter (A–Z)", "حرف كبير (A–Z)") },
    { key: "lower", label: t("Lowercase letter (a–z)", "حرف صغير (a–z)") },
    { key: "number", label: t("A number (0–9)", "رقم (0–9)") },
    { key: "notIdentity", label: t("Doesn't contain your name or phone", "لا تحتوي على اسمك أو رقم جوالك") },
    { key: "symbol", label: t("Symbol (recommended)", "رمز (موصى به)"), bonus: true },
  ];

  const TEXT_MUTED = "rgba(232,236,240,0.6)";

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= band.segments ? band.color : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono" style={{ color: band.color }}>
          {band.label}
        </span>
      </div>
      <ul className="space-y-1">
        {rules.map((r) => {
          const ok = checks[r.key];
          return (
            <li
              key={r.key}
              className="flex items-center gap-2 text-[11px]"
              style={{ color: ok ? "#3CCB7F" : TEXT_MUTED }}
              data-testid={`pw-rule-${r.key}`}
              data-ok={ok ? "1" : "0"}
            >
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full"
                style={{
                  background: ok ? "rgba(60,203,127,0.15)" : "rgba(255,255,255,0.06)",
                  border: ok ? "1px solid rgba(60,203,127,0.4)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {ok ? <Check size={9} strokeWidth={3} /> : <span className="block w-1 h-1 rounded-full bg-current opacity-50" />}
              </span>
              <span>{r.label}{r.bonus && !ok ? "" : ""}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrength;
