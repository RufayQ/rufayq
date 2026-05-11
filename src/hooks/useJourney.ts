import { useDomainData } from "./useDomainData";
import { journeyApi, type JourneyRow } from "@/lib/api/journeyApi";
export const useJourney = () => useDomainData<JourneyRow>(journeyApi);
