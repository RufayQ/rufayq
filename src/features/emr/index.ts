/**
 * EMR (Electronic Medical Record) — patient-facing module.
 *
 * Composes the existing RecordsScreen with category-scoped sub-views so that
 * each clinical surface (Medication, Laboratory, Radiology, Interventions &
 * Procedures) lives in its own component layer and can be evolved
 * independently.
 *
 * The sub-components are intentionally thin: they delegate rendering to the
 * shared RecordsScreen via a `categoryScope` filter, keeping data-fetching
 * and UI patterns DRY while exposing clean component boundaries for tests
 * and feature work.
 */

export { default as EmrScreen } from "./EmrScreen";
export { default as EmrMedicationSection } from "./sections/EmrMedicationSection";
export { default as EmrLaboratorySection } from "./sections/EmrLaboratorySection";
export { default as EmrRadiologySection } from "./sections/EmrRadiologySection";
export { default as EmrInterventionsSection } from "./sections/EmrInterventionsSection";

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
  {
    key: "medication",
    labelEn: "Medication",
    labelAr: "الأدوية",
    emoji: "💊",
    categories: ["Prescriptions"],
  },
  {
    key: "laboratory",
    labelEn: "Laboratory",
    labelAr: "المختبر",
    emoji: "🔬",
    categories: ["Lab Results"],
  },
  {
    key: "radiology",
    labelEn: "Radiology",
    labelAr: "الأشعة",
    emoji: "🩻",
    categories: ["Imaging", "ECG / ECHO"],
  },
  {
    key: "interventions",
    labelEn: "Interventions & Procedures",
    labelAr: "التدخلات والإجراءات",
    emoji: "🩺",
    categories: ["Discharge", "Consultations"],
  },
];
