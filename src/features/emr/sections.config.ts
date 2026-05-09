/**
 * EMR section metadata. Lives in its own module to avoid the circular import
 * that arises when sub-components and the barrel file both want the
 * `EMR_SECTIONS` constant.
 */

export type EmrSectionKey = "medication" | "laboratory" | "radiology" | "interventions";

export interface EmrSectionMeta {
  key: EmrSectionKey;
  labelEn: string;
  labelAr: string;
  emoji: string;
  /** DocRecord.category values that belong to this section. */
  categories: string[];
}

export const EMR_SECTIONS: EmrSectionMeta[] = [
  { key: "medication",    labelEn: "Medication",                 labelAr: "الأدوية",            emoji: "💊", categories: ["Prescriptions"] },
  { key: "laboratory",    labelEn: "Laboratory",                 labelAr: "المختبر",            emoji: "🔬", categories: ["Lab Results"] },
  { key: "radiology",     labelEn: "Radiology",                  labelAr: "الأشعة",             emoji: "🩻", categories: ["Imaging", "ECG / ECHO"] },
  { key: "interventions", labelEn: "Interventions & Procedures", labelAr: "التدخلات والإجراءات", emoji: "🩺", categories: ["Discharge", "Consultations"] },
];
