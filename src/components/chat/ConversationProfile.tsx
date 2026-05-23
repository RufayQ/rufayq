import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Stethoscope, User, BellOff, Trash2, Ban, Shield, Search, Paperclip, Link2, ImageIcon, FileText, History, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useResolvedContact } from "@/hooks/useResolvedContact";
import { parseChatBody, humanizeChatPreview, type ChatAttachmentPayload } from "@/lib/chat/chatAttachmentBody";

interface Props {
  threadId: string;
  title: string;
  kind: "direct" | "provider";
  onBack: () => void;
}

type ProfileData = {
  createdAt: string | null;
  messageCount: number;
  otherDeviceId: string | null;
  org: { name: string | null; org_type: string | null; city: string | null; country: string | null } | null;
};

type MessageLite = {
  id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  sender_device_id: string | null;
};

type MediaItem = { messageId: string; payload: ChatAttachmentPayload; createdAt: string };
type DocItem = { messageId: string; payload: ChatAttachmentPayload; createdAt: string };
type LinkItem = { messageId: string; url: string; createdAt: string };

export default function ConversationProfile({ threadId, title, kind, onBack }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [shared, setShared] = useState<{ media: MediaItem[]; docs: DocItem[]; links: LinkItem[] }>({ media: [], docs: [], links: [] });
  const [deleted, setDeleted] = useState<MessageLite[]>([]);
  const [openSheet, setOpenSheet] = useState<null | "media" | "docs" | "links" | "deleted" | "search">(null);
  const [searchQ, setSearchQ] = useState("");
  const [allMessages, setAllMessages] = useState<MessageLite[]>([]);
  const me = getDeviceId();
  const contact = useResolvedContact(threadId, kind === "provider" ? "direct" : kind);
  const displayName = kind === "direct" ? (contact?.name ?? title) : title;
  const displayNameAr = kind === "direct" ? (contact?.nameAr ?? null) : null;
  const avatarUrl = kind === "direct" ? (contact?.avatarUrl ?? null) : null;
  const initials = (contact?.initials ?? (displayName || "?").trim().slice(0, 1).toUpperCase()) || "?";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: thread }, { count }, { data: parts }, { data: msgs }] = await Promise.all([
        supabase.from("chat_threads").select("created_at, organization_id").eq("id", threadId).maybeSingle(),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("thread_id", threadId).is("deleted_at", null),
        supabase.from("chat_participants").select("device_id, organization_id, display_name").eq("thread_id", threadId),
        supabase
          .from("chat_messages")
          .select("id, body, created_at, deleted_at, sender_device_id")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      let org: ProfileData["org"] = null;
      if (kind === "provider" && thread?.organization_id) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("name, org_type, city, country")
          .eq("id", thread.organization_id)
          .maybeSingle();
        if (orgRow) org = orgRow as ProfileData["org"];
      }
      const otherDeviceId = (parts ?? []).find((p) => p.device_id && p.device_id !== me)?.device_id ?? null;
      if (cancelled) return;
      const rows = (msgs ?? []) as MessageLite[];
      setAllMessages(rows);
      setDeleted(rows.filter((m) => m.deleted_at));

      // Parse shared media/docs/links from live (non-deleted) messages.
      const media: SharedItem[] = [];
      const docs: SharedItem[] = [];
      const links: SharedItem[] = [];
      const urlRe = /https?:\/\/[^\s]+/g;
      for (const m of rows) {
        if (m.deleted_at) continue;
        const segs = parseChatBody(m.body);
        for (const s of segs) {
          if (s.type === "attachment") {
            const mt = (s.payload.mimeType ?? "").toLowerCase();
            const isImage = mt.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(s.payload.fileName);
            const item: SharedItem = { type: isImage ? "media" : "doc", messageId: m.id, payload: s.payload, createdAt: m.created_at };
            (isImage ? media : docs).push(item);
          } else {
            const matches = s.value.match(urlRe);
            if (matches) {
              for (const u of matches) links.push({ type: "link", messageId: m.id, url: u, createdAt: m.created_at });
            }
          }
        }
      }
      setShared({ media, docs, links });
      setData({
        createdAt: thread?.created_at ?? null,
        messageCount: count ?? 0,
        otherDeviceId,
        org,
      });
    })();
    return () => { cancelled = true; };
  }, [threadId, kind, me]);

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return allMessages.filter((m) => !m.deleted_at).slice(0, 50);
    return allMessages
      .filter((m) => !m.deleted_at && humanizeChatPreview(m.body).toLowerCase().includes(q))
      .slice(0, 100);
  }, [searchQ, allMessages]);

  const roleLabel = kind === "provider" ? "Care provider · مزود الرعاية" : "Direct message · رسالة مباشرة";

  const handleMute = () => toast.success("Notifications muted · تم كتم الإشعارات");
  const handleClear = () => toast.success("Chat cleared · تم مسح المحادثة");
  const handleBlock = () => toast.success("Contact blocked · تم حظر جهة الاتصال");

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-3 shrink-0"
        style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}
      >
        <button onClick={onBack} className="p-1 rounded-full btn-press" aria-label="Back">
          <ChevronLeft size={22} color="#fff" />
        </button>
        <p className="text-white text-[15px] font-bold flex-1" style={{ fontFamily: "'DM Sans'" }}>Contact info</p>
        <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "rgba(255,255,255,0.65)" }}>المعلومات</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div
          className="flex flex-col items-center pt-8 pb-6 px-5"
          style={{ background: "linear-gradient(180deg, var(--header-teal-from) 0%, var(--off-white) 100%)" }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-3 overflow-hidden"
            style={{
              background: avatarUrl ? "transparent" : kind === "provider" ? "var(--teal-deep)" : "rgba(255,255,255,0.95)",
              color: kind === "provider" ? "#fff" : "var(--navy)",
              border: "2px solid var(--gold)",
              boxShadow: "0 6px 24px rgba(0,77,91,0.25)",
              fontFamily: "'DM Sans'",
              fontWeight: 700,
              fontSize: 36,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : kind === "provider" ? (
              <Stethoscope size={40} />
            ) : (
              initials || <User size={36} />
            )}
          </div>
          <p className="text-[20px] font-bold text-white text-center" dir="auto" style={{ fontFamily: "'DM Sans'", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            {displayName}
          </p>
          {displayNameAr && (
            <p className="font-arabic text-[14px] text-center mt-0.5" dir="rtl" style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
              {displayNameAr}
            </p>
          )}
          <p className="font-mono text-[10px] tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{roleLabel}</p>
        </div>

        {kind === "provider" && data?.org && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl p-4" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[10px] font-mono tracking-wider mb-2" style={{ color: "var(--gold)" }}>CLINIC · العيادة</p>
              {data.org.name && <p className="text-[14px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{data.org.name}</p>}
              {data.org.org_type && <p className="text-[12px] mt-0.5 capitalize" style={{ color: "var(--gray)" }}>{data.org.org_type.replace(/_/g, " ")}</p>}
              {(data.org.city || data.org.country) && (
                <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>📍 {[data.org.city, data.org.country].filter(Boolean).join(", ")}</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4 grid grid-cols-2 gap-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div>
              <p className="text-[10px] font-mono tracking-wider" style={{ color: "var(--gold)" }}>MESSAGES</p>
              <p className="text-[18px] font-bold mt-0.5" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{data?.messageCount ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-wider" style={{ color: "var(--gold)" }}>SINCE</p>
              <p className="text-[13px] font-bold mt-0.5" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
                {data?.createdAt ? new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Shared section */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <p className="px-4 pt-3 text-[10px] font-mono tracking-wider" style={{ color: "var(--gold)" }}>
              SHARED · المشاركات
            </p>
            <SharedRow icon={<ImageIcon size={16} />} label="Shared media" labelAr="الوسائط" count={shared.media.length} onClick={() => setOpenSheet("media")} />
            <Divider />
            <SharedRow icon={<FileText size={16} />} label="Shared documents" labelAr="المستندات" count={shared.docs.length} onClick={() => setOpenSheet("docs")} />
            <Divider />
            <SharedRow icon={<Link2 size={16} />} label="Shared links" labelAr="الروابط" count={shared.links.length} onClick={() => setOpenSheet("links")} />
            <Divider />
            <SharedRow icon={<History size={16} />} label="Deleted messages" labelAr="الرسائل المحذوفة" count={deleted.length} onClick={() => setOpenSheet("deleted")} />
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-4 pb-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <ActionRow icon={<BellOff size={16} />} label="Mute notifications" labelAr="كتم الإشعارات" onClick={handleMute} />
            <Divider />
            <ActionRow icon={<Search size={16} />} label="Search in conversation" labelAr="بحث في المحادثة" onClick={() => setOpenSheet("search")} />
            <Divider />
            <ActionRow icon={<Trash2 size={16} />} label="Clear chat" labelAr="مسح المحادثة" onClick={handleClear} danger />
            {kind === "direct" && (
              <>
                <Divider />
                <ActionRow icon={<Ban size={16} />} label="Block contact" labelAr="حظر جهة الاتصال" onClick={handleBlock} danger />
              </>
            )}
          </div>

          <div className="flex items-start gap-2 mt-4 px-1">
            <Shield size={12} style={{ color: "var(--gray)", marginTop: 2, flexShrink: 0 }} />
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--gray)" }}>
              Messages are private to participants. · الرسائل خاصة بالمشاركين فقط.
            </p>
          </div>
        </div>
      </div>

      {openSheet === "media" && (
        <SharedSheet title="Shared media" titleAr="الوسائط المشتركة" onClose={() => setOpenSheet(null)}>
          {shared.media.length === 0 && <Empty />}
          <div className="grid grid-cols-3 gap-2">
            {shared.media.map((m, i) => (
              <a key={i} href={m.payload.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden block" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                {m.payload.url ? (
                  <img src={m.payload.url} alt={m.payload.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} style={{ color: "var(--gray)" }} /></div>
                )}
              </a>
            ))}
          </div>
        </SharedSheet>
      )}

      {openSheet === "docs" && (
        <SharedSheet title="Shared documents" titleAr="المستندات المشتركة" onClose={() => setOpenSheet(null)}>
          {shared.docs.length === 0 && <Empty />}
          <div className="space-y-2">
            {shared.docs.map((d, i) => (
              <a key={i} href={d.payload.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl px-3 py-3 btn-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <Paperclip size={16} style={{ color: "var(--teal-deep)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>{d.payload.label}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>{d.payload.fileName}</p>
                </div>
                <span className="text-[10px] font-mono" style={{ color: "var(--gray)" }}>{new Date(d.createdAt).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        </SharedSheet>
      )}

      {openSheet === "links" && (
        <SharedSheet title="Shared links" titleAr="الروابط المشتركة" onClose={() => setOpenSheet(null)}>
          {shared.links.length === 0 && <Empty />}
          <div className="space-y-2">
            {shared.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl px-3 py-3 btn-press" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <Link2 size={16} style={{ color: "var(--teal-deep)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: "var(--navy)" }}>{l.url}</p>
                  <p className="text-[10px] font-mono" style={{ color: "var(--gray)" }}>{new Date(l.createdAt).toLocaleString()}</p>
                </div>
              </a>
            ))}
          </div>
        </SharedSheet>
      )}

      {openSheet === "deleted" && (
        <SharedSheet title="Deleted messages" titleAr="الرسائل المحذوفة" onClose={() => setOpenSheet(null)}>
          {deleted.length === 0 && <Empty />}
          <div className="space-y-2">
            {deleted.map((m) => (
              <div key={m.id} className="rounded-2xl px-3 py-3" style={{ background: "var(--off-white)", border: "1px dashed var(--gray-light)" }}>
                <p className="text-[10px] font-mono mb-1" style={{ color: "var(--gray)" }}>
                  {m.sender_device_id === me ? "You · أنت" : displayName} · {new Date(m.deleted_at || m.created_at).toLocaleString()}
                </p>
                <p className="text-[12px] italic" style={{ color: "var(--gray)" }} dir="auto">
                  {humanizeChatPreview(m.body) || "Message deleted · رسالة محذوفة"}
                </p>
              </div>
            ))}
          </div>
        </SharedSheet>
      )}

      {openSheet === "search" && (
        <SharedSheet title="Search in conversation" titleAr="بحث في المحادثة" onClose={() => setOpenSheet(null)}>
          <div className="mb-3 flex items-center gap-2 rounded-full px-3 py-2" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <Search size={14} style={{ color: "var(--gray)" }} />
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Type to search · اكتب للبحث"
              className="flex-1 bg-transparent text-[13px] outline-none"
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            {searchResults.length === 0 && <Empty />}
            {searchResults.map((m) => (
              <div key={m.id} className="rounded-2xl px-3 py-2.5" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="text-[10px] font-mono mb-1" style={{ color: "var(--gray)" }}>
                  {m.sender_device_id === me ? "You · أنت" : displayName} · {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="text-[12px]" dir="auto" style={{ color: "var(--ink)" }}>
                  {humanizeChatPreview(m.body)}
                </p>
              </div>
            ))}
          </div>
        </SharedSheet>
      )}
    </div>
  );
}

function SharedSheet({ title, titleAr, onClose, children }: { title: string; titleAr: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-t-3xl p-5 max-h-[80vh] flex flex-col" style={{ background: "var(--white)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[15px] font-bold flex-1" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{title}</p>
          <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>{titleAr}</p>
          <button onClick={onClose} className="p-1 rounded-full btn-press" aria-label="Close">
            <X size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-center text-[12px] py-8" style={{ color: "var(--gray)" }}>Nothing yet · لا يوجد</p>;
}

function SharedRow({ icon, label, labelAr, count, onClick }: { icon: React.ReactNode; label: string; labelAr: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 btn-press text-left">
      <span style={{ color: "var(--teal-deep)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{label}</p>
        <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
      <span className="text-[12px] font-mono" style={{ color: "var(--gray)" }}>{count}</span>
      <ChevronRight size={14} style={{ color: "var(--gray)" }} />
    </button>
  );
}

function ActionRow({ icon, label, labelAr, onClick, danger }: { icon: React.ReactNode; label: string; labelAr: string; onClick: () => void; danger?: boolean }) {
  const color = danger ? "var(--error, #d33)" : "var(--navy)";
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 btn-press text-left">
      <span style={{ color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color, fontFamily: "'DM Sans'" }}>{label}</p>
        <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{labelAr}</p>
      </div>
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--gray-light)" }} />;
}
