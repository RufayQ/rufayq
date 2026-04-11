import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import Wordmark from "@/components/Wordmark";
import { Eye, EyeOff } from "lucide-react";

type AuthView = "login" | "register" | "otp";

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [view, setView] = useState<AuthView>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(45);
  const [regData, setRegData] = useState({ name: "", nameAr: "", id: "", dob: "", gender: "male", email: "" });

  const handleLogin = () => {
    setView("otp");
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleOtp = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
    if (newOtp.every((d) => d !== "")) {
      setTimeout(onLogin, 500);
    }
  };

  if (view === "otp") {
    return (
      <div className="flex flex-col h-full px-6 pt-12" style={{ background: "var(--off-white)" }}>
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Enter verification code</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أدخل رمز التحقق</p>
          <p className="text-xs mt-3" style={{ color: "var(--gray)" }}>Sent to +966 {phone || "5X XXX XXXX"}</p>
        </div>
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((d, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              value={d}
              onChange={(e) => handleOtp(i, e.target.value)}
              maxLength={1}
              className="w-11 h-11 text-center text-lg font-semibold rounded-lg outline-none transition-all"
              style={{
                border: `1px solid ${d ? "var(--teal-deep)" : "var(--gray-light)"}`,
                background: "var(--white)",
                color: "var(--navy)",
              }}
            />
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: countdown > 0 ? "var(--gray)" : "var(--teal-mid)" }}>
          {countdown > 0 ? `Resend in 0:${countdown.toString().padStart(2, "0")}` : "Resend code · إعادة إرسال الرمز"}
        </p>
      </div>
    );
  }

  if (view === "register") {
    return (
      <div className="flex flex-col h-full overflow-y-auto px-6 pt-8 pb-6" style={{ background: "var(--off-white)" }}>
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl" style={{ color: "var(--navy)" }}>Create your account</h2>
          <p className="font-arabic text-base mt-1" dir="rtl" style={{ color: "var(--gray)" }}>أنشئ حسابك</p>
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
          {[
            { label: "Full Name", labelAr: "الاسم الكامل", placeholder: "Mohammed Al-Rashidi", key: "name" },
            { label: "الاسم بالعربي", labelAr: "", placeholder: "محمد الراشدي", key: "nameAr", rtl: true },
            { label: "Saudi ID / Passport", labelAr: "الهوية / الجواز", placeholder: "1234567890", key: "id" },
            { label: "Date of Birth", labelAr: "تاريخ الميلاد", placeholder: "1990-01-15", key: "dob" },
            { label: "Email (optional)", labelAr: "البريد الإلكتروني", placeholder: "email@example.com", key: "email" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
                {f.label} {f.labelAr && <span className="font-arabic text-xs" style={{ color: "var(--gray)" }}> · {f.labelAr}</span>}
              </label>
              <input
                value={(regData as any)[f.key]}
                onChange={(e) => setRegData({ ...regData, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                dir={f.rtl ? "rtl" : "ltr"}
                className="w-full mt-1 px-3 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>Gender · الجنس</label>
            <div className="flex gap-2 mt-1">
              {[["male", "Male · ذكر"], ["female", "Female · أنثى"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRegData({ ...regData, gender: val })}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all btn-press"
                  style={{
                    background: regData.gender === val ? "var(--teal-deep)" : "var(--off-white)",
                    color: regData.gender === val ? "var(--white)" : "var(--gray)",
                    border: `1px solid ${regData.gender === val ? "var(--teal-deep)" : "var(--gray-light)"}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onLogin}
          className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press"
          style={{ background: "var(--gold)", height: 52 }}
        >
          Create Account · إنشاء الحساب
        </button>
        <button onClick={() => setView("login")} className="mt-3 text-center text-xs" style={{ color: "var(--gray)" }}>
          Already have an account? <span style={{ color: "var(--teal-deep)" }} className="font-semibold">Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 pt-10 pb-6" style={{ background: "var(--off-white)" }}>
      <div className="flex flex-col items-center mb-8">
        <LogoMark size={60} />
        <div className="mt-2"><Wordmark size="text-xl" /></div>
        <h2 className="font-display text-2xl mt-4" style={{ color: "var(--navy)" }}>Welcome back</h2>
        <p className="font-arabic text-base" dir="rtl" style={{ color: "var(--gray)" }}>مرحباً بعودتك</p>
        <p className="text-xs mt-1" style={{ color: "var(--gray)" }}>Sign in to your RufayQ companion · سجّل دخولك إلى رُفَيِّق</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--white)" }}>
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
            Saudi Mobile Number <span className="font-arabic" style={{ color: "var(--gray)" }}>· رقم الجوال السعودي</span>
          </label>
          <div className="flex items-center mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)", height: 52 }}>
            <span className="pl-3 pr-2 text-sm" style={{ color: "var(--gray)" }}>🇸🇦 +966</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5X XXX XXXX"
              className="flex-1 h-full px-2 text-sm outline-none"
              style={{ background: "transparent", color: "var(--navy)" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium" style={{ color: "var(--navy)" }}>
              Password <span className="font-arabic" style={{ color: "var(--gray)" }}>· كلمة المرور</span>
            </label>
            <button className="text-[10px]" style={{ color: "var(--teal-mid)" }}>Forgot?</button>
          </div>
          <div className="flex items-center mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--gray-light)", height: 52 }}>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex-1 h-full px-3 text-sm outline-none"
              style={{ background: "transparent", color: "var(--navy)" }}
            />
            <button onClick={() => setShowPass(!showPass)} className="pr-3" style={{ color: "var(--gray)" }}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogin}
        className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white btn-press"
        style={{ background: "var(--teal-deep)", height: 52 }}
      >
        Sign In · تسجيل الدخول
      </button>

      <div className="flex items-center my-4">
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
        <span className="px-3 text-xs" style={{ color: "var(--gray)" }}>or · أو</span>
        <div className="flex-1 h-px" style={{ background: "var(--gray-light)" }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: "🍎", label: "Apple" },
          { icon: "🔵", label: "Google" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={onLogin}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm btn-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <p className="text-center text-xs mt-5" style={{ color: "var(--gray)" }}>
        Don't have an account?{" "}
        <button onClick={() => setView("register")} className="font-semibold" style={{ color: "var(--teal-deep)" }}>
          Register · سجّل الآن
        </button>
      </p>
    </div>
  );
};

export default LoginScreen;
