/**
 * ClaimStatusTimeline — vertical timeline of status transitions for a single
 * claim. Entries stream in live as the underlying `usePatientClaims` realtime
 * subscription fires.
 *
 * Used inside `PatientClaimsDashboard`: each claim row can expand to reveal
 * its history.
 */
import { Clock, CheckCircle2, XCircle, AlertCircle, ShieldCheck, FileText } from "lucide-react";
import type { TimelineEntry } from "@/hooks/useClaimStatusTimeline";

const STATUS_META: Record<string, { label: string; tone: string; Icon: typeof Clock }> = {
  submitted:       { label: "Provider submitted request", tone: "text-slate-400 bg-slate-700/40", Icon: FileText },
  pending_admin:   { label: "Awaiting verification",      tone: "text-slate-300 bg-slate-700/60", Icon: Clock },
  pending_patient: { label: "Sent to you for consent",     tone: "text-amber-300 bg-amber-500/15", Icon: AlertCircle },
  approved:        { label: "Approved",                    tone: "text-emerald-300 bg-emerald-500/15", Icon: CheckCircle2 },
  rejected:        { label: "Rejected",                    tone: "text-rose-300 bg-rose-500/15", Icon: XCircle },
};

const fmt = (iso: string) => new Date(iso).toLocaleString();

interface Props {
  entries: TimelineEntry[];
}

export const ClaimStatusTimeline = ({ entries }: Props) => {
  if (entries.length === 0) {
    return <p className="text-[11px] text-slate-500 italic">No history yet.</p>;
  }

  return (
    <ol className="relative ms-1.5 ps-4 border-s border-slate-800 space-y-3">
      {entries.map((e, idx) => {
        const meta = STATUS_META[e.status] ?? {
          label: e.status,
          tone: "text-slate-300 bg-slate-700/60",
          Icon: ShieldCheck,
        };
        const { Icon } = meta;
        const isLatest = idx === entries.length - 1;
        return (
          <li key={`${e.status}-${e.at}-${idx}`} className="relative">
            <span
              className={`absolute -start-[26px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-950 ${meta.tone} ${isLatest && !e.synthetic ? "animate-pulse" : ""}`}
            >
              <Icon size={10} />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-200">{meta.label}</span>
              {!e.synthetic && (
                <span className="text-[9px] uppercase tracking-wider text-emerald-400">live</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">{fmt(e.at)}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default ClaimStatusTimeline;
