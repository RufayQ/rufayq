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
  /** Cross-tab navigation, e.g. AI Buddy deep-link into Chat with context. */
  onNavigate?: (tab: string, context?: string) => void;
}

const CareHubScreen = (props: CareHubScreenProps = {}) => {
  return <CareHubScreenInner onNavigate={props.onNavigate} />;
};

export default CareHubScreen;
