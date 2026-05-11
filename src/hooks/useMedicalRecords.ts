import { useDomainData } from "./useDomainData";
import { medicalRecordApi, type MedicalRecordRow } from "@/lib/api/medicalRecordApi";
export const useMedicalRecords = () => useDomainData<MedicalRecordRow>(medicalRecordApi);
