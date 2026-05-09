import EmrSectionShell from "./EmrSectionShell";
import { EMR_SECTIONS } from "../sections.config";

const meta = EMR_SECTIONS.find((s) => s.key === "laboratory")!;

const EmrLaboratorySection = (props: {
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
}) => (
  <EmrSectionShell
    titleEn={meta.labelEn}
    titleAr={meta.labelAr}
    emoji={meta.emoji}
    categories={meta.categories}
    emptyHintEn="No lab results uploaded yet."
    emptyHintAr="لم تُرفع نتائج تحاليل بعد."
    {...props}
  />
);

export default EmrLaboratorySection;
