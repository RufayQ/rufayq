/**
 * Dev-only visual harness for Playwright screenshot regression tests.
 *
 * Route: /visual/chat-inbox?lang=en|ar&view=inbox|search
 *
 * Renders the inbox and people-search row markup with deterministic
 * fixtures (no Supabase, no network) so screenshots are stable across
 * runs. We mirror the styling of `ChatInbox.tsx` so any visual drift in
 * the real component will require updating fixtures here too.
 *
 * Guarded: returns 404 in production builds (import.meta.env.PROD).
 */
import { ChevronRight, Stethoscope, User } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { computeInitialsFrom } from "@/lib/contactResolver";

type ThreadFixture = {
  id: string;
  kind: "ai" | "direct" | "provider";
  title: string;
  preview: string;
  ai_persona?: "medical" | "shopping" | "tour";
  initials?: string;
  unread?: number;
  time: string;
  avatarUrl?: string;
};

const INBOX_FIXTURES: ThreadFixture[] = [
  { id: "ai-1",  kind: "ai",       title: "RufayQ Medical",   preview: "Tap to start a new conversation",                 ai_persona: "medical", time: "2:14 PM" },
  { id: "dir-1", kind: "direct",   title: "أحمد القحطاني",    preview: "أرسلت لك التقرير، ألقِ نظرة 📄",                   initials: "أق", unread: 3, time: "1:48 PM" },
  { id: "dir-2", kind: "direct",   title: "Maria Lopez",      preview: "See you at the clinic at 9am",                    initials: "ML", time: "Yesterday" },
  { id: "dir-3", kind: "direct",   title: "🌙 Dr. Sara",      preview: "Mixed-script: MRI scheduled · موعد التصوير",      initials: "DS", unread: 1, time: "Mon" },
  { id: "prv-1", kind: "provider", title: "Munich Heart Hosp", preview: "Your discharge summary is ready · جاهز",         time: "Sun" },
];

type SearchFixture = {
  device_id: string;
  display_name: string | null;
  rufayq_id: string | null;
};

const SEARCH_FIXTURES: SearchFixture[] = [
  { device_id: "d1", display_name: "Maria Lopez",       rufayq_id: "rq-7K2P" },
  { device_id: "d2", display_name: "أحمد القحطاني",     rufayq_id: "rq-9XQ1" },
  { device_id: "d3", display_name: "🌙 Dr. Sara",       rufayq_id: "rq-2HJ4" },
  { device_id: "d4", display_name: "!!!",               rufayq_id: "rq-1AB2" },
  { device_id: "d5", display_name: null,                rufayq_id: "rq-MM55" },
];

export default function VisualHarness() {
  const [params] = useSearchParams();
  const view = params.get("view") === "search" ? "search" : "inbox";
  const lang = params.get("lang") === "ar" ? "ar" : "en";
  const dirParam = params.get("dir") === "rtl" ? "rtl" : "ltr";

  useMemo(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirParam;
    return null;
  }, [lang, dirParam]);

  if (import.meta.env.PROD) {
    return <div className="p-10 text-center">Not available in production</div>;
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-[color:var(--off-white)] py-6">
      <div
        data-testid="visual-shell"
        className="w-[390px] bg-white"
        style={{ background: "var(--off-white)" }}
      >
        {view === "inbox" ? <InboxList /> : <SearchList />}
      </div>
    </div>
  );
}

function InboxList() {
  return (
    <div data-testid="inbox-list" className="px-3 py-2 space-y-1.5">
      {INBOX_FIXTURES.map((t) => (
        <Row key={t.id} t={t} />
      ))}
    </div>
  );
}

function Row({ t }: { t: ThreadFixture }) {
  return (
    <div
      role="button"
      tabIndex={0}
      dir="ltr"
      data-testid={`inbox-row-${t.id}`}
      className="w-full text-left rounded-2xl px-3 py-3 flex items-center gap-3 cursor-pointer outline-none"
      style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
    >
      <Avatar t={t} />
      <div className="flex-1 min-w-0" dir="ltr">
        <p className="text-[14px] font-bold truncate" dir="auto" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{t.title}</p>
        <p className="text-[11px] truncate" dir="auto" style={{ color: (t.unread ?? 0) > 0 ? "var(--navy)" : "var(--gray)", fontWeight: (t.unread ?? 0) > 0 ? 600 : 400 }}>{t.preview}</p>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1" dir="ltr">
        <p className="font-mono text-[9px]" style={{ color: (t.unread ?? 0) > 0 ? "var(--teal-deep)" : "var(--gray)" }}>{t.time}</p>
        {(t.unread ?? 0) > 0 ? (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--teal-deep)", color: "#fff" }}>{t.unread}</span>
        ) : (
          <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} aria-hidden />
        )}
      </div>
    </div>
  );
}

function Avatar({ t }: { t: ThreadFixture }) {
  const bg = t.kind === "ai" ? "var(--navy)" : t.kind === "provider" ? "var(--teal-deep)" : "var(--teal-light)";
  const fg = t.kind === "direct" ? "var(--teal-deep)" : "#fff";
  const emoji = t.kind === "ai" ? (t.ai_persona === "shopping" ? "🛍️" : t.ai_persona === "tour" ? "🗺️" : "🩺") : null;
  return (
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: bg, color: fg, border: t.kind === "ai" ? "2px solid var(--gold)" : "none" }}>
      {t.kind === "ai" ? <span className="text-lg">{emoji}</span>
       : t.kind === "provider" ? <Stethoscope size={18} />
       : t.initials ? <span className="text-[15px] font-bold" style={{ fontFamily: "'DM Sans'" }}>{t.initials}</span>
       : <User size={18} />}
    </div>
  );
}

function SearchList() {
  return (
    <div data-testid="search-list" className="px-3 py-2 space-y-1.5">
      {SEARCH_FIXTURES.map((r) => {
        const fallbackName = r.display_name?.trim() || r.rufayq_id?.trim() || "User";
        const letter = computeInitialsFrom({ name: r.display_name, rufayqId: r.rufayq_id, deviceId: r.device_id });
        return (
          <button
            key={r.device_id}
            dir="ltr"
            data-testid={`search-row-${r.device_id}`}
            className="w-full rounded-2xl px-3 py-2.5 flex items-center gap-3"
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
  );
}
