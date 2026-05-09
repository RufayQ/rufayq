/**
 * VoidClaimDialog — destructive guard that requires typing "VOID" before
 * marking a claim void. Visible to provider_admin only.
 */
import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import Can from "@/components/auth/Can";

interface Props { claimId: string; claimNo: string; onVoided?: () => void }

const VoidClaimDialog = ({ claimId, claimNo, onVoided }: Props) => {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (confirm !== "VOID") { toast.error('Type VOID to confirm'); return; }
    setBusy(true);
    const res = await providerClient.claim.voidClaim(claimId);
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(`Claim ${claimNo} voided`);
    setOpen(false); setConfirm("");
    onVoided?.();
  };

  return (
    <Can action="provider.rcm.claim.void">
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-semibold flex items-center gap-1">
          <AlertOctagon size={11} /> Void
        </button>
      ) : (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-2 space-y-2 max-w-xs">
          <p className="text-[11px] text-rose-300">Type <strong>VOID</strong> to void claim {claimNo}. This cannot be undone.</p>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-2 py-1 rounded text-[11px] bg-slate-900 border border-slate-700 text-slate-100" />
          <div className="flex gap-1.5">
            <button onClick={run} disabled={busy || confirm !== "VOID"}
              className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] font-semibold disabled:opacity-40">
              {busy ? "…" : "Confirm void"}
            </button>
            <button onClick={() => { setOpen(false); setConfirm(""); }} className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px]">Cancel</button>
          </div>
        </div>
      )}
    </Can>
  );
};

export default VoidClaimDialog;
