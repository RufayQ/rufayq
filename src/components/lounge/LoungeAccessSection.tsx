import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Pencil, Trash2, X, Plane, CreditCard, ScanLine, Eye, EyeOff, Upload, IdCard, ChevronDown, Maximize2, Minimize2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { notify } from "@/lib/bilingualToast";
import type { TransportSegment } from "@/components/TransportCard";
import {
  listLoungeMemberships,
  saveLoungeMembership,
  deleteLoungeMembership,
  subscribeLoungeMemberships,
  fetchLoungeMemberships,
  type LoungeMembership,
} from "@/lib/loungeMemberships";
import QrImageEditor from "./QrImageEditor";
import { OverlayLayer } from "@/shared/ui/overlay";

interface Props {
  /** Flight segments shown in the linker dropdown so the user can tag a card to a flight. */
  segments: TransportSegment[];
}

/* ─── Expiry helpers (MM/YY ⇄ ISO YYYY-MM-DD using last day of month) ─── */
const formatMMYYInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};
const mmyyToIso = (mmyy: string): string | null => {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmyy.trim());
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  // Last day of the month (cards expire end-of-month).
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};
const isoToMMYY = (iso?: string): string => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (!m) return "";
  return `${m[2]}/${m[1].slice(2)}`;
};
const formatExpMMYY = (iso?: string): string => isoToMMYY(iso);

/** DragonPass-style QR payload: "<membership><6 spaces>=<secret>" — falls back to just the number. */
const buildQrPayload = (m: { membershipNumber: string; qrSecret?: string }): string =>
  m.qrSecret ? `${m.membershipNumber}      =${m.qrSecret}` : m.membershipNumber;

/** Format YYYY-MM-DD as "01 Jan 2027". */
const formatRefreshDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const isVAC = (program: string) => program.trim().toLowerCase() === "visa airport companion";

/* ─── Brand theming for the credit-card look ─── */
const brandTheme = (program: string): { bg: string; tagline: string } => {
  const p = program.toLowerCase();
  if (p.includes("dragon"))
    return { bg: "linear-gradient(135deg, #0f2e3d 0%, #0a4a5e 60%, #c5965a 140%)", tagline: "Lounge Access" };
  if (p.includes("priority"))
    return { bg: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)", tagline: "Priority Pass" };
  if (p.includes("visa"))
    return { bg: "linear-gradient(135deg, #1a1f71 0%, #2e3a9e 100%)", tagline: "Airport Companion" };
  if (p.includes("mastercard"))
    return { bg: "linear-gradient(135deg, #1a1a1a 0%, #4a1f0a 100%)", tagline: "Travel Pass" };
  if (p.includes("loungekey"))
    return { bg: "linear-gradient(135deg, #2a2a2a 0%, #1a4a3e 100%)", tagline: "LoungeKey" };
  return { bg: "linear-gradient(135deg, var(--header-dark-from), var(--header-teal-from))", tagline: "Lounge Card" };
};

/**
 * Lounge Access section rendered inside the Tickets tab. Stores Dragonpass /
 * Priority Pass / Visa Airport Companion / Mastercard Travel Pass / generic
 * memberships locally. Tap a card to show the QR a lounge officer can scan;
 * the QR payload is just the membership number.
 */
