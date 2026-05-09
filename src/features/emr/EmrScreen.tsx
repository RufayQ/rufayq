import { useState } from "react";
import { EMR_SECTIONS, type EmrSectionKey } from "./index";
import EmrMedicationSection from "./sections/EmrMedicationSection";
import EmrLaboratorySection from "./sections/EmrLaboratorySection";
import EmrRadiologySection from "./sections/EmrRadiologySection";
import EmrInterventionsSection from "./sections/EmrInterventionsSection";

interface Props {
  onOpenScanner?: () => void;
  onNavigate?: (tab: string, context?: string) => void;
  initialSection?: EmrSectionKey;
}

/**
 * EMR mega-component. Renders a sub-tab strip and swaps the active section
 * component, each of which is fully isolated and individually testable.
 */
const EmrScreen = ({ onOpenScanner, onNavigate, initialSection = "medication" }: Props) => {
  const [active, setActive] = useState<EmrSectionKey>(initialSection);

  return (
    <div className="flex flex-col flex-1 h-0">
      <div
        className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0"
        style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}
        role="tablist"
        aria-label="Electronic Medical Record sections"
      >
        {EMR_SECTIONS.map((s) => {
          const on = s.key === active;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(s.key)}
              className="px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap btn-press flex items-center gap-1"
              style={{
                background: on ? "var(--teal-deep)" : "var(--off-white)",
                color: on ? "var(--white)" : "var(--navy)",
                border: "1px solid var(--gray-light)",
                fontWeight: on ? 600 : 400,
              }}
            >
              <span>{s.emoji}</span>
              <span>{s.labelEn}</span>
              <span className="font-arabic" dir="rtl">· {s.labelAr}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 h-0 overflow-hidden">
        {active === "medication" && (
          <EmrMedicationSection onOpenScanner={onOpenScanner} onNavigate={onNavigate} />
        )}
        {active === "laboratory" && (
          <EmrLaboratorySection onOpenScanner={onOpenScanner} onNavigate={onNavigate} />
        )}
        {active === "radiology" && (
          <EmrRadiologySection onOpenScanner={onOpenScanner} onNavigate={onNavigate} />
        )}
        {active === "interventions" && (
          <EmrInterventionsSection onOpenScanner={onOpenScanner} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
};

export default EmrScreen;
