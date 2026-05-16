/**
 * AI Buddy — calls the `lifestyle-buddy` edge function for a freshly
 * generated bilingual nudge keyed by plan type and progress. Falls back to a
 * curated template pool if the gateway is unreachable or rate-limited.
 */

import { supabase } from "@/integrations/supabase/client";
import type { LifestylePlan } from "./lifestyleStore";

const FALLBACK: Record<string, { en: string; ar: string }[]> = {
  gym: [
    { en: "One rep at a time — your knee thanks you.", ar: "تكرار بعد تكرار، ركبتك تشكرك." },
    { en: "Halfway to this week's target. Keep moving.", ar: "في منتصف هدف الأسبوع. واصل التقدم." },
  ],
  nutrition: [
    { en: "Hydration first, then today's plate.", ar: "الترطيب أولاً ثم وجبة اليوم." },
    { en: "Small swaps, big recovery wins.", ar: "تغييرات صغيرة، انتصارات كبيرة في التعافي." },
  ],
  recreation: [
    { en: "A short walk outside resets everything.", ar: "نزهة قصيرة تعيد ضبط كل شيء." },
    { en: "Joy is part of the protocol.", ar: "الفرح جزء من بروتوكول التعافي." },
  ],
  fitness: [
    { en: "Mobility before intensity. You've got this.", ar: "المرونة قبل الشدة. أنت قادر." },
    { en: "Streak alive — show up for 10 minutes.", ar: "السلسلة مستمرة — كن حاضرًا لـ ١٠ دقائق." },
  ],
};

const pickFallback = (plan: LifestylePlan) => {
  const pool = FALLBACK[plan.type] ?? FALLBACK.fitness;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const fetchBuddyNudge = async (plan: LifestylePlan): Promise<{ en: string; ar: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke("lifestyle-buddy", {
      body: {
        type: plan.type,
        title: plan.title,
        weeklyTarget: plan.weeklyTarget,
        sessionsDone: plan.sessionsDone,
        streak: plan.streak,
      },
    });
    if (error || !data?.en || !data?.ar) throw error ?? new Error("empty");
    return { en: data.en, ar: data.ar };
  } catch {
    return pickFallback(plan);
  }
};

export const buildChatContext = (plan: LifestylePlan) =>
  `lifestyle-buddy:${plan.type}:${plan.id}:${plan.title}:${plan.sessionsDone}/${plan.weeklyTarget}`;
