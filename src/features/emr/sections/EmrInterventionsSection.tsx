import EmrSectionShell from "./EmrSectionShell";
import { EMR_SECTIONS } from "../sections.config";

const meta = EMR_SECTIONS.find((s) => s.key === "interventions")!;

const EmrInterventionsSection = (props: {
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
}) => (
  <EmrSectionShell
    titleEn={meta.labelEn}
    titleAr={meta.labelAr}
    emoji={meta.emoji}
    categories={meta.categories}
    emptyHintEn="No procedures or discharge notes yet."
    emptyHintAr="لا توجد إجراءات أو ملاحظات خروج بعد."
    {...props}
  />
);

export default EmrInterventionsSection;
