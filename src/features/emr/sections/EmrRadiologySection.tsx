import EmrSectionShell from "./EmrSectionShell";
import { EMR_SECTIONS } from "../index";

const meta = EMR_SECTIONS.find((s) => s.key === "radiology")!;

const EmrRadiologySection = (props: {
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
}) => (
  <EmrSectionShell
    titleEn={meta.labelEn}
    titleAr={meta.labelAr}
    emoji={meta.emoji}
    categories={meta.categories}
    emptyHintEn="No imaging studies on file."
    emptyHintAr="لا توجد دراسات تصوير شعاعي."
    {...props}
  />
);

export default EmrRadiologySection;
