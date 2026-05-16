import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Sparkles, Stethoscope, User, X, ChevronRight, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useChatInbox, type ChatThreadRow } from "@/hooks/useChatInbox";

type Tab = "all" | "ai" | "care" | "people";

interface Props {
  onOpenThread: (thread: ChatThreadRow) => void;
  onNewAi: () => void;
}

/** Conversation inbox: AI, care providers, and people. */
export default function ChatInbox({ onOpenThread, onNewAi }: Props) {
  const { threads, participants, unreadByThread, loading, reload } = useChatInbox();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [newSheet, setNewSheet] = useState<null | "menu" | "people" | "care">(null);

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
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading && <p className="text-center text-[12px] mt-6" style={{ color: "var(--gray)" }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <EmptyState onNewAi={onNewAi} onSearch={() => setNewSheet("people")} onCare={() => setNewSheet("care")} />
        )}
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpenThread(t)}
            className="w-full text-left rounded-2xl px-3 py-3 flex items-center gap-3 btn-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <ThreadAvatar kind={t.kind} persona={t.ai_persona} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{labelFor(t)}</p>
              <p className="text-[11px] truncate" style={{ color: "var(--gray)" }} dir="auto">
                {t.last_message_preview ?? "New conversation"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{timeLabel(t.last_message_at)}</p>
              <ChevronRight size={14} className="ml-auto mt-1" style={{ color: "var(--teal-deep)" }} />
            </div>
          </button>
        ))}
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

function ThreadAvatar({ kind, persona }: { kind: ChatThreadRow["kind"]; persona: string | null }) {
  const bg = kind === "ai" ? "var(--navy)" : kind === "provider" ? "var(--teal-deep)" : "var(--teal-light)";
  const fg = kind === "direct" ? "var(--teal-deep)" : "#fff";
  const emoji = kind === "ai" ? (persona === "shopping" ? "🛍️" : persona === "tour" ? "🗺️" : "🩺") : null;
  return (
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: bg, color: fg, border: kind === "ai" ? "2px solid var(--gold)" : "none" }}>
      {kind === "ai" ? <span className="text-lg">{emoji}</span> : kind === "provider" ? <Stethoscope size={18} /> : <User size={18} />}
    </div>
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

      <div className="mt-3 space-y-1.5">
        {searched && !busy && results.length === 0 && (
          <p className="text-center text-[12px] py-4" style={{ color: "var(--gray)" }}>
            No discoverable user found · لم يتم العثور على مستخدم
          </p>
        )}
        {results.map((r) => (
          <button key={r.device_id} onClick={() => start(r.device_id)} className="w-full rounded-2xl px-3 py-2.5 flex items-center gap-3 btn-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}><User size={16} /></div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: "var(--navy)" }}>{r.display_name ?? "User"}</p>
              {r.rufayq_id && <p className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>{r.rufayq_id}</p>}
            </div>
            <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} />
          </button>
        ))}
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
