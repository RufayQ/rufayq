import { Building2 } from "lucide-react";

interface Props {
  orgName?: string;
  title: string;
  body?: string | null;
  bodyAr?: string | null;
  badge?: string;
  badgeColor?: string;
  createdAt: string;
  priority?: string;
}

const ProviderFeedCard = ({ orgName, title, body, bodyAr, badge, badgeColor, createdAt, priority }: Props) => {
  const isHigh = priority === "high" || priority === "urgent";
  const accent = isHigh ? "var(--error)" : "var(--teal-deep)";
  return (
    <div
      className="rounded-xl p-3 mb-2"
      style={{
        background: "var(--white)",
        border: `1px solid ${isHigh ? "rgba(217,79,79,0.4)" : "var(--gray-light)"}`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Building2 size={11} style={{ color: "var(--gold)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
          From {orgName || "your provider"}
        </span>
        {badge && (
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: badgeColor || "var(--teal-light)", color: "var(--teal-deep)" }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--navy)" }}>{title}</p>
      {body && <p className="text-[11px] leading-relaxed" style={{ color: "var(--gray)" }}>{body}</p>}
      {bodyAr && <p className="font-arabic text-[11px] leading-relaxed mt-1" dir="rtl" style={{ color: "var(--gray)" }}>{bodyAr}</p>}
      <p className="font-mono text-[9px] mt-1.5" style={{ color: "var(--gray)" }}>
        {new Date(createdAt).toLocaleString()}
      </p>
    </div>
  );
};

export default ProviderFeedCard;
