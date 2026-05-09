import EmrSectionShell from "./EmrSectionShell";
import { EMR_SECTIONS } from "../index";

const meta = EMR_SECTIONS.find((s) => s.key === "medication")!;

const EmrMedicationSection = (props: {
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
}) => (
  <EmrSectionShell
    titleEn={meta.labelEn}
    titleAr={meta.labelAr}
    emoji={meta.emoji}
    categories={meta.categories}
    emptyHintEn="No prescriptions on file yet."
    emptyHintAr="لا توجد وصفات طبية بعد."
    {...props}
  />
);

export default EmrMedicationSection;
