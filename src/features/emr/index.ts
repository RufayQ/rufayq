/**
 * EMR (Electronic Medical Record) — patient-facing module.
 *
 * Composes the existing RecordsScreen with category-scoped sub-views so that
 * each clinical surface (Medication, Laboratory, Radiology, Interventions &
 * Procedures) lives in its own component layer and can be evolved
 * independently.
 */

export { default as EmrScreen } from "./EmrScreen";
export { default as EmrMedicationSection } from "./sections/EmrMedicationSection";
export { default as EmrLaboratorySection } from "./sections/EmrLaboratorySection";
export { default as EmrRadiologySection } from "./sections/EmrRadiologySection";
export { default as EmrInterventionsSection } from "./sections/EmrInterventionsSection";
export { EMR_SECTIONS } from "./sections.config";
export type { EmrSectionKey, EmrSectionMeta } from "./sections.config";
