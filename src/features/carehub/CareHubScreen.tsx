/**
 * Care Hub feature-module entry. Wraps the existing presentational
 * CareHubScreen so callers consume it through the feature boundary
 * (`@/features/carehub`) instead of reaching into `src/screens`.
 *
 * Splitting Care Hub into its own component layer matches the EMR module
 * pattern and makes it independently testable / lazy-loadable.
 */
import CareHubScreenInner from "@/screens/CareHubScreen";

export type CareHubSubTab =
  | "careplan" | "videos" | "education" | "faqs" | "nutrition" | "exercises";

export interface CareHubScreenProps {
  /** Reserved for future cross-tab nav (e.g. open scanner from a card). */
  onNavigate?: (tab: string, context?: string) => void;
}

const CareHubScreen = (_props: CareHubScreenProps = {}) => {
  return <CareHubScreenInner />;
};

export default CareHubScreen;
