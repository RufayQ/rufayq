import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Save, Calendar, Beaker, Bell, Smartphone } from "lucide-react";
import {
  createCampaign,
  estimateAudience,
  sendCampaignNow,
  testSendCampaign,
  type PushAudience,
} from "@/hooks/useAdminPushCampaigns";
import AudienceBuilder from "./AudienceBuilder";

interface Props { onSent: () => void; isAdmin: boolean }

const DEEP_LINKS = ["/journey", "/medications", "/profile", "/pricing", "/carehub", "/wallet"];

const empty: PushAudience = { all: true, countries: [], plans: [], roles: ["patient"] };

export default function CampaignComposer({ onSent, isAdmin }: Props) {
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<PushAudience>(empty);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced audience size estimate
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setEstimating(true);
      try {
        const n = await estimateAudience(audience, "global", null);
        setEstimate(n);
      } catch {
        setEstimate(null);
      } finally {
        setEstimating(false);
      }
    }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [audience]);

  const valid = titleEn.trim().length > 0 && (audience.all || audience.countries.length > 0 || audience.plans.length > 0);
  const audienceSummary = useMemo(() => {
    if (audience.all) return "All users";
    const bits: string[] = [];
    if (audience.countries.length) bits.push(`${audience.countries.length} country/ies`);
    if (audience.plans.length) bits.push(`${audience.plans.length} plan(s)`);
    if (audience.roles.length) bits.push(audience.roles.join("+"));
    return bits.join(" · ") || "—";
  }, [audience]);

  const reset = () => {
    setTitleEn(""); setTitleAr(""); setBodyEn(""); setBodyAr(""); setLink("");
    setAudience(empty); setScheduleOn(false); setScheduledAt("");
  };

  const handle = async (mode: "draft" | "send" | "schedule" | "test") => {
    if (!valid) { toast.error("Title and an audience are required"); return; }
    setBusy(true);
    try {
      const id = await createCampaign({
        title: titleEn.trim(),
        title_ar: titleAr.trim() || undefined,
        body: bodyEn.trim() || undefined,
        body_ar: bodyAr.trim() || undefined,
        link: link.trim() || undefined,
        audience,
        scope: "global",
        organization_id: null,
        scheduled_at: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
        status: mode === "schedule" ? "scheduled" : "draft",
      });

      if (mode === "send") {
        const r = await sendCampaignNow(id);
        toast.success(`Sent to ${r.delivered} device${r.delivered === 1 ? "" : "s"}`);
        reset();
      } else if (mode === "schedule") {
        toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
        reset();
      } else if (mode === "test") {
        await testSendCampaign(id);
        toast.success("Test push sent to your device");
      } else {
        toast.success("Saved as draft");
        reset();
      }
      onSent();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Composer fields */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">English</div>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Title (English)"
            maxLength={80}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            placeholder="Body (English)"
            maxLength={300}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3" dir="rtl">
          <div className="text-xs font-semibold uppercase text-muted-foreground">العربية</div>
          <input
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            placeholder="العنوان"
            maxLength={80}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-arabic"
          />
          <textarea
            value={bodyAr}
            onChange={(e) => setBodyAr(e.target.value)}
            placeholder="النص"
            maxLength={300}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none font-arabic"
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Deep link (optional)</label>
          <input
            list="push-deep-links"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/journey"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <datalist id="push-deep-links">
            {DEEP_LINKS.map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>

        <AudienceBuilder
          value={audience}
          onChange={setAudience}
          estimate={estimate}
          estimating={estimating}
        />

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} className="h-4 w-4" />
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Schedule for later</span>
          </label>
          {scheduleOn && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={!valid || busy}
            onClick={() => handle("draft")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save draft
          </button>
          <button
            disabled={!valid || busy}
            onClick={() => handle("test")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Beaker className="h-4 w-4" /> Test send to me
          </button>
          {scheduleOn ? (
            <button
              disabled={!valid || busy || !scheduledAt}
              onClick={() => handle("schedule")}
              className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" /> Schedule
            </button>
          ) : (
            <button
              disabled={!valid || busy || !isAdmin && false}
              onClick={() => handle("send")}
              className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send now
            </button>
          )}
        </div>
      </div>

      {/* Preview pane */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-gradient-to-b from-background to-muted/30 p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Smartphone className="h-3 w-3" /> Preview
          </div>
          <div className="rounded-xl bg-card p-3 shadow-md border border-border">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{titleEn || "Your title"}</div>
                  <div className="text-[10px] text-muted-foreground shrink-0">now</div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {bodyEn || "Body preview…"}
                </div>
                {titleAr && (
                  <div className="mt-2 pt-2 border-t border-border/50" dir="rtl">
                    <div className="text-sm font-semibold font-arabic truncate">{titleAr}</div>
                    <div className="text-xs text-muted-foreground font-arabic line-clamp-2 mt-0.5">{bodyAr}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Audience: <span className="font-medium text-foreground">{audienceSummary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
