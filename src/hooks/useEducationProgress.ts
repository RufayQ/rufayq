import { useDomainData } from "./useDomainData";
import { educationApi, type EducationProgressRow } from "@/lib/api/educationApi";
export const useEducationProgress = () => useDomainData<EducationProgressRow>(educationApi);
