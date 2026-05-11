import { useDomainData } from "./useDomainData";
import { carePlanApi, type CarePlanRow } from "@/lib/api/carePlanApi";
export const useCarePlan = () => useDomainData<CarePlanRow>(carePlanApi);
