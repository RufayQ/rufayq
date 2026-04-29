/**
 * Admin payout dialog — debits the patient wallet to record a bank or
 * manual transfer. Either reference number OR receipt upload is required
 * (per project decision); both are accepted.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Upload, Banknote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string | null;
  deviceId: string | null;
  walletBalance: number;
  currency: string;
  /** Optional: link this payout to an open dispute. */
  disputeId?: string | null;
  onClose: () => void;
  onDone: () => void;
}

export const AdminPayoutDialog = ({
  userId, deviceId, walletBalance, currency, disputeId, onClose, onDone,
}: Props) => {
  const [amount, setAmount] = useState(walletBalance);
  const [method, setMethod] = useState<"bank" | "manual" | "cash">("bank");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = amount > 0
    && amount <= walletBalance
    && (reference.trim().length > 0 || !!file);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    let uploadedPath: string | null = null;
    if (file) {
      const path = `payouts/${userId || deviceId || "anon"}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("payment-receipts").upload(path, file);
      if (up.error) {
        toast.error(up.error.message);
        setBusy(false);
        return;
      }
      uploadedPath = up.data.path;
    }
    const { error } = await supabase.rpc("admin_record_payout", {
      _user_id: userId,
      _device_id: deviceId,
      _amount: amount,
      _currency: currency,
      _method: method,
      _reference_no: reference || null,
      _receipt_file_path: uploadedPath,
      _notes: notes || null,
      _dispute_id: disputeId ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payout recorded · ${currency} ${amount.toFixed(2)}`);
    onDone();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-[92%] max-w-md rounded-2xl bg-[#0D1B2A] border border-amber-500/30 p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Banknote size={16} className="text-amber-300" />
          <h3 className="text-base font-semibold text-amber-300">Record bank/manual payout</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Wallet balance: <span className="font-mono text-slate-200">{currency} {walletBalance.toFixed(2)}</span>.
          This will <strong>debit the wallet</strong> and post a receipt-linked transaction.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Amount ({currency})</label>
            <input type="number" step="0.01" min={0} max={walletBalance} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"/>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Method</label>
            <div className="flex gap-1 mt-1 p-1 bg-slate-900/60 rounded-lg">
              {(["bank", "manual", "cash"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`flex-1 text-xs py-1.5 rounded ${method === m ? "bg-amber-500/20 text-amber-300" : "text-slate-400"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Reference number</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. SAR-IBAN-IPS-839201"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"/>
            <p className="text-[10px] text-slate-500 mt-1">Reference OR receipt file is required.</p>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <Upload size={11}/> Upload receipt (optional)
            </label>
            <input type="file" accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-slate-300 mt-1 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-800 file:text-slate-200"/>
            {file && <p className="text-[10px] text-slate-400 mt-1 truncate">{file.name}</p>}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Internal note</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer settled — disputes cleared."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"/>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">
            Cancel
          </button>
          <button disabled={!valid || busy} onClick={submit}
            className="flex-1 px-3 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium disabled:opacity-30 inline-flex items-center justify-center gap-1.5">
            {busy && <Loader2 size={12} className="animate-spin"/>}
            Record {currency} {amount.toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
