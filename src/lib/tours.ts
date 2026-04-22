/**
 * tours.ts — Central registry for all guided tours in the app.
 *
 * Three tour kinds:
 *  • welcome  → 6-step full walkthrough shown once after signup (existing flow)
 *  • feature  → multi-step bottomsheet shown once per app version when a new
 *               capability ships (e.g. "Medical Consultant" in v1.1.0)
 *  • element  → tiny 1–2 step coach-mark shown the first time a user taps a
 *               specific surface (e.g. Care Hub tab)
 *
 * Persistence is localStorage-only (no server). Keys are namespaced per user
 * id so multiple accounts on one device don't collide.
 *
 * Adding a new tour: append to TOURS below — no other wiring required for
 * feature/element tours; the Help section auto-lists them.
 */

export type TourKind = "welcome" | "feature" | "element";

export interface TourStep {
  /** Lucide icon name OR emoji glyph. Resolved by TourRunner. */
  icon: string;
  badgeEn: string;
  badgeAr: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  /** CSS color or token, e.g. "var(--gold)". Defaults to gold. */
  accent?: string;
}

export interface TourConfig {
  /** Stable id used as the localStorage key suffix. */
  id: string;
  kind: TourKind;
  /** App version this tour was introduced in. Only relevant for `feature`. */
  version?: string;
  /** Shown in Help → "App Tour Guides". */
  titleEn: string;
  titleAr: string;
  /** Short blurb for the Help list. */
  descEn: string;
  descAr: string;
  steps: TourStep[];
}

/** Current app version — bump when shipping a feature tour. */
export const APP_VERSION = "1.1.0";

export const TOURS: TourConfig[] = [
  {
    id: "welcome",
    kind: "welcome",
    titleEn: "Quick Start Guide",
    titleAr: "جولة البداية السريعة",
    descEn: "A 7-step tour of the whole app — Home, Journey, Records, Care Hub, Chat.",
    descAr: "جولة من 7 خطوات لكل التطبيق — الرئيسية، الرحلة، الملفات، الرعاية، المساعد.",
    steps: [], // welcome steps still live inside TourGuide.tsx for now
  },
  {
    id: "feature_medical_consultant_v1_1_0",
    kind: "feature",
    version: "1.1.0",
    titleEn: "New: Medical Consultant",
    titleAr: "جديد: المستشار الطبي",
    descEn: "Meet the new bilingual AI consultant for second opinions and report explanations.",
    descAr: "تعرّف على المستشار الذكي الجديد للرأي الثاني وشرح التقارير.",
    steps: [
      {
        icon: "✨",
        badgeEn: "WHAT'S NEW",
        badgeAr: "جديد",
        titleEn: "Medical Consultant",
        titleAr: "المستشار الطبي",
        bodyEn: "A new AI consultant trained on multilingual medical reports — ask in Arabic or English and get instant clinical-grade explanations.",
        bodyAr: "مستشار ذكي جديد مدرَّب على التقارير الطبية متعددة اللغات — اسأل بالعربية أو الإنجليزية واحصل على شرح بمستوى سريري.",
        accent: "var(--gold)",
      },
      {
        icon: "💬",
        badgeEn: "HOW TO USE",
        badgeAr: "كيف تستخدمه",
        titleEn: "Open it from Chat",
        titleAr: "افتحه من المساعد",
        bodyEn: "Tap the Chat tab, then choose 'Medical Consultant' from the assistant menu. Attach any record from your vault.",
        bodyAr: "اضغط تبويب المساعد، ثم اختر «المستشار الطبي» من قائمة المساعدين. أرفق أي ملف من خزنتك.",
        accent: "var(--teal-deep)",
      },
    ],
  },
  {
    id: "element_care_hub",
    kind: "element",
    titleEn: "Care Hub Tour",
    titleAr: "جولة مركز الرعاية",
    descEn: "What you'll find inside Care Hub: care plan, vitals, exercises, FAQs.",
    descAr: "ما ستجده في مركز الرعاية: خطة الرعاية، المؤشرات، التمارين، الأسئلة.",
    steps: [
      {
        icon: "🏥",
        badgeEn: "CARE HUB",
        badgeAr: "مركز الرعاية",
        titleEn: "Your recovery, organized",
        titleAr: "تعافيك، منظّم",
        bodyEn: "Care plan tasks, daily vitals, guided exercises, patient education, and milestones — everything for post-treatment care.",
        bodyAr: "مهام خطة الرعاية، المؤشرات اليومية، التمارين الموجّهة، التثقيف الصحي، والإنجازات — كل ما يلزم بعد العلاج.",
        accent: "var(--teal-deep)",
      },
    ],
  },
  {
    id: "element_records",
    kind: "element",
    titleEn: "Records Vault Tour",
    titleAr: "جولة خزنة الملفات",
    descEn: "How to scan, upload, and organize medical documents.",
    descAr: "كيف تمسح وترفع وتنظم الوثائق الطبية.",
    steps: [
      {
        icon: "📄",
        badgeEn: "RECORDS",
        badgeAr: "ملفاتي",
        titleEn: "Your medical vault",
        titleAr: "خزنتك الطبية",
        bodyEn: "Tap '+ Scan' to digitize prescriptions, labs, and reports. Everything is encrypted and searchable.",
        bodyAr: "اضغط «+ مسح» لرقمنة الوصفات والتحاليل والتقارير. كل شيء مشفّر وقابل للبحث.",
        accent: "var(--gold)",
      },
    ],
  },
];

// ───── localStorage helpers ─────

const KEY_VERSION_SEEN = (uid: string) => `rufayq_tour_version_${uid}`;
const KEY_TOUR_DONE = (uid: string, tourId: string) => `rufayq_tour_${tourId}_${uid}`;
const KEY_ELEMENT_TAPPED = (uid: string, elementId: string) => `rufayq_el_${elementId}_${uid}`;

export const getTour = (id: string) => TOURS.find((t) => t.id === id);

/** Has the user seen any feature tour for this version yet? */
export const hasSeenVersion = (uid: string, version: string) => {
  try { return localStorage.getItem(KEY_VERSION_SEEN(uid)) === version; }
  catch { return false; }
};

export const markVersionSeen = (uid: string, version: string) => {
  try { localStorage.setItem(KEY_VERSION_SEEN(uid), version); } catch { /* noop */ }
};

export const isTourDone = (uid: string, tourId: string) => {
  try { return localStorage.getItem(KEY_TOUR_DONE(uid, tourId)) === "1"; }
  catch { return false; }
};

export const markTourDoneInStorage = (uid: string, tourId: string) => {
  try { localStorage.setItem(KEY_TOUR_DONE(uid, tourId), "1"); } catch { /* noop */ }
};

export const clearTourDone = (uid: string, tourId: string) => {
  try { localStorage.removeItem(KEY_TOUR_DONE(uid, tourId)); } catch { /* noop */ }
};

export const isElementTapped = (uid: string, elementId: string) => {
  try { return localStorage.getItem(KEY_ELEMENT_TAPPED(uid, elementId)) === "1"; }
  catch { return false; }
};

export const markElementTapped = (uid: string, elementId: string) => {
  try { localStorage.setItem(KEY_ELEMENT_TAPPED(uid, elementId), "1"); } catch { /* noop */ }
};

/** Pick the next pending feature tour for this user (or null). */
export const pendingFeatureTour = (uid: string): TourConfig | null => {
  if (hasSeenVersion(uid, APP_VERSION)) return null;
  const candidate = TOURS.find(
    (t) => t.kind === "feature" && t.version === APP_VERSION && !isTourDone(uid, t.id),
  );
  return candidate || null;
};
