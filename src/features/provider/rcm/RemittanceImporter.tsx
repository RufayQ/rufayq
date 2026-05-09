/**
 * RemittanceImporter — paste-or-upload CSV remittance file, validate each
 * row, then call `providerClient.claim.recordPayment` per matched claim.
 *
 * CSV columns (header row required):
 *   claim_no, paid_amount, denied_amount, denial_code, denial_reason, payment_method, payment_reference
 *
 * Permissions: provider.rcm.remittance.import (admin + staff).
 */
import { useState } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { providerClient } from "@/api/clients/provider.client";
import Can from "@/components/auth/Can";

interface Props { organizationId: string }

interface ParsedRow {
  claim_no: string;
  paid_amount: number;
  denied_amount: number;
  denial_code?: string;
  denial_reason?: string;
  payment_method: string;
  payment_reference?: string;
  _error?: string;
  _claimId?: string;
  _outstanding?: number;
}

const REQUIRED_HEADERS = ["claim_no", "paid_amount", "payment_method"];

const parseCsv = (text: string): ParsedRow[] => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: any = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    const paid = parseFloat(row.paid_amount || "0");
    const denied = parseFloat(row.denied_amount || "0");
    const out: ParsedRow = {
      claim_no: row.claim_no,
      paid_amount: isNaN(paid) ? 0 : paid,
      denied_amount: isNaN(denied) ? 0 : denied,
      denial_code: row.denial_code || undefined,
      denial_reason: row.denial_reason || undefined,
      payment_method: row.payment_method || "bank_transfer",
      payment_reference: row.payment_reference || undefined,
    };
    if (!out.claim_no) out._error = "claim_no missing";
    else if (out.paid_amount < 0) out._error = "paid_amount must be ≥ 0";
    else if (out.paid_amount === 0 && out.denied_amount === 0) out._error = "row has no paid or denied amount";
    return out;
  });
};

const RemittanceImporter = ({ organizationId }: Props) => {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ ok: number; failed: number } | null>(null);

  const onParse = () => {
    try {
      const parsed = parseCsv(text);
      if (!parsed.length) { toast.error("No data rows found"); return; }
      setRows(parsed); setDone(null);
    } catch (e: any) { toast.error(e.message || "Failed to parse CSV"); }
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    const t = await f.text(); setText(t);
  };

  const onImport = async () => {
    if (!rows.length) return;
    setImporting(true);

    // Resolve claim_no -> id + outstanding for the org
    const claimNos = Array.from(new Set(rows.filter((r) => !r._error).map((r) => r.claim_no)));
    const { data: claims } = await (supabase as any).from("rcm_claims")
      .select("id, claim_no, outstanding_amount")
      .eq("organization_id", organizationId)
      .in("claim_no", claimNos);
    const idx = new Map<string, { id: string; outstanding: number }>(
      (claims ?? []).map((c: any) => [c.claim_no, { id: c.id, outstanding: Number(c.outstanding_amount) }])
    );

    let ok = 0, failed = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const r = next[i];
      if (r._error) { failed++; continue; }
      const match = idx.get(r.claim_no);
      if (!match) { next[i] = { ...r, _error: "claim_no not found in this org" }; failed++; continue; }
      next[i] = { ...r, _claimId: match.id, _outstanding: match.outstanding };

      if (r.paid_amount > 0) {
        const res = await providerClient.claim.recordPayment(match.id, {
          amount: r.paid_amount, outstanding: match.outstanding,
          method: r.payment_method, reference: r.payment_reference,
        });
        if (res.error) { next[i] = { ...next[i], _error: res.error.message }; failed++; continue; }
      }
      if (r.denied_amount > 0 && r.denial_code) {
        const res = await providerClient.claim.recordDenial(match.id, {
          reason_code: r.denial_code, reason_text: r.denial_reason || "(from remittance)",
          amount: r.denied_amount,
        });
        if (res.error) { next[i] = { ...next[i], _error: res.error.message }; failed++; continue; }
      }
      ok++;
    }
    setRows(next); setDone({ ok, failed });
    setImporting(false);
    toast[failed === 0 ? "success" : "info"](`Imported ${ok}, failed ${failed}`);
  };

  return (
    <Can action="provider.rcm.remittance.import" fallback={<p className="text-xs text-slate-500">You don't have permission to import remittance.</p>}>
      <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <FileSpreadsheet size={15} className="text-amber-400" /> Remittance import
        </h3>
        <p className="text-[11px] text-slate-500">
          CSV columns: <code className="text-amber-300">claim_no,paid_amount,denied_amount,denial_code,denial_reason,payment_method,payment_reference</code>
        </p>

        <div className="flex gap-2">
          <label className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs cursor-pointer flex items-center gap-1.5">
            <Upload size={12} /> Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={onParse} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold disabled:opacity-50">Parse</button>
        </div>

        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          rows={6} placeholder="…or paste CSV text here"
          className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200"
        />

        {!!rows.length && (
          <>
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Claim</th>
                    <th className="px-2 py-1.5 text-right">Paid</th>
                    <th className="px-2 py-1.5 text-right">Denied</th>
                    <th className="px-2 py-1.5 text-left">Method</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-2 py-1 font-mono text-slate-200">{r.claim_no}</td>
                      <td className="px-2 py-1 text-right text-emerald-300">{r.paid_amount.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right text-rose-300">{r.denied_amount.toFixed(2)}</td>
                      <td className="px-2 py-1 text-slate-400">{r.payment_method}</td>
                      <td className="px-2 py-1">
                        {r._error
                          ? <span className="text-rose-400 flex items-center gap-1"><AlertTriangle size={11} /> {r._error}</span>
                          : done && r._claimId
                            ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> imported</span>
                            : <span className="text-slate-500">ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={onImport} disabled={importing || done !== null}
              className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-50">
              {importing ? "Importing…" : done ? `Done · ${done.ok} ok / ${done.failed} failed` : `Import ${rows.filter(r => !r._error).length} rows`}
            </button>
          </>
        )}
      </div>
    </Can>
  );
};

export default RemittanceImporter;
