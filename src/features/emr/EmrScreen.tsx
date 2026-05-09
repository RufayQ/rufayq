import { useRef, useState, type KeyboardEvent } from "react";
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

const tabId = (k: EmrSectionKey) => `emr-tab-${k}`;
const panelId = (k: EmrSectionKey) => `emr-panel-${k}`;

/**
 * EMR mega-component. Renders an ARIA-compliant tablist (roving tabindex,
 * arrow-key navigation, Home/End) and swaps the active section component.
 * Each section is fully isolated and individually testable.
 */
const EmrScreen = ({ onOpenScanner, onNavigate, initialSection = "medication" }: Props) => {
  const [active, setActive] = useState<EmrSectionKey>(initialSection);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (key: EmrSectionKey) => {
    setActive(key);
    // Defer focus so the new tab has the correct tabIndex applied.
    requestAnimationFrame(() => tabRefs.current[key]?.focus());
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = EMR_SECTIONS.findIndex((s) => s.key === active);
    if (idx < 0) return;
    let next = idx;
    switch (e.key) {
      case "ArrowRight": next = (idx + 1) % EMR_SECTIONS.length; break;
      case "ArrowLeft":  next = (idx - 1 + EMR_SECTIONS.length) % EMR_SECTIONS.length; break;
      case "Home":       next = 0; break;
      case "End":        next = EMR_SECTIONS.length - 1; break;
      default: return;
    }
    e.preventDefault();
    focusTab(EMR_SECTIONS[next].key);
  };

  return (
    <div className="flex flex-col flex-1 h-0">
      <div
        className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0"
        style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}
        role="tablist"
        aria-label="Electronic Medical Record sections"
        aria-orientation="horizontal"
      >
        {EMR_SECTIONS.map((s) => {
          const on = s.key === active;
          return (
            <button
              key={s.key}
              ref={(el) => { tabRefs.current[s.key] = el; }}
              id={tabId(s.key)}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={panelId(s.key)}
              tabIndex={on ? 0 : -1}
              onKeyDown={onTabKeyDown}
              onClick={() => setActive(s.key)}
              className="px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap btn-press flex items-center gap-1 focus:outline-none focus-visible:ring-2"
              style={{
                background: on ? "var(--teal-deep)" : "var(--off-white)",
                color: on ? "var(--white)" : "var(--navy)",
                border: "1px solid var(--gray-light)",
                fontWeight: on ? 600 : 400,
              }}
            >
              <span aria-hidden>{s.emoji}</span>
              <span>{s.labelEn}</span>
              <span className="font-arabic" dir="rtl" aria-hidden>· {s.labelAr}</span>
            </button>
          );
        })}
      </div>

      <div
        className="flex-1 h-0 overflow-hidden"
        role="tabpanel"
        id={panelId(active)}
        aria-labelledby={tabId(active)}
      >
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
