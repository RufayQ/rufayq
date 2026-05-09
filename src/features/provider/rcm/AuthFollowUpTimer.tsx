/**
 * AuthFollowUpTimer — small inline control for an authorization request row.
 * Shows hours remaining until tat_due_at and lets staff push a follow-up via
 * the rcm_auth_follow_up DB function.
 */
import { useState } from "react";
import { Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import Can from "@/components/auth/Can";

interface Props {
  requestId: string;
  tatDueAt?: string | null;
  onFollowed?: () => void;
}

const formatRemaining = (iso?: string | null) => {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (isNaN(ms)) return "—";
  if (ms < 0) return `overdue by ${Math.round(-ms / 36e5)}h`;
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return `${h}h ${m}m left`;
};

const AuthFollowUpTimer = ({ requestId, tatDueAt, onFollowed }: Props) => {
  const [hours, setHours] = useState(24);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const overdue = tatDueAt ? new Date(tatDueAt).getTime() < Date.now() : false;

  const send = async () => {
    setBusy(true);
    const res = await providerClient.authorization.followUp(requestId, hours, note || undefined);
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(`Follow-up sent · TAT extended by ${hours}h`);
    setNote(""); onFollowed?.();
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px]">
        <Clock size={11} className={overdue ? "text-rose-400" : "text-amber-400"} />
        <span className={overdue ? "text-rose-300" : "text-amber-300"}>{formatRemaining(tatDueAt)}</span>
      </div>
      <Can action="provider.rcm.auth.followup">
        <div className="flex gap-1.5">
          <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 24)}
            className="w-16 px-2 py-1 rounded text-[11px] bg-slate-900 border border-slate-700 text-slate-100" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
            className="flex-1 px-2 py-1 rounded text-[11px] bg-slate-900 border border-slate-700 text-slate-100" />
          <button onClick={send} disabled={busy} className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50">
            <Send size={10} /> Follow up
          </button>
        </div>
      </Can>
    </div>
  );
};

export default AuthFollowUpTimer;
