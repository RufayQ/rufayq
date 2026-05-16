/**
 * Lifestyle plans store — localStorage-backed CRUD with `storage` event
 * fan-out so multiple cards/tabs stay in sync. v1 is client-only; can be
 * promoted to Supabase later without changing call sites.
 */

export type LifestylePlanType = "gym" | "nutrition" | "recreation" | "fitness";

export interface LifestylePlan {
  id: string;
  type: LifestylePlanType;
  title: string;
  titleAr?: string;
  weeklyTarget: number;
  sessionsDone: number;
  streak: number;
  reminderTime?: string;
  scheduleDays?: string[]; // ["Mon","Wed","Fri"]
  createdAt: string;
  updatedAt: string;
}

const KEY = "rufayq_lifestyle_plans";

const STARTERS: LifestylePlan[] = [
  {
    id: "starter-gym",
    type: "gym",
    title: "Recovery Strength",
    titleAr: "تقوية التعافي",
    weeklyTarget: 3,
    sessionsDone: 1,
    streak: 1,
    reminderTime: "07:00",
    scheduleDays: ["Mon", "Wed", "Fri"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "starter-nutrition",
    type: "nutrition",
    title: "Mediterranean Plan",
    titleAr: "نظام البحر المتوسط",
    weeklyTarget: 21,
    sessionsDone: 9,
    streak: 5,
    reminderTime: "08:00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const read = (): LifestylePlan[] => {
  if (typeof window === "undefined") return STARTERS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(STARTERS));
      return STARTERS;
    }
    return JSON.parse(raw) as LifestylePlan[];
  } catch {
    return STARTERS;
  }
};

const write = (plans: LifestylePlan[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plans));
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
};

export const lifestyleStore = {
  list: (type?: LifestylePlanType) => {
    const all = read();
    return type ? all.filter((p) => p.type === type) : all;
  },
  add: (plan: Omit<LifestylePlan, "id" | "createdAt" | "updatedAt" | "sessionsDone" | "streak">) => {
    const now = new Date().toISOString();
    const next: LifestylePlan = {
      ...plan,
      id: crypto.randomUUID(),
      sessionsDone: 0,
      streak: 0,
      createdAt: now,
      updatedAt: now,
    };
    write([...read(), next]);
    return next;
  },
  logSession: (id: string) => {
    const all = read();
    const next = all.map((p) =>
      p.id === id
        ? { ...p, sessionsDone: p.sessionsDone + 1, streak: p.streak + 1, updatedAt: new Date().toISOString() }
        : p,
    );
    write(next);
  },
  remove: (id: string) => {
    write(read().filter((p) => p.id !== id));
  },
};

export const subscribeLifestyle = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};
