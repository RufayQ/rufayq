import { useEffect, useState } from "react";
import { ChevronLeft, Stethoscope, User, BellOff, Trash2, Ban, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

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
  org: { name: string | null; specialty: string | null; hours: string | null } | null;
};

export default function ConversationProfile({ threadId, title, kind, onBack }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const me = getDeviceId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: thread }, { count }, { data: parts }] = await Promise.all([
        supabase
          .from("chat_threads")
          .select("created_at, organization_id")
          .eq("id", threadId)
          .maybeSingle(),
        supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId)
          .is("deleted_at", null),
        supabase
          .from("chat_participants")
          .select("device_id, organization_id, display_name")
          .eq("thread_id", threadId),
      ]);
      let org: ProfileData["org"] = null;
      if (kind === "provider" && thread?.organization_id) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("name, specialty, hours")
          .eq("id", thread.organization_id)
          .maybeSingle();
        if (orgRow) org = orgRow as ProfileData["org"];
      }
      const otherDeviceId =
        (parts ?? []).find((p) => p.device_id && p.device_id !== me)?.device_id ?? null;
      if (!cancelled) {
        setData({
          createdAt: thread?.created_at ?? null,
          messageCount: count ?? 0,
          otherDeviceId,
          org,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, kind, me]);

  const initials = (title || "?").trim().slice(0, 1).toUpperCase();
  const roleLabel =
    kind === "provider" ? "Care provider · مزود الرعاية" : "Direct message · رسالة مباشرة";

  const handleMute = () => toast.success("Notifications muted · تم كتم الإشعارات");
  const handleClear = () => toast.success("Chat cleared · تم مسح المحادثة");
  const handleBlock = () => toast.success("Contact blocked · تم حظر جهة الاتصال");
  const handleSearch = () => toast("Search coming soon · البحث قريباً");

  return (
    <div
      className="flex flex-col"
      style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-3 shrink-0"
        style={{
          background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))",
        }}
      >
        <button onClick={onBack} className="p-1 rounded-full btn-press" aria-label="Back">
          <ChevronLeft size={22} color="#fff" />
        </button>
        <p
          className="text-white text-[15px] font-bold flex-1"
          style={{ fontFamily: "'DM Sans'" }}
        >
          Contact info
        </p>
        <p
          className="font-arabic text-[12px]"
          dir="rtl"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          المعلومات
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div
          className="flex flex-col items-center pt-8 pb-6 px-5"
          style={{
            background:
              "linear-gradient(180deg, var(--header-teal-from) 0%, var(--off-white) 100%)",
          }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
            style={{
              background:
                kind === "provider" ? "var(--teal-deep)" : "rgba(255,255,255,0.95)",
              color: kind === "provider" ? "#fff" : "var(--navy)",
              border: "2px solid var(--gold)",
              boxShadow: "0 6px 24px rgba(0,77,91,0.25)",
              fontFamily: "'DM Sans'",
              fontWeight: 700,
              fontSize: 36,
            }}
          >
            {kind === "provider" ? <Stethoscope size={40} /> : initials || <User size={36} />}
          </div>
          <p
            className="text-[20px] font-bold text-white text-center"
            style={{ fontFamily: "'DM Sans'", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          >
            {title}
          </p>
          <p
            className="font-mono text-[10px] tracking-widest mt-1"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {roleLabel}
          </p>
        </div>

        {/* Info card */}
        {kind === "provider" && data?.org && (
          <div className="px-4 pt-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
            >
              <p
                className="text-[10px] font-mono tracking-wider mb-2"
                style={{ color: "var(--gold)" }}
              >
                CLINIC · العيادة
              </p>
              {data.org.name && (
                <p
                  className="text-[14px] font-bold"
                  style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}
                >
                  {data.org.name}
                </p>
              )}
              {data.org.specialty && (
                <p className="text-[12px] mt-0.5" style={{ color: "var(--gray)" }}>
                  {data.org.specialty}
                </p>
              )}
              {data.org.hours && (
                <p className="text-[11px] mt-2" style={{ color: "var(--gray)" }}>
                  ⏰ {data.org.hours}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pt-4">
          <div
            className="rounded-2xl p-4 grid grid-cols-2 gap-3"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <div>
              <p
                className="text-[10px] font-mono tracking-wider"
                style={{ color: "var(--gold)" }}
              >
                MESSAGES
              </p>
              <p
                className="text-[18px] font-bold mt-0.5"
                style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}
              >
                {data?.messageCount ?? "—"}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-mono tracking-wider"
                style={{ color: "var(--gold)" }}
              >
                SINCE
              </p>
              <p
                className="text-[13px] font-bold mt-0.5"
                style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}
              >
                {data?.createdAt
                  ? new Date(data.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-4 pb-6">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
            <ActionRow icon={<BellOff size={16} />} label="Mute notifications" labelAr="كتم الإشعارات" onClick={handleMute} />
            <Divider />
            <ActionRow icon={<Search size={16} />} label="Search in conversation" labelAr="بحث في المحادثة" onClick={handleSearch} />
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
    </div>
  );
}

function ActionRow({
  icon,
  label,
  labelAr,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const color = danger ? "var(--error, #d33)" : "var(--navy)";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 btn-press text-left"
    >
      <span style={{ color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color, fontFamily: "'DM Sans'" }}>
          {label}
        </p>
        <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>
          {labelAr}
        </p>
      </div>
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--gray-light)" }} />;
}