const LoungeAccessSection = ({ segments }: Props) => {
  const [items, setItems] = useState<LoungeMembership[]>(() => listLoungeMemberships());
  const [editing, setEditing] = useState<LoungeMembership | null>(null);
  const [adding, setAdding] = useState(false);
  const [qrTarget, setQrTarget] = useState<LoungeMembership | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleReveal = (id: string) => setRevealed((s) => ({ ...s, [id]: !s[id] }));
  const toggleExpanded = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const maskNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 4) return raw;
    const last4 = digits.slice(-4);
    const hiddenGroups = Math.max(0, Math.ceil((digits.length - 4) / 4));
    return `${"•••• ".repeat(hiddenGroups).trim()} ${last4}`.trim();
  };

  useEffect(() => {
    void fetchLoungeMemberships().then(() => setItems(listLoungeMemberships()));
    return subscribeLoungeMemberships(() => setItems(listLoungeMemberships()));
  }, []);

  const flightSegments = segments.filter((s) => s.type === "flight");

  return (
    <section id="lounge-access-section" className="px-4 mb-4 scroll-mt-24 transition-shadow duration-500 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
            LOUNGE ACCESS
          </p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>
            بطاقات دخول الصالات
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setAdding(true); }}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press"
          style={{ background: "var(--teal-deep)", color: "var(--white)" }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--white)", border: "1px dashed var(--gray-light)" }}>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--teal-light)" }}>
            <ScanLine size={18} style={{ color: "var(--teal-deep)" }} />
          </div>
          <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>No lounge cards yet</p>
          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>لم تتم إضافة بطاقات صالات بعد</p>
          <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--gray)" }}>
            Add your Dragonpass, Priority Pass, Visa Airport Companion or Mastercard Travel Pass — show the QR at the lounge desk.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((m) => {
            const linked = flightSegments.find((s) => s.id === m.linkedSegmentId);
            const expMMYY = formatExpMMYY(m.expiresOn);
            const brand = brandTheme(m.program);
            if (isVAC(m.program)) {
              const numberSpaced = m.membershipNumber.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
              const numberDisplay = revealed[m.id] ? numberSpaced : maskNumber(m.membershipNumber);
              const refreshDisplay = formatRefreshDate(m.entitlementRefreshOn) || formatExpMMYY(m.expiresOn);
              const isExpanded = !!expanded[m.id];
              const last4 = m.membershipNumber.replace(/\D/g, "").slice(-4);
              return (
                <div
                  key={m.id}
                  className="relative w-full rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--gray-light)",
                    boxShadow: "0 6px 20px rgba(15,23,42,0.10)",
                  }}
                >
                  {/* Header / collapsed summary row — always visible */}
                  <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Plane size={16} style={{ color: "#1a1f71" }} strokeWidth={2.4} />
                      <div className="leading-tight min-w-0">
                        <p className="text-[11px] font-bold truncate" style={{ color: "#1a1f71" }}>Visa Airport Companion</p>
                        {!isExpanded && (
                          <p className="font-mono text-[10px] tracking-[0.12em] truncate" style={{ color: "var(--gray)" }}>
                            •••• {last4} · {m.cardholderName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[11px] font-bold tracking-[0.12em]" style={{ color: "var(--navy)" }}>DRAGONPASS</span>
                      <IdCard size={12} style={{ color: "var(--navy)" }} />
                      <button
                        type="button"
                        onClick={() => toggleExpanded(m.id)}
                        aria-label={isExpanded ? "Collapse card" : "Expand card"}
                        aria-expanded={isExpanded}
                        data-testid={`lounge-card-expand-${m.id}`}
                        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full btn-press"
                        style={{ background: "var(--off-white)", color: "var(--navy)" }}
                      >
                        <ChevronDown
                          size={14}
                          style={{ transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      {/* Navy QR panel — tapping opens fullscreen QR sheet */}
                      <button
                        type="button"
                        onClick={() => setQrTarget(m)}
                        className="block w-full text-left btn-press"
                      >
                        <div className="mx-3 mb-3 rounded-xl px-4 py-4 flex flex-col items-center" style={{ background: "#0f1f3a" }}>
                          <div className="rounded-lg bg-white p-2" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
                            {m.qrImageUrl ? (
                              <img src={m.qrImageUrl} alt="Lounge QR" width={150} height={150} style={{ display: "block" }} />
                            ) : (
                              <QRCodeSVG value={buildQrPayload(m)} size={150} level="M" includeMargin={false} />
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-2 w-full justify-center">
                            <p className="font-mono text-[13px] tracking-[0.18em] text-white">{numberDisplay}</p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleReveal(m.id); }}
                              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full btn-press"
                              style={{ background: "rgba(255,255,255,0.12)", color: "var(--gold)" }}
                              aria-label={revealed[m.id] ? "Hide card number" : "Show card number"}
                              aria-pressed={!!revealed[m.id]}
                            >
                              {revealed[m.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                          <p className="mt-2 inline-flex items-center gap-1 text-[10px]" style={{ color: "var(--gold)" }}>
                            <Maximize2 size={10} /> Tap to scan in full screen · اضغط للمسح بملء الشاشة
                          </p>
                        </div>
                      </button>

                      {/* Footer */}
                      <div className="px-4 pb-3 pt-1 flex items-end justify-between gap-3" style={{ background: "var(--off-white)" }}>
                        <div className="min-w-0">
                          <p className="text-[9px] tracking-wide uppercase" style={{ color: "var(--gray)" }}>Cardholder name</p>
                          <p className="font-arabic text-[9px] leading-tight" dir="rtl" style={{ color: "var(--gray)", opacity: 0.7 }}>اسم حامل البطاقة</p>
                          <p className="text-[12px] font-bold truncate" style={{ color: "var(--navy)" }}>{m.cardholderName}</p>
                        </div>
                        {refreshDisplay && (
                          <div className="text-right shrink-0">
                            <p className="text-[9px] tracking-wide uppercase" style={{ color: "var(--gray)" }}>Entitlement refresh</p>
                            <p className="font-arabic text-[9px] leading-tight" dir="rtl" style={{ color: "var(--gray)", opacity: 0.7 }}>تاريخ التجديد</p>
                            <p className="font-mono text-[12px] font-bold" style={{ color: "var(--navy)" }}>{refreshDisplay}</p>
                          </div>
                        )}
                      </div>

                      {linked && (
                        <p className="px-4 pb-2 flex items-center gap-1 text-[9px]" style={{ color: "var(--teal-deep)", background: "var(--off-white)" }}>
                          <Plane size={9} /> {linked.airline || linked.flightNumber || "Flight"} · {linked.fromCode}→{linked.toCode}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            }

            return (
              <button
                key={m.id}
                onClick={() => setQrTarget(m)}
                className="relative w-full text-left rounded-2xl p-3.5 btn-press overflow-hidden"
                style={{
                  background: brand.bg,
                  boxShadow: "0 6px 20px rgba(15,23,42,0.18)",
                  color: "#fff",
                }}
              >
                {/* decorative gradient orb */}
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-25"
                  style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-9 items-center justify-center rounded-md" style={{ background: "var(--gold)" }}>
                      <CreditCard size={14} color="#1a2238" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold leading-tight">{m.program}</p>
                      <p className="font-mono text-[9px] tracking-widest opacity-70 uppercase">
                        {brand.tagline}
                      </p>
                    </div>
                  </div>
                  <ScanLine size={16} style={{ color: "var(--gold)" }} />
                </div>

                <div className="relative mt-3 flex items-center justify-between gap-2">
                  <p className="font-mono text-[14px] tracking-[0.18em]">
                    {revealed[m.id]
                      ? m.membershipNumber.replace(/(.{4})/g, "$1 ").trim().slice(0, 24)
                      : maskNumber(m.membershipNumber).slice(0, 24)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleReveal(m.id); }}
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full btn-press"
                    style={{ background: "rgba(255,255,255,0.12)", color: "var(--gold)" }}
                    aria-label={revealed[m.id] ? "Hide card number" : "Show card number"}
                    aria-pressed={!!revealed[m.id]}
                  >
                    {revealed[m.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                <div className="relative mt-2.5 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] tracking-widest opacity-60 uppercase">Cardholder</p>
                    <p className="text-[11px] font-bold truncate">{m.cardholderName}</p>
                  </div>
                  {expMMYY && (
                    <div className="text-right shrink-0">
                      <p className="font-mono text-[8px] tracking-widest opacity-60 uppercase">Exp</p>
                      <p className="font-mono text-[11px] font-bold">{expMMYY}</p>
                    </div>
                  )}
                </div>

                {linked && (
                  <p className="relative mt-2 flex items-center gap-1 text-[9px]" style={{ color: "var(--gold)" }}>
                    <Plane size={9} /> {linked.airline || linked.flightNumber || "Flight"} · {linked.fromCode}→{linked.toCode}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(adding || editing) && (
        <LoungeFormSheet
          initial={editing}
          segments={flightSegments}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSave={(input) => {
            saveLoungeMembership(input);
            notify({
              kind: "success",
              en: editing ? "Membership updated" : "Membership added",
              ar: editing ? "تم التحديث" : "تمت الإضافة",
              duration: 1800,
            });
            setAdding(false);
            setEditing(null);
          }}
          onDelete={editing ? () => {
            deleteLoungeMembership(editing.id);
            notify({ kind: "success", en: "Removed", ar: "تم الحذف", duration: 1500 });
            setEditing(null);
          } : undefined}
        />
      )}

      {qrTarget && (
        <LoungeQrSheet
          membership={qrTarget}
          onClose={() => setQrTarget(null)}
          onEdit={() => { setEditing(qrTarget); setQrTarget(null); }}
        />
      )}
    </section>
  );
};

/* ─── Add / Edit form ─── */
const LoungeFormSheet = ({
  initial, segments, onClose, onSave, onDelete,
}: {
  initial: LoungeMembership | null;
  segments: TransportSegment[];
  onClose: () => void;
  onSave: (input: Parameters<typeof saveLoungeMembership>[0]) => void;
  onDelete?: () => void;
}) => {
  const [program, setProgram] = useState(initial?.program || "Dragonpass");
  const [membershipNumber, setMembershipNumber] = useState(initial?.membershipNumber || "");
  const [cardholderName, setCardholderName] = useState(initial?.cardholderName || "");
  const [cardLast4, setCardLast4] = useState(initial?.cardLast4 || "");
  const [mmyyDisplay, setMmyyDisplay] = useState(isoToMMYY(initial?.expiresOn));
  const [linkedSegmentId, setLinkedSegmentId] = useState(initial?.linkedSegmentId || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [qrSecret, setQrSecret] = useState(initial?.qrSecret || "");
  const [qrSecretError, setQrSecretError] = useState<string | null>(null);
  const [entitlementRefreshOn, setEntitlementRefreshOn] = useState(initial?.entitlementRefreshOn || "");
  const [qrImageUrl, setQrImageUrl] = useState(initial?.qrImageUrl || "");
  const [pendingQrSrc, setPendingQrSrc] = useState<string | null>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const vac = isVAC(program);

  /** Numeric, 6–20 digits. Empty is allowed (field is optional). */
  const validateQrSecret = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    if (!/^\d+$/.test(v)) return "QR verifier must be digits only · أرقام فقط";
    if (v.length < 6 || v.length > 20) return "QR verifier must be 6–20 digits · من 6 إلى 20 رقمًا";
    return null;
  };

  const handleQrFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("QR image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (src) setPendingQrSrc(src);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!program.trim() || !membershipNumber.trim() || !cardholderName.trim()) {
      toast.error("Program, number and cardholder are required");
      return;
    }
    const iso = mmyyToIso(mmyyDisplay);
    if (mmyyDisplay && !iso) {
      toast.error("Expiry must be MM/YY (e.g. 05/29)");
      return;
    }
    if (vac) {
      const err = validateQrSecret(qrSecret);
      if (err) {
        setQrSecretError(err);
        toast.error(err);
        return;
      }
    }
    onSave({
      id: initial?.id,
      program: program.trim(),
      membershipNumber: membershipNumber.trim(),
      cardholderName: cardholderName.trim(),
      cardLast4: cardLast4.trim() || undefined,
      expiresOn: iso || undefined,
      linkedSegmentId: linkedSegmentId || undefined,
      notes: notes.trim() || undefined,
      qrSecret: vac ? (qrSecret.trim() || undefined) : undefined,
      entitlementRefreshOn: vac ? (entitlementRefreshOn || undefined) : undefined,
      qrImageUrl: vac ? (qrImageUrl || undefined) : undefined,
    });
  };

  return (
    <OverlayLayer
      open
      onClose={onClose}
      layer="sheet"
      ariaLabel={initial ? "Edit lounge card" : "Add lounge card"}
      backdropClassName="bg-[rgba(15,23,42,0.45)]"
    >
      <div className="absolute inset-0 flex items-end justify-center">
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl p-5 animate-slide-up"
        style={{ background: "var(--white)", boxShadow: "0 -8px 32px rgba(0,0,0,0.18)", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>{initial ? "Edit Lounge Card" : "Add Lounge Card"}</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>بطاقة صالة المطار</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Program · البرنامج">
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
              {["Dragonpass", "Priority Pass", "Visa Airport Companion", "Mastercard Travel Pass", "LoungeKey", "Other"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>

          <Field label="Membership Number · رقم العضوية">
            <input value={membershipNumber} onChange={(e) => setMembershipNumber(e.target.value)} placeholder="e.g. 7800 7311 0008 0979" inputMode="numeric" className="w-full rounded-xl px-3 py-2 text-[13px] font-mono outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </Field>

          <Field label="Cardholder Name · اسم حامل البطاقة">
            <input value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="As printed on the card" className="w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Linked card last 4">
              <input value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="9607" inputMode="numeric" maxLength={4} className="w-full rounded-xl px-3 py-2 text-[13px] font-mono outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
            </Field>
            <Field label="Expires (MM/YY) · تاريخ الانتهاء">
              <input
                value={mmyyDisplay}
                onChange={(e) => setMmyyDisplay(formatMMYYInput(e.target.value))}
                placeholder="MM/YY"
                inputMode="numeric"
                maxLength={5}
                aria-label="Card expiry month and year"
                className="w-full rounded-xl px-3 py-2 text-[13px] font-mono tracking-widest outline-none"
                style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              />
            </Field>
          </div>

          {segments.length > 0 && (
            <Field label="Link to flight · ربط بالرحلة">
              <select value={linkedSegmentId} onChange={(e) => setLinkedSegmentId(e.target.value)} className="w-full rounded-xl px-3 py-2 text-[13px] outline-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
                <option value="">— Not linked —</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.airline || "Flight")} {s.flightNumber || ""} · {s.fromCode}→{s.toCode} · {new Date(s.departureDateTime).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </Field>
          )}


          {vac && (
            <>
              <Field label="QR verifier · الرقم التحققي للرمز">
                <input
                  value={qrSecret}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 20);
                    setQrSecret(next);
                    setQrSecretError(validateQrSecret(next));
                  }}
                  onBlur={() => setQrSecretError(validateQrSecret(qrSecret))}
                  placeholder="e.g. 5310572473"
                  inputMode="numeric"
                  aria-invalid={!!qrSecretError}
                  aria-describedby="qr-secret-help"
                  className="w-full rounded-xl px-3 py-2 text-[13px] font-mono outline-none"
                  style={{
                    background: "var(--off-white)",
                    border: `1px solid ${qrSecretError ? "var(--error)" : "var(--gray-light)"}`,
                    color: "var(--navy)",
                  }}
                />
                {qrSecretError ? (
                  <p id="qr-secret-help" className="mt-1 text-[10px] font-bold" style={{ color: "var(--error)" }}>
                    {qrSecretError}
                  </p>
                ) : (
                  <p id="qr-secret-help" className="mt-1 text-[10px]" style={{ color: "var(--gray)" }}>
                    Numbers only, 6–20 digits. Found after the “=” in your Visa Airport Companion QR.
                  </p>
                )}
              </Field>

              <Field label="Entitlement refresh · تاريخ التجديد">
                <input
                  type="date"
                  value={entitlementRefreshOn}
                  onChange={(e) => setEntitlementRefreshOn(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-[13px] font-mono outline-none"
                  style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                />
              </Field>

              <Field label="Custom QR image (optional) · صورة الرمز">
                <div className="flex items-center gap-2">
                  <input
                    ref={qrFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handleQrFile(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                  <button
                    type="button"
                    onClick={() => qrFileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold btn-press"
                    style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
                  >
                    <Upload size={12} /> {qrImageUrl ? "Replace image" : "Upload QR image"}
                  </button>
                  {qrImageUrl && (
                    <>
                      <img src={qrImageUrl} alt="QR preview" className="h-10 w-10 rounded-md object-cover" style={{ border: "1px solid var(--gray-light)" }} />
                      <button
                        type="button"
                        onClick={() => setQrImageUrl("")}
                        aria-label="Remove QR image"
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: "var(--off-white)", color: "var(--error)" }}
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[10px]" style={{ color: "var(--gray)" }}>
                  Use your real lounge QR picture instead of the generated one.
                </p>
              </Field>
            </>
          )}

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }} />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          {onDelete && (
            <button type="button" onClick={() => { if (confirm("Delete this card?")) onDelete(); }} className="rounded-full px-3 py-2.5 text-[12px] font-bold btn-press flex items-center gap-1" style={{ background: "rgba(217,79,79,0.1)", color: "var(--error)" }}>
              <Trash2 size={12} /> Delete
            </button>
          )}
          <button type="submit" className="flex-1 rounded-full py-2.5 text-[13px] font-bold btn-press" style={{ background: "var(--teal-deep)", color: "var(--white)" }}>
            {initial ? "Save changes" : "Add card"}
          </button>
        </div>
      </form>
      {pendingQrSrc && (
        <QrImageEditor
          src={pendingQrSrc}
          onCancel={() => setPendingQrSrc(null)}
          onSave={(dataUrl) => {
            setQrImageUrl(dataUrl);
            setPendingQrSrc(null);
            notify({ kind: "success", en: "QR image updated", ar: "تم تحديث صورة الرمز", duration: 1400 });
          }}
        />
      )}
      </div>
    </OverlayLayer>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-bold tracking-wide uppercase" style={{ color: "var(--gray)" }}>{label}</span>
    {children}
  </label>
);

/* ─── QR display sheet ─── */
const HD_SIZE = 1024;

const slugifyProgram = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";

const triggerDownload = (dataUrl: string, filename: string): void => {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });

const drawToCanvasPng = (img: HTMLImageElement, size = HD_SIZE): string => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL("image/png");
};

const generatedQrToPng = async (payload: string): Promise<string> => {
  const svgMarkup = renderToStaticMarkup(
    <QRCodeSVG value={payload} size={HD_SIZE} level="H" includeMargin />,
  );
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(url);
    return drawToCanvasPng(img, HD_SIZE);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const uploadedQrToPng = async (src: string): Promise<string> => {
  const img = await loadImage(src);
  return drawToCanvasPng(img, HD_SIZE);
};

export const LoungeQrSheet = ({
  membership, onClose, onEdit,
}: { membership: LoungeMembership; onClose: () => void; onEdit: () => void }) => {
  const [fullscreen, setFullscreen] = useState(false);

  // Try to boost screen brightness while open (best-effort, no-op on web).
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.filter;
    if (fullscreen) root.style.filter = "brightness(1.08)";
    return () => { root.style.filter = prev; };
  }, [fullscreen]);

  const getHdPng = async (): Promise<string> =>
    membership.qrImageUrl
      ? await uploadedQrToPng(membership.qrImageUrl)
      : await generatedQrToPng(buildQrPayload(membership));

  const buildFilename = () => {
    const last4 = membership.membershipNumber.replace(/\D/g, "").slice(-4) || "card";
    return `rufayq-lounge-${slugifyProgram(membership.program)}-${last4}.png`;
  };

  const handleDownload = async () => {
    try {
      const dataUrl = await getHdPng();
      triggerDownload(dataUrl, buildFilename());
      notify({ kind: "success", en: "Saved to downloads", ar: "تم الحفظ", duration: 1800 });
    } catch {
      notify({ kind: "error", en: "Couldn't save QR", ar: "تعذر الحفظ" });
    }
  };

  const dataUrlToFile = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  };

  const handleShare = async () => {
    try {
      const dataUrl = await getHdPng();
      const filename = buildFilename();
      const file = await dataUrlToFile(dataUrl, filename);
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
      };
      const shareData = {
        files: [file],
        title: `${membership.program} lounge access`,
        text: `${membership.program} · ${membership.cardholderName}`,
      };
      if (nav.share && nav.canShare && nav.canShare(shareData)) {
        await nav.share(shareData);
        return;
      }
      if (nav.share) {
        await nav.share({ title: shareData.title, text: shareData.text });
        return;
      }
      // Fallback: copy a data URL is unwieldy; just download instead.
      triggerDownload(dataUrl, filename);
      notify({ kind: "info", en: "Share not supported — downloaded instead", ar: "المشاركة غير مدعومة — تم التنزيل" });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      notify({ kind: "error", en: "Couldn't share QR", ar: "تعذرت المشاركة" });
    }
  };

  if (fullscreen) {
    // Maximum-area, high-density QR for officer scanning.
    const side = Math.min(
      typeof window !== "undefined" ? window.innerWidth - 32 : 320,
      typeof window !== "undefined" ? window.innerHeight - 200 : 480,
      560,
    );
    return (
      <OverlayLayer
        open
        onClose={() => setFullscreen(false)}
        layer="scanner"
        ariaLabel="Lounge QR fullscreen"
        backdropClassName="bg-white"
      >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-4"
        onClick={() => setFullscreen(false)}
        data-testid="qr-fullscreen"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void handleDownload(); }}
          aria-label="Download HD QR"
          data-testid="qr-fullscreen-download"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full btn-press"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void handleShare(); }}
          aria-label="Share lounge QR image · مشاركة صورة رمز الصالة"
          title="Share lounge QR image · مشاركة صورة رمز الصالة"
          data-testid="qr-fullscreen-share"
          className="absolute top-4 left-16 flex h-11 w-11 items-center justify-center rounded-full btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: "linear-gradient(135deg, var(--teal-deep) 0%, #0a4a5e 100%)",
            color: "white",
            border: "1px solid var(--teal-deep)",
            boxShadow: "0 4px 14px rgba(15,46,61,0.22)",
          }}
        >
          <Share2 size={16} aria-hidden="true" />
          <span className="sr-only">Share lounge QR image</span>
          <span className="sr-only font-arabic" lang="ar" dir="rtl">مشاركة صورة رمز الصالة</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
          aria-label="Exit fullscreen"
          className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full btn-press"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        >
          <Minimize2 size={16} />
        </button>
        <p className="mb-3 text-[12px] font-bold tracking-wide uppercase" style={{ color: "var(--navy)" }}>
          {membership.program}
        </p>
        <div onClick={(e) => e.stopPropagation()} className="rounded-2xl bg-white p-4" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          {membership.qrImageUrl ? (
            <img
              src={membership.qrImageUrl}
              alt="Lounge QR fullscreen"
              width={side}
              height={side}
              data-testid="qr-uploaded"
              style={{ display: "block", imageRendering: "pixelated" }}
            />
          ) : (
            <QRCodeSVG value={buildQrPayload(membership)} size={side} level="H" includeMargin={false} data-testid="qr-generated" />
          )}
        </div>
        <p className="mt-4 font-mono text-[14px] tracking-[0.22em]" style={{ color: "var(--navy)" }}>
          {membership.membershipNumber.replace(/(.{4})/g, "$1 ").trim()}
        </p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--gray)" }}>{membership.cardholderName}</p>
        <p className="mt-3 text-center text-[10px]" style={{ color: "var(--gray)" }}>
          Tap anywhere to exit · اضغط للخروج
        </p>
      </div>
      </OverlayLayer>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl p-5 animate-slide-up"
        style={{ background: "var(--white)", boxShadow: "0 -8px 32px rgba(0,0,0,0.25)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>{membership.program}</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>اعرض الرمز لموظف الصالة للمسح</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFullscreen(true)} aria-label="Fullscreen QR" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)" }}>
              <Maximize2 size={13} />
            </button>
            <button onClick={onEdit} aria-label="Edit" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)" }}>
              <Pencil size={13} />
            </button>
            <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--off-white)", color: "var(--navy)" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="w-full rounded-2xl p-5 flex flex-col items-center btn-press"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
          aria-label="Open QR in full screen"
          data-testid="qr-open-fullscreen"
        >
          <div className="rounded-xl bg-white p-3" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            {membership.qrImageUrl ? (
              <img src={membership.qrImageUrl} alt="Lounge QR" width={196} height={196} style={{ display: "block" }} />
            ) : (
              <QRCodeSVG value={buildQrPayload(membership)} size={196} level="H" includeMargin={false} />
            )}
          </div>
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--teal-deep)" }}>
            <Maximize2 size={11} /> Tap for full screen · ملء الشاشة
          </p>
          <p className="mt-2 font-mono text-[13px] tracking-[0.2em]" style={{ color: "var(--navy)" }}>
            {membership.membershipNumber.replace(/(.{4})/g, "$1 ").trim()}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--gray)" }}>{membership.cardholderName}</p>
          <div className="mt-2 flex gap-3 text-[10px]" style={{ color: "var(--gray)" }}>
            {membership.cardLast4 && <span>Linked card •••• {membership.cardLast4}</span>}
            {formatExpMMYY(membership.expiresOn) && <span>Exp {formatExpMMYY(membership.expiresOn)}</span>}
          </div>
        </button>

        {membership.qrImageUrl && (
          <button
            type="button"
            onClick={async () => {
              try {
                await saveLoungeMembership({
                  id: membership.id,
                  program: membership.program,
                  membershipNumber: membership.membershipNumber,
                  cardholderName: membership.cardholderName,
                  cardLast4: membership.cardLast4,
                  expiresOn: membership.expiresOn,
                  linkedSegmentId: membership.linkedSegmentId,
                  notes: membership.notes,
                  qrSecret: membership.qrSecret,
                  entitlementRefreshOn: membership.entitlementRefreshOn,
                  qrImageUrl: undefined,
                });
                notify({ kind: "success", en: "Custom QR removed", ar: "تم حذف الرمز المخصص", duration: 1600 });
              } catch {
                notify({ kind: "error", en: "Couldn't remove QR", ar: "تعذر الحذف" });
              }
            }}
            className="mt-3 mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold btn-press"
            style={{ background: "rgba(217,79,79,0.10)", color: "var(--error)" }}
          >
            <Trash2 size={11} /> Remove custom QR · استخدم الرمز التلقائي
          </button>
        )}

        <p className="mt-3 text-center text-[10px]" style={{ color: "var(--gray)" }}>
          Brightness is automatic on most devices · يتم رفع سطوع الشاشة تلقائياً
        </p>
      </div>
    </div>
  );
};

export default LoungeAccessSection;
