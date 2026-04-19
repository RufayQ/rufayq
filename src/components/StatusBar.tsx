import { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";

interface StatusBarProps {
  dark?: boolean;
  showLanguage?: boolean;
}

const StatusBar = ({ dark, showLanguage }: StatusBarProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatted = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
  const color = dark ? "var(--navy)" : "#fff";

  return (
    <div className="flex items-center justify-between px-5 py-2" style={{ height: 44, color }}>
      <span className="font-mono text-[13px] font-bold">{formatted}</span>
      <div className="flex items-center gap-2">
        {showLanguage && (
          <LanguageSwitcher
            compact
            bg={dark ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.15)"}
            border={dark ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)"}
            active={dark ? "var(--navy)" : "#fff"}
            inactive={dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)"}
            activeText={dark ? "#fff" : "var(--navy)"}
          />
        )}
        {/* Signal */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" />
          <rect x="9" y="2" width="3" height="10" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="0.3" />
        </svg>
        {/* Battery */}
        <svg width="22" height="12" viewBox="0 0 22 12" fill="currentColor">
          <rect x="0" y="1" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
          <rect x="2" y="3" width="12" height="6" rx="1" fill="currentColor" opacity="0.75" />
          <rect x="19" y="4" width="2" height="4" rx="0.5" />
        </svg>
      </div>
    </div>
  );
};

export default StatusBar;
