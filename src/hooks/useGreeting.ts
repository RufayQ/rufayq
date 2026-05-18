/**
 * useGreeting — timezone-aware greeting derived from the visitor's local clock.
 *
 * - No server time, no IP lookup; uses `new Date().getHours()`.
 * - Recomputes every 60s while the tab is open so band transitions
 *   (e.g. 11:59 → 12:00) surface without a reload.
 * - Also recomputes on tab focus / visibility change for long-lived tabs.
 * - Returns a neutral fallback before mount to avoid SSR/hydration mismatch.
 */
import { useEffect, useState } from "react";

export type GreetingKey = "morning" | "afternoon" | "evening" | "night";

function getGreetingKey(): GreetingKey {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

const GREETINGS: Record<"en" | "ar", Record<GreetingKey, string>> = {
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good night",
  },
  ar: {
    morning: "صباح الخير",
    afternoon: "مساء الخير",
    evening: "مساء الخير",
    night: "ليلة سعيدة",
  },
};

const FALLBACK: Record<"en" | "ar", string> = { en: "Welcome", ar: "أهلاً" };

export function useGreeting(lang: "en" | "ar" = "en"): string {
  const [key, setKey] = useState<GreetingKey | null>(null);

  useEffect(() => {
    const recompute = () => {
      const next = getGreetingKey();
      setKey((prev) => (prev !== next ? next : prev));
    };
    recompute();
    const interval = window.setInterval(recompute, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") recompute(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recompute);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recompute);
    };
  }, []);

  if (key === null) return FALLBACK[lang];
  return GREETINGS[lang][key];
}

/** Returns both EN and AR strings — useful for bilingual ("both") UIs. */
export function useGreetingBilingual(): { en: string; ar: string } {
  const en = useGreeting("en");
  const ar = useGreeting("ar");
  return { en, ar };
}
