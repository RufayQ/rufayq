import { toast } from "sonner";
import { X, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { cancelCampaign, sendCampaignNow, type PushCampaign } from "@/hooks/useAdminPushCampaigns";

interface Props { items: PushCampaign[]; loading: boolean; reload: () => void }

const statusBadge = (s: PushCampaign["status"]) => {
  const map: Record<typeof s, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    sending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    sent: "bg-green-500/15 text-green-600 dark:text-green-400",
    failed: "bg-red-500/15 text-red-600 dark:text-red-400",
    cancelled: "bg-muted text-muted-foreground",
  } as Record<PushCampaign["status"], string>;
  return map[s];
};

const audienceText = (c: PushCampaign) => {
  const a = c.audience;
  if (a.all) return "All users";
  const bits: string[] = [];
  if (a.countries?.length) bits.push(a.countries.join(", "));
  if (a.plans?.length) bits.push(`Plans: ${a.plans.join(",")}`);
  if (a.roles?.length) bits.push(a.roles.join("+"));
  return bits.join(" · ") || "—";
};

export default function CampaignHistory({ items, loading, reload }: Props) {
  const handleCancel = async (id: string) => {
    try { await cancelCampaign(id); toast.success("Cancelled"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const handleSendDraft = async (id: string) => {
    try { const r = await sendCampaignNow(id); toast.success(`Sent to ${r.delivered}`); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No campaigns yet.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Audience</th>
            <th className="px-3 py-2">Reach</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t border-border hover:bg-muted/20">
              <td className="px-3 py-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(c.status)}`}>
                  {c.status === "scheduled" && <Clock className="h-3 w-3" />}
                  {c.status === "sent" && <CheckCircle2 className="h-3 w-3" />}
                  {c.status === "failed" && <AlertCircle className="h-3 w-3" />}
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2 max-w-[240px]">
                <div className="font-medium truncate">{c.title}</div>
                {c.title_ar && <div className="text-xs text-muted-foreground truncate" dir="rtl">{c.title_ar}</div>}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate">{audienceText(c)}</td>
              <td className="px-3 py-2 tabular-nums text-xs">
                {c.delivered_count}/{c.audience_size || "—"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {c.sent_at ? new Date(c.sent_at).toLocaleString()
                  : c.scheduled_at ? `→ ${new Date(c.scheduled_at).toLocaleString()}`
                  : new Date(c.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                {c.status === "scheduled" && (
                  <button onClick={() => handleCancel(c.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                    <X className="h-3 w-3" /> Cancel
                  </button>
                )}
                {c.status === "draft" && (
                  <button onClick={() => handleSendDraft(c.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Send className="h-3 w-3" /> Send
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
