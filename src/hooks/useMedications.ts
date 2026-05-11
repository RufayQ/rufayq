import { useDomainData } from "./useDomainData";
import { medicationApi, type MedicationRow } from "@/lib/api/medicationApi";
export const useMedications = () => useDomainData<MedicationRow>(medicationApi);
