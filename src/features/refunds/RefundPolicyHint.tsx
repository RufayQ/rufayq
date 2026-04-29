/**
 * Bilingual refund-policy hint with collapsible examples (25%/45% tiers).
 * Drop-in for the cancel flow on both admin and patient sides. No external
 * UI library — uses native <details>/<summary> for the disclosure.
 */
import { Info } from "lucide-react";
import { REFUND_COPY } from "./policy";

interface Props {
  isAr: boolean;
  /** Visual variant — admin drawer is dark, patient is also dark; same look. */
  tone?: "subtle" | "card";
}

export const RefundPolicyHint = ({ isAr, tone = "subtle" }: Props) => {
  const wrap = tone === "card"
    ? "rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
    : "";
  return (
    <div className={wrap} dir={isAr ? "rtl" : "ltr"}>
      <p className="text-[11px] text-slate-300 flex items-start gap-1.5">
        <Info size={12} className="mt-0.5 shrink-0 text-amber-300" />
        <span>
          <span className="font-semibold text-amber-300">{REFUND_COPY.policyTitle[isAr ? "ar" : "en"]}: </span>
          {REFUND_COPY.policyShort[isAr ? "ar" : "en"]}
        </span>
      </p>
      <details className="mt-2 group">
        <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-amber-300 select-none">
          {isAr ? "أمثلة" : "Examples"}
        </summary>
        <ul className="mt-1.5 space-y-0.5 pl-4 list-disc text-[10px] text-slate-400">
          {REFUND_COPY.examples[isAr ? "ar" : "en"].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-slate-500">{REFUND_COPY.addonsNote[isAr ? "ar" : "en"]}</p>
        <p className="mt-1 text-[10px] text-slate-500">{REFUND_COPY.walletNote[isAr ? "ar" : "en"]}</p>
      </details>
    </div>
  );
};
