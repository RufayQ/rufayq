/**
 * ChatRecordsPicker — bottom sheet that lets ANY tier (including guests)
 * attach one of their previously saved records into the AI chat. Sharing
 * already-saved records is free on every plan; only device uploads are gated.
 *
 * Data is sourced via the unified `listAllUserRecords()` reader so the picker
 * shows the same items the user sees in the Records screen and in any
 * Journey milestone's "Attach from Records" picker.
 *
 * Mobile keyboard-on-demand contract:
 *  - The search input mounts read-only with `inputMode="none"` so opening the
 *    sheet never auto-summons the soft keyboard (which on Android WebViews
 *    races with the first data load and crashes the picker).
 *  - The wrapping row acts as a button. Only after the user explicitly taps
 *    or activates it does the input arm, become writable, switch to
 *    `inputMode="search"`, and receive focus.
 *  - On close/unmount we cancel any pending focus rAF, disarm, and blur so
 *    reopening never inherits stale focus.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Search, X } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useAuthSession } from "@/hooks/useAuthUserId";
import OverlayLayer from "@/shared/ui/overlay/OverlayLayer";
import { logAttachErrorTelemetry, shortCause } from "@/lib/records/attachErrorTelemetry";
import {
  listAllUserRecords,
  resolveRecordSignedUrl,
  type UnifiedRecord,
} from "@/lib/records/recordSources";

export interface PickedRecord {
  kind: "travel" | "medical";
  label: string;
  file_name: string;
  sourceLabelEn: string;
  sourceLabelAr: string;
  signedUrl?: string;
  mime_type?: string | null;
  sourceRecord?: UnifiedRecord;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (pick: PickedRecord) => void | Promise<void>;
  route?: string;
  filterRecord?: (record: UnifiedRecord) => boolean;
  /** Optional Journey context. When present, successful picks render a summary in-sheet. */
  attachTargetLabel?: string;
  attachTargetLabelAr?: string;
}

type SourceFilter = "all" | "travel" | "medical";
type AttachedSummary = { documentName: string; sourceType: string; targetLabel: string; targetLabelAr?: string };

