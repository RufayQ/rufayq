/**
 * DuplicateTicketDialog — confirms intent when a saved ticket conflicts
 * with one or more existing flight tickets (matched on flight#+date,
 * shared PNR, or same route+date+time).
 */
import type { DuplicateMatch, DuplicateMatchReason } from "@/lib/transportTickets";

interface Props {
  open: boolean;
  matches: DuplicateMatch[];
  onAddAnyway: () => void;
  onReplace: (existingTicketId: string) => void;
  onCancel: () => void;
}

const reasonLabel: Record<DuplicateMatchReason, { en: string; ar: string }> = {
  "flight-number-and-date": { en: "Same flight number & date", ar: "رقم الرحلة والتاريخ متطابقان" },
  "shared-pnr": { en: "Same booking reference (PNR)", ar: "نفس رقم الحجز" },
  "same-route-and-time": { en: "Same route, date & time", ar: "نفس المسار والتاريخ والوقت" },
};

const DuplicateTicketDialog = ({ open, matches, onAddAnyway, onReplace, onCancel }: Props) => {
  if (!open || matches.length === 0) return null;
  const single = matches[0];
  return (
    <div className="absolute inset-0 z-[80] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCancel}>
      <div
        className="w-full rounded-t-2xl p-5"
        style={{ background: "var(--white)", maxHeight: "85%", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
              Possible duplicate ticket
            </p>
            <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>
              تذكرة مكررة محتملة
            </p>
          </div>
        </div>

        <p className="text-[12px] mb-3" style={{ color: "var(--gray)" }}>
          We found {matches.length === 1 ? "an existing ticket" : `${matches.length} existing tickets`} that look similar to the one you're adding.
        </p>
        <p className="font-arabic text-[11px] mb-3" dir="rtl" style={{ color: "var(--gray)" }}>
          هل تريد المتابعة وإضافتها على أي حال؟
        </p>

        <div className="space-y-2 mb-4">
          {matches.map((m) => (
            <div key={m.ticketId} className="rounded-xl p-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>
                {reasonLabel[m.reason].en} · <span className="font-arabic">{reasonLabel[m.reason].ar}</span>
              </p>
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
                {m.label}
              </p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
                {m.labelAr}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onAddAnyway}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white btn-press"
            style={{ background: "var(--gold)" }}
          >
            ➕ Add anyway · <span className="font-arabic">إضافة على أي حال</span>
          </button>
          {matches.length === 1 && (
            <button
              onClick={() => onReplace(single.ticketId)}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold btn-press"
              style={{ background: "var(--teal-deep)", color: "white" }}
            >
              🔄 Replace existing · <span className="font-arabic">استبدال الموجودة</span>
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl text-[12px] font-semibold btn-press"
            style={{ color: "var(--gray)", border: "1px solid var(--gray-light)" }}
          >
            Cancel · <span className="font-arabic">إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateTicketDialog;
