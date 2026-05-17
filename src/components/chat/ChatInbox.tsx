import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Sparkles, Stethoscope, User, X, ChevronRight, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useChatInbox, type ChatThreadRow } from "@/hooks/useChatInbox";
import { useResolvedContact, useResolvedContactState } from "@/hooks/useResolvedContact";
import { computeInitialsFrom } from "@/lib/contactResolver";
import { useFocusReturn } from "@/hooks/useFocusReturn";

type Tab = "all" | "ai" | "care" | "people";

interface Props {
  onOpenThread: (thread: ChatThreadRow) => void;
  /** Optional: tap an inbox avatar to open its contact profile directly. */
  onOpenProfile?: (thread: ChatThreadRow) => void;
  onNewAi: () => void;
}

/** Conversation inbox: AI, care providers, and people. */
export default function ChatInbox({ onOpenThread, onOpenProfile, onNewAi }: Props) {
  const { threads, participants, unreadByThread, loading, reload } = useChatInbox();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [newSheet, setNewSheet] = useState<null | "menu" | "people" | "care">(null);

  // Focus return: when the user opens a thread/profile and comes back, snap
  // focus to the row (or its avatar button) they last tapped. Re-runs when
  // the list finishes loading or its length changes.
  const inboxFocus = useFocusReturn<HTMLDivElement>("chat-inbox", [
    loading,
    threads.length,
  ]);

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      if (tab === "ai" && t.kind !== "ai") return false;
      if (tab === "care" && t.kind !== "provider") return false;
      if (tab === "people" && t.kind !== "direct") return false;
      if (q.trim()) {
        const hay = `${t.title ?? ""} ${t.last_message_preview ?? ""}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      }
      return true;
    });
  }, [threads, tab, q]);

  const me = getDeviceId();
  const labelFor = (t: ChatThreadRow): string => {
    if (t.kind === "ai") return t.title ?? "AI";
    if (t.kind === "provider") return t.title ?? "Care provider";
    const others = (participants[t.id] ?? []).filter((p) => p.device_id !== me);
    return others[0]?.display_name ?? "Conversation";
  };

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}>
      {/* Header */}
      <div className="px-5 pt-3 pb-3 shrink-0" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>04 — CONVERSATIONS</p>
            <p className="text-white text-[18px] font-bold" style={{ fontFamily: "'DM Sans'" }}>Chat</p>
            <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>المحادثات</p>
          </div>
          <button
            onClick={() => setNewSheet("menu")}
            className="w-10 h-10 rounded-full flex items-center justify-center btn-press"
            style={{ background: "var(--gold)" }}
            aria-label="New chat"
          >
            <Plus size={20} color="#0D1B2A" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-full px-3 py-2" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <Search size={14} color="rgba(255,255,255,0.6)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats · بحث"
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: "#fff" }}
            dir="auto"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-3 pt-2.5 pb-1 shrink-0" style={{ background: "var(--off-white)" }}>
        {([
          { id: "all", label: "All" },
          { id: "ai", label: "AI" },
          { id: "care", label: "Care" },
          { id: "people", label: "People" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 text-[12px] py-1.5 rounded-full btn-press"
            style={{
              background: tab === t.id ? "var(--teal-deep)" : "var(--white)",
              color: tab === t.id ? "#fff" : "var(--ink)",
              border: "1px solid var(--gray-light)",
              fontFamily: "'DM Sans'",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div ref={inboxFocus.containerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading && <p className="text-center text-[12px] mt-6" style={{ color: "var(--gray)" }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <EmptyState onNewAi={onNewAi} onSearch={() => setNewSheet("people")} onCare={() => setNewSheet("care")} />
        )}
        {filtered.map((t) => {
          const unread = unreadByThread[t.id] ?? 0;
          const rowKey = `row:${t.id}`;
          const avatarKey = `avatar:${t.id}`;
          return (
          // Row is a div+role="button" (NOT a <button>) so the inner avatar
          // <button> for "Open profile" is valid HTML and gets its own focus
          // ring + screen-reader name.
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            // Pin the row to LTR so the flex order (avatar → text → meta)
            // never mirrors, even if a future ancestor goes RTL. Inner text
            // blocks still use dir="auto" to read each name in its own script.
            dir="ltr"
            data-focus-key={rowKey}
            onClick={() => { inboxFocus.remember(rowKey); onOpenThread(t); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inboxFocus.remember(rowKey);
                onOpenThread(t);
              }
            }}
            aria-label={`Open conversation with ${labelFor(t)}`}
            className="w-full text-left rounded-2xl px-3 py-3 flex items-center gap-3 btn-press cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)", ["--tw-ring-color" as string]: "var(--teal-deep)" }}
          >
            {onOpenProfile && t.kind !== "ai" ? (
              <button
                type="button"
                data-focus-key={avatarKey}
                onClick={(e) => { e.stopPropagation(); inboxFocus.remember(avatarKey); onOpenProfile(t); }}
                onKeyDown={(e) => {
                  // Stop Enter/Space from also triggering the parent row.
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    inboxFocus.remember(avatarKey);
                  }
                }}
                className="rounded-full btn-press outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ ["--tw-ring-color" as string]: "var(--gold)" }}
                aria-label={`Open ${labelFor(t)} profile · فتح الملف الشخصي`}
              >
                <ThreadAvatar threadId={t.id} kind={t.kind} persona={t.ai_persona} />
              </button>
            ) : (
              <ThreadAvatar threadId={t.id} kind={t.kind} persona={t.ai_persona} />
            )}
            {/* Text column: container stays LTR so truncation/ellipsis sit on
                the trailing edge of the row; the <p>s use dir="auto" to flow
                each name/preview in its own script. */}
            <div className="flex-1 min-w-0" dir="ltr">
              <p className="text-[14px] font-bold truncate" dir="auto" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{labelFor(t)}</p>
              <p className="text-[11px] truncate" style={{ color: unread > 0 ? "var(--navy)" : "var(--gray)", fontWeight: unread > 0 ? 600 : 400 }} dir="auto">
                {t.last_message_preview ?? "New conversation"}
              </p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1" dir="ltr">
              <p className="font-mono text-[9px]" style={{ color: unread > 0 ? "var(--teal-deep)" : "var(--gray)" }} aria-hidden>{timeLabel(t.last_message_at)}</p>
              {unread > 0 ? (
                <span
                  className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "var(--teal-deep)", color: "#fff" }}
                  aria-label={`${unread} unread`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : (
                <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} aria-hidden />
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* New chat sheet */}
      {newSheet && (
        <NewChatSheet
          mode={newSheet}
          onClose={() => setNewSheet(null)}
          onPickAi={() => { setNewSheet(null); onNewAi(); }}
          onPickPeople={() => setNewSheet("people")}
          onPickCare={() => setNewSheet("care")}
          onStarted={() => { setNewSheet(null); reload(); }}
        />
      )}
    </div>
  );
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Debug flag — enable in DevTools:
//   localStorage.setItem("rufayq.debug.contactCache","1"); location.reload();
function isContactCacheDebug() {
  try { return localStorage.getItem("rufayq.debug.contactCache") === "1"; }
  catch { return false; }
}

function ThreadAvatar({ threadId, kind, persona }: { threadId: string; kind: ChatThreadRow["kind"]; persona: string | null }) {
  const { contact, loading, source, fetchedAt } = useResolvedContactState(kind === "direct" ? threadId : null, "direct");
  const bg = kind === "ai" ? "var(--navy)" : kind === "provider" ? "var(--teal-deep)" : "var(--teal-light)";
  const fg = kind === "direct" ? "var(--teal-deep)" : "#fff";
  const emoji = kind === "ai" ? (persona === "shopping" ? "🛍️" : persona === "tour" ? "🗺️" : "🩺") : null;
  const renderDirect = () => {
    if (loading && !contact) {
      // Skeleton shimmer while we resolve the participant's avatar/initials.
      return <div className="w-full h-full animate-pulse" style={{ background: "var(--gray-light)" }} aria-label="Loading contact" />;
    }
    if (contact?.avatarUrl) {
      return <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />;
    }
    if (contact?.initials) {
      return <span className="text-[15px] font-bold" style={{ fontFamily: "'DM Sans'" }}>{contact.initials}</span>;
    }
    return <User size={18} />;
  };
  const debug = kind === "direct" && isContactCacheDebug() && source !== "none";
  return (
    <div className="relative w-11 h-11 shrink-0">
      <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden" style={{ background: bg, color: fg, border: kind === "ai" ? "2px solid var(--gold)" : "none" }}>
        {kind === "ai" ? <span className="text-lg">{emoji}</span> : kind === "provider" ? <Stethoscope size={18} /> : renderDirect()}
      </div>
      {debug && <CacheBadge source={source} fetchedAt={fetchedAt} />}
    </div>
  );
}

function CacheBadge({ source, fetchedAt }: { source: "cache" | "miss" | "refresh"; fetchedAt: number | null }) {
  const map = {
    cache:   { bg: "#16a34a", label: "C", title: "Cache hit" },
    miss:    { bg: "#6b7280", label: "M", title: "First fetch" },
    refresh: { bg: "#d97706", label: "R", title: "Refreshed after TTL/invalidate" },
  } as const;
  const m = map[source];
  const ageS = fetchedAt ? Math.round((Date.now() - fetchedAt) / 1000) : null;
  return (
    <span
      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold pointer-events-none"
      style={{ background: m.bg, color: "#fff", border: "1.5px solid var(--white)", fontFamily: "'DM Sans'" }}
      title={`${m.title}${ageS != null ? ` · ${ageS}s ago` : ""}`}
      aria-hidden
    >
      {m.label}
    </span>
  );
}

function EmptyState({ onNewAi, onSearch, onCare }: { onNewAi: () => void; onSearch: () => void; onCare: () => void }) {
  return (
    <div className="text-center py-10 px-6">
      <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>No conversations yet</p>
      <p className="font-arabic text-[12px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد محادثات بعد</p>
      <div className="mt-5 flex flex-col gap-2">
        <Tile icon={<Sparkles size={16} />} title="Talk to RufayQ AI" subtitle="Medical · Shopping · Tour" onClick={onNewAi} />
        <Tile icon={<Stethoscope size={16} />} title="Message your care team" subtitle="Linked providers" onClick={onCare} />
        <Tile icon={<User size={16} />} title="Find a person" subtitle="Search by email or phone" onClick={onSearch} />
      </div>
    </div>
  );
}

function Tile({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 btn-press text-left" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{icon}</div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{title}</p>
        <p className="text-[11px]" style={{ color: "var(--gray)" }}>{subtitle}</p>
      </div>
      <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} />
    </button>
  );
}

// ----------------------------------------------------------------------------
// New chat bottom sheet
// ----------------------------------------------------------------------------
function NewChatSheet({
  mode, onClose, onPickAi, onPickPeople, onPickCare, onStarted,
}: {
  mode: "menu" | "people" | "care";
  onClose: () => void;
  onPickAi: () => void;
  onPickPeople: () => void;
  onPickCare: () => void;
  onStarted: (threadId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[390px] rounded-t-3xl pt-3 pb-6 px-5 animate-fade-in-up" style={{ background: "var(--white)" }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
            {mode === "menu" ? "Start a new chat" : mode === "people" ? "Find a person" : "Message a provider"}
          </p>
          <button onClick={onClose}><X size={18} style={{ color: "var(--gray)" }} /></button>
        </div>

        {mode === "menu" && (
          <div className="flex flex-col gap-2">
            <Tile icon={<Sparkles size={16} />} title="RufayQ AI" subtitle="Medical · Shopping · Tour" onClick={onPickAi} />
            <Tile icon={<Stethoscope size={16} />} title="Care provider" subtitle="Chat with your treating clinic" onClick={onPickCare} />
            <Tile icon={<User size={16} />} title="Another user" subtitle="Search by email or phone" onClick={onPickPeople} />
          </div>
        )}

        {mode === "people" && <PeopleSearch onStarted={onStarted} />}
        {mode === "care" && <CareList onStarted={onStarted} />}
      </div>
    </div>
  );
}

function PeopleSearch({ onStarted }: { onStarted: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ device_id: string; display_name: string | null; rufayq_id: string | null }[]>([]);
  const [searched, setSearched] = useState(false);
  // Return focus to the last-tapped search result if the sheet re-opens
  // (e.g. user cancels the started thread and comes back).
  const peopleFocus = useFocusReturn<HTMLDivElement>("people-search", [
    busy,
    results.length,
  ]);

  const looksLikeEmail = q.includes("@");
  const handleSearch = async () => {
    const v = q.trim();
    if (!v) return;
    setBusy(true); setSearched(true);
    const { data, error } = await supabase.rpc("find_chat_user", {
      _email: looksLikeEmail ? v : null,
      _phone: looksLikeEmail ? null : v,
    });
    setBusy(false);
    if (error) { toast.error("Search failed · فشل البحث"); return; }
    setResults((data ?? []) as any);
  };

  const start = async (deviceId: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("start_direct_chat", { _other_device_id: deviceId });
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Could not start chat"); return; }
    onStarted(data as string);
  };

  return (
    <div>
      <p className="text-[11px] mb-2" style={{ color: "var(--gray)" }}>
        Exact email or phone. The other person must allow discovery in their settings.
      </p>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder="email@example.com or +9665…"
          className="flex-1 rounded-full px-3.5 py-2 text-[12px] outline-none"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
        />
        <button onClick={handleSearch} disabled={busy || !q.trim()} className="px-3 rounded-full text-[12px] font-bold btn-press" style={{ background: "var(--teal-deep)", color: "#fff", opacity: q.trim() && !busy ? 1 : 0.5 }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Search"}
        </button>
      </div>
      <div className="mt-3 rounded-2xl p-3.5 flex gap-2.5" style={{ background: "rgba(93,164,156,0.08)", border: "1px solid rgba(93,164,156,0.20)" }}>
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: "var(--teal-deep)" }} />
        <div>
          <p className="text-[11px] font-bold leading-snug" style={{ color: "var(--teal-deep)" }}>
            How to find each other
          </p>
          <p className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--ink)" }}>
            Open Settings → Chat Discovery, turn on "Discoverable by phone", then search again from the other account.
          </p>
          <p className="font-arabic text-[11px] leading-snug mt-1" dir="rtl" style={{ color: "var(--gray)" }}>
            افتح الإعدادات → اكتشاف الدردشة، فعّل "الاكتشاف عبر الهاتف"، ثم أعد البحث من الحساب الآخر.
          </p>
        </div>
      </div>

      <div ref={peopleFocus.containerRef} className="mt-3 space-y-1.5">
        {searched && !busy && results.length === 0 && (
          <p className="text-center text-[12px] py-4" style={{ color: "var(--gray)" }}>
            No discoverable user found · لم يتم العثور على مستخدم
          </p>
        )}
        {results.map((r) => {
          const fallbackName = r.display_name?.trim() || r.rufayq_id?.trim() || "User";
          // Share the same Unicode-aware fallback chain as resolved threads:
          // emoji/punctuation are stripped, names like "🌙 Dr. Sara" → "DS",
          // empty/all-symbol names fall through to rufayq_id letters, then
          // device-id hash, then "?". Guarantees a readable letter in every row.
          const letter = computeInitialsFrom({
            name: r.display_name,
            rufayqId: r.rufayq_id,
            deviceId: r.device_id,
          });
          return (
          <button
            key={r.device_id}
            data-focus-key={r.device_id}
            onClick={() => { peopleFocus.remember(r.device_id); start(r.device_id); }}
            // Row pinned LTR so avatar → name → chevron never mirrors.
            // The name <p> uses dir="auto" so Arabic names still read RTL
            // inside their truncation box.
            dir="ltr"
            className="w-full rounded-2xl px-3 py-2.5 flex items-center gap-3 btn-press"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
              <span className="text-[13px] font-bold" style={{ fontFamily: "'DM Sans'" }}>{letter}</span>
            </div>
            <div className="flex-1 text-left min-w-0" dir="ltr">
              <p className="text-[13px] font-bold truncate" dir="auto" style={{ color: "var(--navy)" }}>{fallbackName}</p>
              {r.rufayq_id && <p className="font-mono text-[10px]" dir="ltr" style={{ color: "var(--gray)" }}>{r.rufayq_id}</p>}
            </div>
            <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} />
          </button>
          );
        })}
      </div>
    </div>
  );
}

function CareList({ onStarted }: { onStarted: (id: string) => void }) {
  const [items, setItems] = useState<{ organization_id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    (async () => {
      const deviceId = getDeviceId();
      // Linked active providers
      const { data: links } = await supabase
        .from("provider_patients")
        .select("organization_id, status, organizations(name)")
        .eq("patient_device_id", deviceId)
        .eq("status", "active");
      const list = (links ?? [])
        .map((l: any) => ({ organization_id: l.organization_id, name: l.organizations?.name ?? "Provider" }));
      setItems(list);
      setBusy(false);
    })();
  }, []);

  const start = async (orgId: string) => {
    const { data, error } = await supabase.rpc("start_provider_chat", { _org_id: orgId });
    if (error || !data) { toast.error(error?.message ?? "Could not start chat"); return; }
    onStarted(data as string);
  };

  if (busy) return <p className="text-center text-[12px] py-6" style={{ color: "var(--gray)" }}>Loading…</p>;
  if (items.length === 0) return (
    <p className="text-center text-[12px] py-6" style={{ color: "var(--gray)" }}>
      No linked care providers yet · لا يوجد مزودون مرتبطون
    </p>
  );
  return (
    <div className="space-y-1.5">
      {items.map((p) => (
        <button key={p.organization_id} onClick={() => start(p.organization_id)} className="w-full rounded-2xl px-3 py-2.5 flex items-center gap-3 btn-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--teal-deep)", color: "#fff" }}><Stethoscope size={16} /></div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: "var(--navy)" }}>{p.name}</p>
            <p className="text-[11px]" style={{ color: "var(--gray)" }}>Linked provider</p>
          </div>
          <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} />
        </button>
      ))}
    </div>
  );
}
