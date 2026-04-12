import { useState, useRef, useEffect } from "react";
import { MoreVertical, Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export interface HeaderMenuItem {
  icon: React.ReactNode;
  label: string;
  labelAr?: string;
  onClick: () => void;
  danger?: boolean;
}

interface HeaderMenuProps {
  items: HeaderMenuItem[];
}

const HeaderMenu = ({ items }: HeaderMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full flex items-center justify-center btn-press"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <MoreVertical size={16} color="white" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-[100] min-w-[180px] rounded-xl overflow-hidden animate-fade-in-up"
          style={{
            background: "var(--white)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid var(--gray-light)",
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] font-medium btn-press transition-colors"
              style={{
                color: item.danger ? "var(--error)" : "var(--navy)",
                borderBottom: i < items.length - 1 ? "1px solid var(--gray-light)" : "none",
              }}
            >
              {item.icon}
              <div className="flex-1">
                <span>{item.label}</span>
                {item.labelAr && (
                  <span className="font-arabic text-[10px] ml-1.5" style={{ color: "var(--gray)" }}>{item.labelAr}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { Copy, Share2, Download, Trash2, RefreshCw, FileText, Bell, Settings, HelpCircle };
export default HeaderMenu;
