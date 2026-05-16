import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface HeaderMenuItem {
  icon: React.ReactNode;
  label: string;
  labelAr?: string;
  onClick: () => void;
  danger?: boolean;
}

interface HeaderMenuProps {
  items: HeaderMenuItem[];
  /** Optional title shown at the top of the sheet. */
  title?: string;
  titleAr?: string;
}

/**
 * Header overflow menu. Renders as a LinkedIn-style pull-up bottom sheet
 * for a consistent, scrollable, easy-to-reach UX across all screens.
 */
const HeaderMenu = ({ items, title = "Menu", titleAr = "القائمة" }: HeaderMenuProps) => {
  const [open, setOpen] = useState(false);
  const { showEn, showAr } = useLanguage();

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full flex items-center justify-center btn-press"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.10)" }}
        aria-label="Open menu"
      >
        <MoreVertical size={18} color="white" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-t-3xl pt-2 pb-3 animate-slide-up"
            style={{
              background: "var(--white)",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.25)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Grab handle */}
            <div className="mx-auto mb-2 mt-1 h-1.5 w-12 rounded-full" style={{ background: "var(--gray-light)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 shrink-0">
              <div>
                {showEn && (
                  <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{title}</p>
                )}
                {showAr && (
                  <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
                style={{ background: "var(--off-white)" }}
                aria-label="Close"
              >
                <X size={16} style={{ color: "var(--navy)" }} />
              </button>
            </div>

            {/* Items (scrollable) */}
            <div
              className="overflow-y-auto px-3 pt-1"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { item.onClick(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left btn-press"
                  style={{
                    color: item.danger ? "var(--error)" : "var(--navy)",
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: item.danger ? "rgba(220,53,69,0.10)" : "var(--off-white)",
                      color: item.danger ? "var(--error)" : "var(--teal-deep)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    {showEn && (
                      <span className="block text-[13.5px] font-semibold truncate" style={{ fontFamily: "'DM Sans'" }}>
                        {item.label}
                      </span>
                    )}
                    {showAr && item.labelAr && (
                      <span className="block font-arabic text-[11px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>
                        {item.labelAr}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export { Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle };
export default HeaderMenu;
