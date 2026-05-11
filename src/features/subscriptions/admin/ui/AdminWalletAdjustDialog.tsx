/**
 * AdminWalletAdjustDialog — secure manual credit/debit for a patient wallet.
 *
 * Calls the `admin_adjust_wallet` RPC, which is admin-gated server-side and
 * inserts wallet_transactions, wallet_audit_log, and a patient notification
 * atomically.
 *
 * Use cases: bonuses, corrections, ad-hoc payouts, duplicate-credit reversals.
 * For structured bank payouts with receipts, prefer AdminPayoutDialog.
 */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, Loader2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Direction = "credit" | "debit";
type CreditKind = "bonus_credit" | "correction_credit" | "manual_credit";
type DebitKind = "bank_payout" | "correction_debit" | "duplicate_reversal" | "manual_debit";
type Kind = CreditKind | DebitKind;

const CREDIT_KINDS: { value: CreditKind; label: string }[] = [
  { value: "bonus_credit", label: "Bonus credit" },
  { value: "correction_credit", label: "Correction credit" },
  { value: "manual_credit", label: "Manual credit" },
];

const DEBIT_KINDS: { value: DebitKind; label: string }[] = [
  { value: "bank_payout", label: "Bank payout (ad-hoc)" },
  { value: "correction_debit", label: "Correction debit" },
  { value: "duplicate_reversal", label: "Duplicate-credit reversal" },
  { value: "manual_debit", label: "Manual debit" },
];

interface Props {
  userId: string | null;
  deviceId: string | null;
  currency: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminWalletAdjustDialog = ({
  userId, deviceId, currency, currentBalance, onClose, onSuccess,
}: Props) => {
  const [direction, setDirection] = useState<Direction>("credit");
  const [kind, setKind] = useState<Kind>("bonus_credit");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [busy, setBusy] = useState(false);

  const kindOptions = direction === "credit" ? CREDIT_KINDS : DEBIT_KINDS;

  const switchDirection = (d: Direction) => {
    setDirection(d);
    setKind(d === "credit" ? "bonus_credit" : "bank_payout");
  };

  const reasonTrim = reason.trim();
  const overdraw = direction === "debit" && amount > currentBalance;
  const valid = useMemo(() => (
    amount > 0
    && amount <= 1_000_000
    && reasonTrim.length >= 3
    && reasonTrim.length <= 500
    && !overdraw
  ), [amount, reasonTrim, overdraw]);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_adjust_wallet", {
      _user_id: userId,
      _device_id: deviceId,
      _direction: direction,
      _amount: amount,
      _currency: currency,
      _kind: kind,
      _reason: reasonTrim,
      _reference_no: referenceNo.trim() || null,
      _details: {},
    });
    setBusy(false);
    if (error) {
      const m = error.message || "Adjustment failed";
      if (/admins/i.test(m)) toast.error("Only admins can adjust wallets");
      else if (/insufficient/i.test(m)) toast.error("Insufficient wallet balance");
      else toast.error(m);
      return;
    }
    toast.success(
      `${direction === "credit" ? "Credited" : "Debited"} ${currency} ${amount.toFixed(2)} · tx ${String(data).slice(0, 8)}`,
    );
    onSuccess();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[92%] max-w-md rounded-2xl bg-[#0D1B2A] border border-emerald-500/30 p-5 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-emerald-300" />
          <h3 className="text-base font-semibold text-emerald-300">Adjust wallet</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Current balance:{" "}
          <span className="font-mono text-slate-200">
            {currency} {currentBalance.toFixed(2)}
          </span>
          . Logged in admin audit + wallet ledger.
        </p>

        <div className="space-y-3">
          {/* Direction */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Direction</label>
            <div className="flex gap-1 mt-1 p-1 bg-slate-900/60 rounded-lg">
              <button
                type="button"
                onClick={() => switchDirection("credit")}
                className={`flex-1 text-xs py-1.5 rounded inline-flex items-center justify-center gap-1 ${
                  direction === "credit" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"
                }`}
              >
                <Plus size={12} /> Credit
              </button>
              <button
                type="button"
                onClick={() => switchDirection("debit")}
                className={`flex-1 text-xs py-1.5 rounded inline-flex items-center justify-center gap-1 ${
                  direction === "debit" ? "bg-rose-500/20 text-rose-300" : "text-slate-400"
                }`}
              >
                <Minus size={12} /> Debit
              </button>
            </div>
          </div>

          {/* Kind */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"
            >
              {kindOptions.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">
              Amount ({currency})
              {direction === "debit" && (
                <span className="ml-1 text-slate-500 normal-case">· max {currentBalance.toFixed(2)}</span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={direction === "debit" ? currentBalance : 1_000_000}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1 font-mono"
            />
            {overdraw && (
              <p className="text-[10px] text-rose-300 mt-1">Exceeds wallet balance.</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">
              Reason <span className="text-rose-400">*</span>
              <span className="ml-1 text-slate-500">({reasonTrim.length}/500)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Welcome gift · campaign Q2 · duplicate credit reversal #ABC123"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"
            />
            {reasonTrim.length > 0 && reasonTrim.length < 3 && (
              <p className="text-[10px] text-rose-300 mt-1">Reason must be at least 3 characters.</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Reference (optional)</label>
            <input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="External ticket / transfer ref"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={submit}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium disabled:opacity-30 inline-flex items-center justify-center gap-1.5 ${
              direction === "credit"
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
            }`}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {direction === "credit" ? "Credit" : "Debit"} {currency} {(amount || 0).toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
