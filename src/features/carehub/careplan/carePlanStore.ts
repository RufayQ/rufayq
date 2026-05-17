/**
 * Care Plan tasks store — localStorage-backed CRUD with `storage` event
 * fan-out so multiple panels stay in sync. Cache-first; promotable to
 * Supabase later without changing call sites (mirrors lifestyleStore).
 */

export type CarePlanCategory =
  | "medication"
  | "exercise"
  | "wound"
  | "vitals"
  | "hydration"
  | "rest"
  | "custom";

export interface CarePlanTask {
  id: string;
  en: string;
  ar?: string;
  category: CarePlanCategory;
  time?: string; // HH:MM
  repeat?: "daily" | "weekdays" | "custom";
  days?: string[]; // ["Mon","Wed",...] when repeat === "custom"
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CARE_CATEGORIES: { key: CarePlanCategory; emoji: string; en: string; ar: string }[] = [
  { key: "medication", emoji: "💊", en: "Medication", ar: "دواء" },
  { key: "exercise", emoji: "🏃", en: "Exercise", ar: "تمرين" },
  { key: "wound", emoji: "🩹", en: "Wound Care", ar: "عناية بالجرح" },
  { key: "vitals", emoji: "🌡️", en: "Vitals", ar: "علامات حيوية" },
  { key: "hydration", emoji: "💧", en: "Hydration", ar: "ترطيب" },
  { key: "rest", emoji: "😴", en: "Rest", ar: "راحة" },
  { key: "custom", emoji: "✨", en: "Custom", ar: "مخصص" },
];

const KEY = "rufayq_care_plan_tasks";

const STARTER: CarePlanTask[] = [
  { id: "s-meds-am", en: "Morning meds", ar: "أدوية الصباح", category: "medication", time: "08:00", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "s-elev", en: "Elevate leg 30 min", ar: "رفع الرجل ٣٠ دقيقة", category: "rest", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "s-cold", en: "Cold compress", ar: "كمادة باردة", category: "wound", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "s-breath", en: "Breathing exercises", ar: "تمارين التنفس", category: "exercise", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "s-meds-pm", en: "Evening meds", ar: "أدوية المساء", category: "medication", time: "20:00", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "s-pain", en: "Log pain level", ar: "تسجيل مستوى الألم", category: "vitals", repeat: "daily", done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const read = (): CarePlanTask[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CarePlanTask[];
  } catch {
    return [];
  }
};

const write = (tasks: CarePlanTask[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(tasks));
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
};

export const carePlanStore = {
  list: () => read(),
  add: (t: Omit<CarePlanTask, "id" | "done" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const next: CarePlanTask = {
      ...t,
      id: crypto.randomUUID(),
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    write([...read(), next]);
    return next;
  },
  toggle: (id: string) => {
    const now = new Date().toISOString();
    write(read().map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: now } : t)));
  },
  remove: (id: string) => write(read().filter((t) => t.id !== id)),
  resetAll: () => write([]),
  seedStarter: () => {
    if (read().length === 0) write(STARTER);
  },
};

export const subscribeCarePlan = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};