const ChatRecordsPicker = ({ open, onClose, onPick, route = "chat-records-picker", filterRecord, attachTargetLabel, attachTargetLabelAr }: Props) => {
  const { userId, isReady: authReady } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnifiedRecord[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [picking, setPicking] = useState<string | null>(null);
  const [isSearchArmed, setIsSearchArmed] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [lastErrorStage, setLastErrorStage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachedSummary, setAttachedSummary] = useState<AttachedSummary | null>(null);
  const retryCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusRafRef = useRef<number | null>(null);
  const isOpenRef = useRef(open);
  const helpId = useId();
  const statusId = useId();

  // Centralised cleanup: cancel any pending focus rAF, disarm, blur the input.
  // Called on close, unmount, successful pick close, and after the search row
  // is cleared. Safe to call multiple times.
  const cleanupFocus = useCallback(() => {
    if (focusRafRef.current !== null) {
      try { cancelAnimationFrame(focusRafRef.current); } catch { /* noop */ }
      focusRafRef.current = null;
    }
    setIsSearchArmed(false);
    try { inputRef.current?.blur(); } catch { /* noop */ }
  }, []);

  // Track latest open value so the deferred focus callback can bail if the
  // sheet was closed in the meantime (prevents a delayed keyboard pop-up).
  useEffect(() => { isOpenRef.current = open; }, [open]);

  // Reset armed/typing state whenever the sheet closes so reopening
  // never inherits stale focus and pops the soft keyboard.
  useEffect(() => {
    if (!open) {
      cleanupFocus();
      setAttachedSummary(null);
    }
  }, [open, cleanupFocus]);

  // Final unmount cleanup — covers route navigation away from the screen.
  useEffect(() => () => { cleanupFocus(); }, [cleanupFocus]);

  // Telemetry: detect "unexpected focus" or "unexpected keyboard" right after
  // the picker opens. If either happens while the input is still unarmed it
  // means something on the host page (autofocus, IME, restored focus) is
  // racing with us — log it via the existing attach telemetry channel.
  useEffect(() => {
    if (!open) return;
    const deviceId = getDeviceId();
    const initialViewport = typeof window !== "undefined" && (window as any).visualViewport
      ? (window as any).visualViewport.height as number
      : typeof window !== "undefined" ? window.innerHeight : 0;
    let armedAtCheck = false;
    const armedSnapshot = () => isSearchArmed;

    // Re-check on the next frame: if our input ended up focused even though
    // we never armed it, log telemetry.
    const checkFocus = requestAnimationFrame(() => {
      armedAtCheck = armedSnapshot();
      const active = typeof document !== "undefined" ? document.activeElement : null;
      if (!armedAtCheck && inputRef.current && active === inputRef.current) {
        void logAttachErrorTelemetry({
          stage: "unexpectedFocusOnOpen",
          route,
          deviceId,
          error: new Error("ChatRecordsPicker mounted with focused search input"),
        });
      }
    });

    // visualViewport shrink heuristic — Android soft keyboard reduces the
    // visible viewport height by ~30%+. Only log if it happens before the
    // user explicitly armed search.
    const onResize = () => {
      const vv = (window as any).visualViewport;
      if (!vv || armedSnapshot()) return;
      const current = vv.height as number;
      if (initialViewport > 0 && current < initialViewport * 0.7) {
        void logAttachErrorTelemetry({
          stage: "unexpectedKeyboardOnOpen",
          route,
          deviceId,
          error: new Error(`viewport shrank ${Math.round((1 - current / initialViewport) * 100)}% while unarmed`),
        });
      }
    };
    const vv = typeof window !== "undefined" ? (window as any).visualViewport : null;
    vv?.addEventListener?.("resize", onResize);
    return () => {
      cancelAnimationFrame(checkFocus);
      vv?.removeEventListener?.("resize", onResize);
    };
  }, [open, route, isSearchArmed]);

  const armSearch = useCallback(() => {
    if (!isOpenRef.current) return;
    if (isSearchArmed) return;
    setIsSearchArmed(true);
    if (focusRafRef.current !== null) {
      try { cancelAnimationFrame(focusRafRef.current); } catch { /* noop */ }
    }
    focusRafRef.current = requestAnimationFrame(() => {
      focusRafRef.current = null;
      // Guard: bail if the sheet was closed in the meantime — otherwise
      // we'd refocus the input after close and re-summon the keyboard.
      if (!isOpenRef.current) return;
      try { inputRef.current?.focus(); } catch { /* noop */ }
    });
  }, [isSearchArmed]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let retryTimer: number | null = null;
    let scheduledRetry = false;
    setLoading(true);
    setLoadError(null);
    setLastErrorStage(null);
    (async () => {
      try {
        if (!authReady) return;
        const all = await listAllUserRecords({
          userId: userId ?? null,
          deviceId: getDeviceId(),
          fileBackedOnly: true,
        });
        if (cancelled) return;
        const nextRows: UnifiedRecord[] = [];
        for (const record of all) {
          if (!record?.sendableToChat) continue;
          try {
            if (!filterRecord || filterRecord(record)) nextRows.push(record);
          } catch (filterError) {
            void logAttachErrorTelemetry({
              stage: "initialFilterRecord",
              route,
              deviceId: getDeviceId(),
              rowId: record?.id,
              error: filterError,
            });
            // Skip only the malformed racing row; keep the sheet and the rest
            // of the records mounted instead of treating this as a load crash.
          }
        }
        setRows(nextRows);
        setLoadError(null);
        setLastErrorStage(null);
        retryCountRef.current = 0;
      } catch (e: any) {
        if (cancelled) return;
        const deviceId = getDeviceId();
        void logAttachErrorTelemetry({ stage: "listAllUserRecords", route, deviceId, error: e });
        // Auto-retry once with backoff to absorb transient races (auth refresh,
        // device-header timing) without yanking the menu away from the user.
        if (retryCountRef.current < 1) {
          retryCountRef.current += 1;
          scheduledRetry = true;
          retryTimer = window.setTimeout(() => {
            if (!cancelled) setRetryNonce((n) => n + 1);
          }, 600);
          return;
        }
        // Keep prior rows mounted so the sheet never flashes empty.
        setLoadError(e instanceof Error ? e : new Error(String(e ?? "unknown error")));
        setLastErrorStage("listAllUserRecords");
      } finally {
        if (!cancelled && authReady && !scheduledRetry) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [authReady, filterRecord, open, route, userId, retryNonce]);

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    setLoadError(null);
    setLastErrorStage(null);
    setRetryNonce((n) => n + 1);
  }, []);

  const handleCopyErrorContext = useCallback(async () => {
    if (!loadError) return;
    const payload = [
      `stage: ${lastErrorStage ?? "unknown"}`,
      `route: ${route}`,
      `retries: ${retryCountRef.current}`,
      `error: ${loadError.name}: ${loadError.message}`,
    ].join("\n");
    try {
      await navigator.clipboard?.writeText(payload);
      toast.success("Copied diagnostics · تم نسخ التفاصيل");
    } catch {
      toast.error("Couldn't copy · تعذّر النسخ", { description: payload });
    }
  }, [loadError, lastErrorStage, route]);

  // Defensive filter: if the predicate throws (e.g. malformed row from a
  // racing store update), keep the sheet alive and fall back to the previous
  // unfiltered list rather than crashing the picker.
  const filtered = useMemo(() => {
    try {
      const q = query.trim().toLowerCase();
      return rows.filter((r) => {
        if (sourceFilter === "travel" && !(r.origin === "transport" || r.origin === "travel-scan")) return false;
        if (sourceFilter === "medical" && r.origin !== "medical-scan") return false;
        if (!q) return true;
        const label = String(r.label ?? "").toLowerCase();
        const fileName = String(r.fileName ?? "").toLowerCase();
        return label.includes(q) || fileName.includes(q);
      });
    } catch (e) {
      void logAttachErrorTelemetry({
        stage: "filterRows",
        route,
        deviceId: getDeviceId(),
        error: e,
      });
      return rows;
    }
  }, [rows, query, sourceFilter, route]);

  // Brief "refreshing" shimmer when the query/source filter changes so the
  // list never appears to vanish during a transient recompute on slow devices.
  useEffect(() => {
    if (!open) return;
    setIsFiltering(true);
    const id = window.setTimeout(() => setIsFiltering(false), 120);
    return () => clearTimeout(id);
  }, [query, sourceFilter, open]);

  const handlePick = async (row: UnifiedRecord) => {
    setPicking(row.id);
    setIsAttaching(true);
    const deviceId = getDeviceId();
    const ctx = {
      route,
      rowId: row.id,
      origin: row.origin,
      deviceId,
      userId: userId ?? null,
    };
    const isMedical = row.origin === "medical-scan";
    const base: PickedRecord = {
      kind: isMedical ? "medical" : "travel",
      label: row.label,
      file_name: row.fileName,
      sourceLabelEn: row.sourceLabelEn,
      sourceLabelAr: row.sourceLabelAr,
      mime_type: row.mimeType ?? null,
      sourceRecord: row,
    };
    let signedUrl: string | undefined;
    try {
      signedUrl = (await resolveRecordSignedUrl(row, deviceId)) ?? undefined;
    } catch (e: any) {
      void logAttachErrorTelemetry({ stage: "resolveRecordSignedUrl", route, deviceId, rowId: row.id, error: e });
      toast.error("Couldn't fetch file link · تعذّر جلب الرابط", {
        description: `${shortCause(e)} (${row.id.slice(0, 8)} · ${route})`,
      });
    }
    try {
      // Disarm + blur before handing off so the parent's close call doesn't
      // race with a still-focused input on mobile.
      cleanupFocus();
      await onPick({ ...base, signedUrl });
      setAttachedSummary({
        documentName: row.label || row.fileName,
        sourceType: row.sourceLabelEn,
        targetLabel: attachTargetLabel ?? "Chat draft",
        targetLabelAr: attachTargetLabelAr,
      });
    } catch (e: any) {
      console.error("[ChatRecordsPicker] onPick handler threw", { ...ctx, stage: "onPick", hasSignedUrl: !!signedUrl });
      void logAttachErrorTelemetry({ stage: "onPick", route, deviceId, rowId: row.id, error: e });
      toast.error("Couldn't attach record · تعذّر إرفاق السجل", {
        description: `${shortCause(e)} (${row.id.slice(0, 8)} · ${route})`,
      });
    } finally {
      setPicking(null);
      setIsAttaching(false);
    }
  };

  const handleClose = useCallback(() => {
    cleanupFocus();
    onClose();
  }, [cleanupFocus, onClose]);

  if (!open) return null;

  return (
    <OverlayLayer
      open={open}
      onClose={handleClose}
      layer="picker"
      ariaLabel="Attach from My Records"
      backdropClassName="bg-black/55"
    >
      <div className="flex h-full w-full items-end justify-center" onClick={handleClose}>
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col w-full max-w-[420px]"
        style={{ background: "var(--white)", maxHeight: "82%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="px-5 pt-3 pb-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl" style={{ color: "var(--navy)" }}>
              Attach from My Records
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>
              إرفاق من سجلاتي
            </p>
          </div>
          <span
            className="text-[10px] font-mono tracking-wider px-2 py-1 rounded-full shrink-0"
            style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
          >
            FREE · مجاني
          </span>
        </div>

        <div className="px-5 pb-2">
          {/* SR-only help describing the two-stage arming pattern. */}
          <span id={helpId} className="sr-only">
            Tap to enable searching records. Keyboard will only open after you activate this control.
          </span>
          {/* SR-only live status so screen readers announce the state change. */}
          <span id={statusId} className="sr-only" aria-live="polite">
            {isSearchArmed ? "Search ready. Type to filter records." : "Search not active. Tap to enable."}
          </span>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-text"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
            onClick={armSearch}
            role={isSearchArmed ? undefined : "button"}
            tabIndex={isSearchArmed ? undefined : 0}
            aria-label={isSearchArmed ? undefined : "Enable search · تفعيل البحث"}
            aria-describedby={isSearchArmed ? undefined : helpId}
            aria-pressed={isSearchArmed ? undefined : false}
            aria-controls={isSearchArmed ? undefined : `search-input-${helpId}`}
            onKeyDown={(e) => {
              if (!isSearchArmed && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                armSearch();
              }
            }}
          >
            <Search size={14} style={{ color: "var(--gray)" }} aria-hidden="true" />
            <input
              ref={inputRef}
              id={`search-input-${helpId}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPointerDown={armSearch}
              onFocus={() => setIsSearchArmed(true)}
              placeholder="Search records · ابحث في السجلات"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "var(--navy)" }}
              autoFocus={false}
              readOnly={!isSearchArmed}
              inputMode={isSearchArmed ? "search" : "none"}
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Search records"
              aria-describedby={statusId}
              // Hide the input from the tab order until armed so AT users
              // first hit the "Enable search" button, not a silent input.
              tabIndex={isSearchArmed ? 0 : -1}
            />
            {query && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery("");
                  cleanupFocus();
                }}
                className="btn-press"
                aria-label="Clear search · مسح البحث"
              >
                <X size={14} style={{ color: "var(--gray)" }} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mt-2" role="tablist" aria-label="Filter records by source">
            {([
              { id: "all", en: "All", ar: "الكل" },
              { id: "travel", en: "Travel", ar: "سفر" },
              { id: "medical", en: "Medical", ar: "طبي" },
            ] as { id: SourceFilter; en: string; ar: string }[]).map((chip) => {
              const active = sourceFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSourceFilter(chip.id)}
                  className="px-3 py-1 rounded-full text-[11px] font-bold btn-press"
                  role="tab"
                  aria-selected={active}
                  style={{
                    background: active ? "var(--teal-deep)" : "var(--off-white)",
                    color: active ? "white" : "var(--navy)",
                    border: "1px solid var(--gray-light)",
                  }}
                >
                  {chip.en} · <span className="font-arabic">{chip.ar}</span>
                </button>
              );
            })}
          </div>
        </div>



        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {attachedSummary ? (
            <div className="py-4 px-3 rounded-xl" role="status" aria-live="polite" data-testid="records-picker-attached-summary" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[13px] font-semibold text-center" style={{ color: "var(--navy)" }}>
                Document attached
              </p>
              <p className="font-arabic text-[12px] mt-1 text-center" dir="rtl" style={{ color: "var(--gray)" }}>
                تم إرفاق المستند
              </p>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                  <dt style={{ color: "var(--gray)" }}>Document</dt>
                  <dd className="font-semibold text-right truncate" style={{ color: "var(--navy)" }}>{attachedSummary.documentName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                  <dt style={{ color: "var(--gray)" }}>Source</dt>
                  <dd className="font-semibold" style={{ color: "var(--teal-deep)" }}>{attachedSummary.sourceType}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
                  <dt style={{ color: "var(--gray)" }}>Milestone</dt>
                  <dd className="font-semibold text-right truncate" style={{ color: "var(--navy)" }}>
                    {attachedSummary.targetLabel}
                    {attachedSummary.targetLabelAr ? <span className="font-arabic" dir="rtl"> · {attachedSummary.targetLabelAr}</span> : null}
                  </dd>
                </div>
              </dl>
            </div>
          ) : loading ? (
            <div className="space-y-2" aria-busy="true" aria-live="polite" data-testid="records-picker-skeleton">
              <span className="sr-only">Loading records · جارٍ التحميل</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse"
                  style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg" style={{ background: "var(--off-white)" }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded" style={{ width: "70%", background: "var(--off-white)" }} />
                    <div className="h-2 rounded" style={{ width: "45%", background: "var(--off-white)" }} />
                  </div>
                  <div className="h-3 w-10 rounded" style={{ background: "var(--off-white)" }} />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="py-6 px-3 rounded-xl" role="alert" data-testid="records-picker-error" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[13px] font-semibold text-center" style={{ color: "var(--navy)" }}>
                Couldn't load records
              </p>
              <p className="font-arabic text-[12px] mt-1 text-center" dir="rtl" style={{ color: "var(--gray)" }}>
                تعذّر تحميل السجلات
              </p>
              <div className="mt-3 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
                <div data-testid="records-picker-error-stage">stage: {lastErrorStage ?? "unknown"}</div>
                <div>route: {route}</div>
                <div>retries: {retryCountRef.current}</div>
                <div className="break-words" style={{ color: "var(--gray)" }}>
                  {loadError.name}: {shortCause(loadError)}
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-3">
                <button
                  onClick={handleManualRetry}
                  className="px-4 py-2 rounded-full text-[12px] font-bold btn-press"
                  style={{ background: "var(--teal-deep)", color: "white" }}
                >
                  Try again · <span className="font-arabic">إعادة المحاولة</span>
                </button>
                <button
                  onClick={handleCopyErrorContext}
                  className="px-4 py-2 rounded-full text-[12px] font-bold btn-press"
                  style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
                  data-testid="records-picker-copy-error"
                >
                  Copy details · <span className="font-arabic">نسخ</span>
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px]" style={{ color: "var(--navy)" }}>No records yet</p>
              <p className="font-arabic text-[12px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
                لا توجد سجلات بعد
              </p>
            </div>

          ) : (
            <div
              className="space-y-2 transition-opacity duration-150"
              style={{ opacity: isFiltering ? 0.55 : 1 }}
              data-testid="records-picker-list"
              aria-busy={isFiltering || isAttaching ? true : undefined}
            >
              {filtered.map((r) => {
                const isMedical = r.origin === "medical-scan";
                const isImage = !!r.mimeType && r.mimeType.startsWith("image/");
                const Icon = isImage ? ImageIcon : FileText;
                return (
                  <button
                    key={r.id}
                    onClick={() => handlePick(r)}
                    disabled={picking === r.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left card-press"
                    style={{
                      background: "var(--white)",
                      border: "1px solid var(--gray-light)",
                      opacity: picking === r.id ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: isMedical ? "var(--teal-light)" : "var(--gold-pale)",
                        color: isMedical ? "var(--teal-deep)" : "var(--gold)",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                        {r.label}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>
                        {r.fileName}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: isMedical ? "var(--teal-light)" : "var(--gold-pale)",
                          color: isMedical ? "var(--teal-deep)" : "var(--gold)",
                        }}
                      >
                        {r.sourceLabelEn.toUpperCase()}
                      </span>
                      {r.dateLabel && (
                        <span className="text-[10px]" style={{ color: "var(--gray)" }}>
                          {r.dateLabel}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3 text-[13px] font-medium mb-4 btn-press"
          style={{ color: "var(--gray)" }}
        >
          Cancel · <span className="font-arabic">إلغاء</span>
        </button>
        {isAttaching && (
          <div
            className="absolute inset-0 rounded-t-3xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(2px)" }}
            data-testid="records-picker-attaching"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="px-4 py-2 rounded-full text-[12px] font-semibold animate-pulse" style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
              Attaching… · <span className="font-arabic">جارٍ الإرفاق…</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </OverlayLayer>
  );
};

export default ChatRecordsPicker;
