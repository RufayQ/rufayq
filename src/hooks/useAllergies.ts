import { useDomainData } from "./useDomainData";
import { allergyApi, type AllergyRow } from "@/lib/api/allergyApi";
export const useAllergies = () => useDomainData<AllergyRow>(allergyApi);
