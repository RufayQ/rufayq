/**
 * Patient-visible dispute / review status timeline.
 *
 * Subscribes to `refund_disputes` + `refund_dispute_events` for the current
 * user (or device fallback) and renders a vertical timeline showing when an
 * admin flagged a cancellation, the review steps, and the outcome.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, XCircle, Hourglass, ScrollText } from "lucide-react";

interface Dispute {
  id: string;
  status: "open" | "under_review" | "approved" | "rejected" | "refunded";
  tier_at_open: string | null;
  elapsed_pct_at_open: number | null;
  preview_amount: number | null;
  resolved_amount: number | null;
  currency: string;
  reason: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface Event {
  id: string;
  dispute_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

interface Props {
  isAr: boolean;
  /** Pass either to scope the query — admin pages can pass both/neither. */
  userId?: string | null;
  deviceId?: string | null;
}

const STATUS_TONE: Record<string, string> = {
  open: "text-amber-300",
  under_review: "text-blue-300",
  approved: "text-emerald-300",
  refunded: "text-emerald-300",
  rejected: "text-rose-300",
};

const statusIcon = (s: string) => {
  if (s === "approved" || s === "refunded") return CheckCircle2;
  if (s === "rejected") return XCircle;
  if (s === "under_review") return Hourglass;
  return Clock;
};

const statusLabel = (s: string, isAr: boolean): string => {
  if (isAr) return ({
    open: "مفتوح", under_review: "قيد المراجعة", approved: "موافَق",
    refunded: "تم الاسترداد", rejected: "مرفوض",
  } as Record<string, string>)[s] ?? s;
  return s.replace(/_/g, " ");
};

export const RefundDisputeTimeline = ({ isAr, userId, deviceId }: Props) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("refund_disputes").select("*").order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    else if (deviceId) q = q.eq("device_id", deviceId);
    const { data: dRows } = await q.limit(20);
    const ds = (dRows || []) as Dispute[];
    setDisputes(ds);
    if (ds.length) {
      const { data: eRows } = await supabase.from("refund_dispute_events")
        .select("*").in("dispute_id", ds.map((d) => d.id))
        .order("created_at", { ascending: true });
      setEvents((eRows || []) as Event[]);
    } else {
      setEvents([]);
    }
    setLoading(false);
  }, [userId, deviceId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-xs text-slate-500">Loading…</p>;
  if (disputes.length === 0) {
    return (
      <p className="text-xs text-slate-500" dir={isAr ? "rtl" : "ltr"}>
        {isAr ? "لا توجد مراجعات استرداد." : "No refund reviews on file."}
      </p>
    );
  }

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {disputes.map((d) => {
        const items = events.filter((e) => e.dispute_id === d.id);
        const Icon = statusIcon(d.status);
        return (
          <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ScrollText size={14} className="text-amber-300" />
                <p className="text-xs font-semibold text-slate-200">
                  {isAr ? "مراجعة استرداد" : "Refund review"}
                </p>
                <span className={`text-[10px] font-mono uppercase ${STATUS_TONE[d.status] ?? "text-slate-300"}`}>
                  <Icon size={10} className="inline -mt-0.5 mr-1" />
                  {statusLabel(d.status, isAr)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(d.created_at).toLocaleDateString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 mb-2">
              <div>
                <p className="uppercase tracking-wide text-slate-600">{isAr ? "النسبة المنقضية" : "Elapsed"}</p>
                <p className="text-slate-200 font-mono">{d.elapsed_pct_at_open?.toFixed(1) ?? "—"}%</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-600">{isAr ? "المبلغ المتوقع" : "Preview"}</p>
                <p className="text-slate-200 font-mono">{d.currency} {Number(d.preview_amount ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="uppercase tracking-wide text-slate-600">{isAr ? "المبلغ النهائي" : "Resolved"}</p>
                <p className="text-emerald-300 font-mono">
                  {d.resolved_amount != null ? `${d.currency} ${Number(d.resolved_amount).toFixed(2)}` : "—"}
                </p>
              </div>
            </div>

            <ol className="relative border-l border-slate-800 ml-2 pl-3 space-y-2">
              {items.map((e) => (
                <li key={e.id} className="text-[11px]">
                  <span className="absolute -left-[5px] mt-1 w-2 h-2 rounded-full bg-amber-400" />
                  <p className="text-slate-300">
                    {e.event_type === "opened"
                      ? (isAr ? "فُتحت المراجعة" : "Review opened")
                      : `${statusLabel(e.from_status ?? "", isAr)} → ${statusLabel(e.to_status ?? "", isAr)}`}
                  </p>
                  {e.note && <p className="text-slate-500 italic">{e.note}</p>}
                  <p className="text-[10px] text-slate-600">{new Date(e.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ol>

            {d.resolution_note && (
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                <span className="text-slate-500">{isAr ? "ملاحظة" : "Note"}: </span>{d.resolution_note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
