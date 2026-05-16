import { useState } from "react";
import { ChevronDown, Star, Pin, Copy, Share2, Download, RefreshCw, Stethoscope, HeartPulse, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import RufayQLogo from "@/components/RufayQLogo";
import StepDetailsPanel from "@/components/timeline/StepDetailsPanel";
import { useAuthUserId } from "@/hooks/useAuthUserId";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import ProviderFeedCard from "@/components/ProviderFeedCard";
import { useProviderFeed } from "@/hooks/useProviderFeed";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useAppointments } from "@/hooks/useAppointments";
import LifestyleTabs from "@/features/carehub/lifestyle/LifestyleTabs";

type SubTab = "careplan" | "videos" | "education" | "faqs" | "nutrition" | "exercises";
type Segment = "medical" | "lifestyle";

const subTabs: { id: SubTab; emoji: string; en: string }[] = [
  { id: "careplan", emoji: "📋", en: "Care Plan" },
  { id: "videos", emoji: "🎬", en: "Videos" },
  { id: "education", emoji: "📚", en: "Education" },
  { id: "faqs", emoji: "❓", en: "FAQs" },
  { id: "nutrition", emoji: "🥗", en: "Nutrition" },
  { id: "exercises", emoji: "🏃", en: "Exercises" },
];

interface CareHubScreenProps {
  onNavigate?: (tab: string, context?: string) => void;
}

const CareHubScreen = ({ onNavigate }: CareHubScreenProps = {}) => {
  const isGuest = useGuestMode();
  const [segment, setSegment] = useState<Segment>("medical");
  const [activeTab, setActiveTab] = useState<SubTab>("careplan");
  const handleBuddyChat = (context: string) => onNavigate?.("chat", context);

  const handleCopyCarePlan = () => {
    navigator.clipboard.writeText("Care Plan Summary\nPost-Op Day 5 · Knee Replacement\nStatus: On Track\n\nFollow your prescribed exercises, medications, and follow-up appointments.");
    toast.success("Care plan copied · تم نسخ خطة الرعاية", { duration: 2000 });
  };

  const handleShareCarePlan = () => {
    const text = "Care Plan Summary — Post-Op Day 5 · Knee Replacement · Status: On Track";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleExportCarePlan = () => {
    const text = "Care Plan — Post-Op Day 5\nKnee Replacement\n\nTasks:\n- Morning meds 8AM\n- Elevate leg 30 min\n- Cold compress\n- Breathing exercises\n- Evening meds 8PM\n- Log pain level";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "care-plan.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Care plan exported · تم تصدير خطة الرعاية", { duration: 2000 });
  };

  const careMenuItems: HeaderMenuItem[] = [
    { icon: <Copy size={14} />, label: "Copy Plan", labelAr: "نسخ الخطة", onClick: handleCopyCarePlan },
    { icon: <Download size={14} />, label: "Export Plan", labelAr: "تصدير الخطة", onClick: handleExportCarePlan },
    { icon: <Share2 size={14} />, label: "Share with Doctor", labelAr: "مشاركة مع الطبيب", onClick: handleShareCarePlan },
  ];

  // Note: Care Hub renders the full recovery experience for both signed-in
  // users and guests. Earlier builds gated this behind an "empty" placeholder
  // for non-guests; that placeholder was removed so all users see Care Plan,
  // Videos, Education, FAQs, Nutrition and Exercises tabs.

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-4 overflow-hidden shrink-0" style={{ background: "linear-gradient(145deg, var(--header-dark-from), var(--header-dark-to))" }}>
        <svg className="absolute bottom-0 right-0" width="80" height="80" viewBox="0 0 80 80" fill="none">
          <path d="M80 0 A80 80 0 0 1 0 80" stroke="rgba(197,150,90,0.2)" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(197,150,90,0.6)" }}>04 — CARE HUB</p>
            <p className="font-display text-xl text-white" style={{ fontWeight: 300 }}>Your Recovery Hub</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "rgba(255,255,255,0.45)" }}>مركز التعافي الخاص بك</p>
          </div>
          <HeaderMenu items={careMenuItems} />
        </div>
        {/* Patient status — demo placeholder only shown to guests */}
        {isGuest ? (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-[14px]">🦽</span>
            <div className="flex-1">
              <p className="text-[11px] text-white font-medium">Post-Op Day 5 · Knee Replacement <span className="opacity-60">(demo)</span></p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "rgba(255,255,255,0.4)" }}>اليوم الخامس بعد العملية<span className="font-arabic" dir="rtl"> · استبدال الركبة (عرض توضيحي)</span></p>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(61,170,110,0.2)", color: "#3DAA6E" }}>On Track</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-[14px]">🩺</span>
            <div className="flex-1">
              <p className="text-[11px] text-white font-medium">No active care plan yet</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "rgba(255,255,255,0.4)" }}>لا توجد خطة رعاية نشطة بعد</p>
            </div>
          </div>
        )}
      </div>

      {/* Segmented switcher: Medical Care | Lifestyle */}
      <div className="shrink-0 px-4 pt-3" style={{ background: "var(--off-white)" }}>
        <div
          role="tablist"
          aria-label="Care Hub segment"
          className="flex p-1 rounded-xl"
          style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
        >
          {([
            { key: "medical" as const, icon: <Stethoscope size={13} />, en: "Medical Care", ar: "العناية الطبية" },
            { key: "lifestyle" as const, icon: <HeartPulse size={13} />, en: "Lifestyle", ar: "أسلوب الحياة" },
          ]).map((s) => {
            const active = segment === s.key;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={active}
                onClick={() => setSegment(s.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold btn-press transition-all"
                style={{
                  background: active ? "var(--teal-deep)" : "transparent",
                  color: active ? "#fff" : "var(--gray)",
                }}
              >
                {s.icon}
                <span>{s.en}</span>
                <span className="font-arabic text-[10px] opacity-80" dir="rtl">· {s.ar}</span>
              </button>
            );
          })}
        </div>
      </div>

      {segment === "lifestyle" ? (
        <LifestyleTabs onChat={handleBuddyChat} />
      ) : !isGuest ? (
        <div className="flex-1 overflow-y-auto" style={{ background: "var(--off-white)" }}>
          <div className="px-5 py-10 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: "var(--teal-light)" }}>🩺</div>
            <p className="text-[15px] font-bold mb-1" style={{ color: "var(--navy)" }}>Your recovery hub is ready</p>
            <p className="font-arabic text-[12px] mb-4" dir="rtl" style={{ color: "var(--gray)" }}>مركز التعافي جاهز</p>
            <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--gray)" }}>
              Your personalised care plan, education and exercises will appear here once your treating provider shares them, or after you complete an appointment.
            </p>
            <p className="font-arabic text-[11px] leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
              ستظهر هنا خطة الرعاية والمحتوى التثقيفي والتمارين الخاصة بك بمجرد أن يشاركها الطبيب أو بعد إتمام موعدك.
            </p>
            <p className="text-[10px] mt-5" style={{ color: "var(--gray)" }}>
              ⚠️ This app does not replace professional medical advice.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Sub-tabs */}
          <div className="shrink-0 overflow-x-auto px-4 py-2 flex gap-2" style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)", WebkitOverflowScrolling: "touch" }}>
            {subTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium btn-press transition-all whitespace-nowrap"
                style={{
                  background: activeTab === t.id ? "var(--teal-deep)" : "var(--white)",
                  color: activeTab === t.id ? "#fff" : "var(--gray)",
                  border: activeTab === t.id ? "none" : "1px solid var(--gray-light)",
                }}>
                {t.emoji} {t.en}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "var(--off-white)", WebkitOverflowScrolling: "touch" }}>
            {activeTab === "careplan" && <CarePlanTab />}
            {activeTab === "videos" && <VideosTab />}
            {activeTab === "education" && <EducationTab />}
            {activeTab === "faqs" && <FAQsTab />}
            {activeTab === "nutrition" && <NutritionTab />}
            {activeTab === "exercises" && <ExercisesTab />}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── CARE PLAN ─── */
const CarePlanTab = () => {
  const { instructions } = useProviderFeed();
  const [tasks, setTasks] = useState([
    { en: "Morning meds 8AM", ar: "أدوية الصباح ٨ ص", done: false },
    { en: "Elevate leg 30 min", ar: "رفع الرجل ٣٠ دقيقة", done: true },
    { en: "Cold compress", ar: "كمادة باردة", done: false },
    { en: "Breathing exercises", ar: "تمارين التنفس", done: false },
    { en: "Evening meds 8PM", ar: "أدوية المساء ٨ م", done: false },
    { en: "Log pain level", ar: "تسجيل مستوى الألم", done: false },
  ]);
  const [painLevel, setPainLevel] = useState(3);

  const toggleTask = (i: number) => setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, done: !t.done } : t));
  const doneCount = tasks.filter(t => t.done).length;

  const milestones = [
    { date: "Apr 15", emoji: "✈️", en: "Return Flight", ar: "رحلة العودة" },
    { date: "Apr 17", emoji: "🏥", en: "Wound Check", ar: "فحص الجرح" },
    { date: "Apr 22", emoji: "🔬", en: "7-Day Labs", ar: "تحاليل ٧ أيام" },
    { date: "May 1", emoji: "🏃", en: "Start Physio", ar: "بدء العلاج الطبيعي" },
    { date: "May 15", emoji: "📋", en: "30-Day Review", ar: "مراجعة ٣٠ يوم" },
    { date: "Jun 15", emoji: "🎉", en: "Recovery!", ar: "تعافي كامل!" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Provider Instructions Feed */}
      {instructions.length > 0 && (
        <div>
          <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>
            FROM YOUR CARE TEAM · <span className="font-arabic">من فريق الرعاية</span>
          </p>
          {instructions.slice(0, 5).map(i => (
            <ProviderFeedCard
              key={i.id}
              orgName={i.org_name}
              title={i.title}
              body={i.body}
              bodyAr={i.body_ar}
              createdAt={i.created_at}
              priority={i.priority}
              badge={i.priority === "high" || i.priority === "urgent" ? i.priority.toUpperCase() : undefined}
              badgeColor={i.priority === "high" || i.priority === "urgent" ? "rgba(217,79,79,0.15)" : undefined}
            />
          ))}
        </div>
      )}

      {/* Daily Tasks */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>TODAY'S TASKS</p>
          <span className="text-[10px] font-bold" style={{ color: "var(--teal-deep)" }}>{doneCount}/{tasks.length}</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--gray-light)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / tasks.length) * 100}%`, background: "var(--success)" }} />
        </div>
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <button key={i} onClick={() => toggleTask(i)} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl btn-press text-left transition-all"
              style={{ background: t.done ? "rgba(61,170,110,0.06)" : "var(--off-white)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                style={{ background: t.done ? "var(--success)" : "var(--gray-light)", color: t.done ? "#fff" : "var(--gray)" }}>
                {t.done ? "✓" : ""}
              </div>
              <div className="flex-1">
                <p className="text-[12px]" style={{ color: t.done ? "var(--gray)" : "var(--navy)", textDecoration: t.done ? "line-through" : "none" }}>{t.en}</p>
                <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{t.ar}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>RECOVERY MILESTONES</p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {milestones.map((m, i) => (
            <div key={i} className="shrink-0 w-[120px] rounded-xl p-3 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <span className="text-[24px]">{m.emoji}</span>
              <p className="text-[11px] font-bold mt-1" style={{ color: "var(--navy)" }}>{m.en}</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{m.ar}</p>
              <p className="font-mono text-[9px] mt-1" style={{ color: "var(--gold)" }}>{m.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>VITALS TRACKING</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[9px] font-mono" style={{ color: "var(--gray)" }}>PAIN</p>
            <p className="text-[22px] font-bold" style={{ color: painLevel <= 3 ? "var(--success)" : painLevel <= 6 ? "var(--warning)" : "var(--error)" }}>{painLevel}</p>
            <p className="text-[8px]" style={{ color: "var(--gray)" }}>/10</p>
            <input type="range" min={0} max={10} value={painLevel} onChange={e => setPainLevel(+e.target.value)}
              className="w-full mt-1" style={{ accentColor: "var(--teal-deep)", height: 4 }} />
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[9px] font-mono" style={{ color: "var(--gray)" }}>TEMP</p>
            <p className="text-[22px] font-bold" style={{ color: "var(--navy)" }}>36.8</p>
            <p className="text-[8px]" style={{ color: "var(--gray)" }}>°C</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
            <p className="text-[9px] font-mono" style={{ color: "var(--gray)" }}>SWELLING</p>
            <p className="text-[16px] font-bold mt-1" style={{ color: "var(--warning)" }}>Mild</p>
            <p className="font-arabic text-[8px]" style={{ color: "var(--gray)" }}>خفيف</p>
          </div>
        </div>

        {/* 7-day pain chart */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <p className="text-[10px] mb-2" style={{ color: "var(--gray)" }}>7-Day Pain Trend</p>
          <div className="flex items-end gap-1.5 h-12">
            {[7, 6, 5, 4, 4, 3, 3].map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{
                height: `${(v / 10) * 100}%`,
                background: v <= 4 ? "var(--teal-deep)" : "var(--warning)",
                opacity: i === 6 ? 1 : 0.5 + (i * 0.07),
              }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="text-[8px] flex-1 text-center" style={{ color: "var(--gray)" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── VIDEOS ─── */
const VideosTab = () => {
  const [filter, setFilter] = useState("All");
  const [starred, setStarred] = useState<number[]>([]);
  const [pinned, setPinned] = useState<number[]>([]);
  const filters = ["All", "Mobility", "Recovery", "Safety", "Care", "Travel"];
  const videos = [
    { title: "Post-Op Knee Exercises", ar: "تمارين ما بعد العملية", duration: "12:30", totalSec: 750, watchedSec: 225, cat: "Mobility" },
    { title: "Wound Care at Home", ar: "العناية بالجرح في المنزل", duration: "8:15", totalSec: 495, watchedSec: 495, cat: "Care" },
    { title: "Managing Pain Safely", ar: "إدارة الألم بأمان", duration: "10:00", totalSec: 600, watchedSec: 0, cat: "Recovery" },
    { title: "Traveling After Surgery", ar: "السفر بعد العملية", duration: "6:45", totalSec: 405, watchedSec: 120, cat: "Travel" },
    { title: "Red Flag Symptoms", ar: "أعراض الخطر", duration: "5:20", totalSec: 320, watchedSec: 0, cat: "Safety" },
  ];

  const getStatus = (v: typeof videos[0]) => {
    const pct = Math.round((v.watchedSec / v.totalSec) * 100);
    if (pct >= 100) return { label: "Completed", color: "var(--success)", pct: 100 };
    if (pct > 0) return { label: `${pct}% watched`, color: "var(--gold)", pct };
    return { label: "Not started", color: "var(--gray)", pct: 0 };
  };

  const formatWatched = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleStar = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };
  const togglePin = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const featured = videos[0];
  const featuredStatus = getStatus(featured);
  const filtered = filter === "All" ? videos.slice(1) : videos.filter(v => v.cat === filter);

  // Sort: pinned first
  const sorted = [...filtered].sort((a, b) => {
    const ai = videos.indexOf(a), bi = videos.indexOf(b);
    const ap = pinned.includes(ai) ? 0 : 1, bp = pinned.includes(bi) ? 0 : 1;
    return ap - bp;
  });

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Featured */}
      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <div className="relative h-[180px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--header-dark-from), var(--header-teal-from))" }}>
          <span className="text-5xl">🎬</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              <span className="text-white text-2xl ml-1">▶</span>
            </div>
          </div>
          {/* Progress bar overlay at bottom of video */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full" style={{ width: `${featuredStatus.pct}%`, background: "var(--gold)", transition: "width 600ms ease" }} />
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between" style={{ marginBottom: 3 }}>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(197,150,90,0.3)", color: "#C5965A" }}>{featuredStatus.label}</span>
            <span className="text-[10px] text-white font-mono">{formatWatched(featured.watchedSec)} / {featured.duration}</span>
          </div>
          {/* Star & Pin */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={(e) => toggleStar(0, e)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
              <Star size={14} fill={starred.includes(0) ? "#C5965A" : "none"} color={starred.includes(0) ? "#C5965A" : "#fff"} />
            </button>
            <button onClick={(e) => togglePin(0, e)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
              <Pin size={14} fill={pinned.includes(0) ? "#C5965A" : "none"} color={pinned.includes(0) ? "#C5965A" : "#fff"} />
            </button>
          </div>
        </div>
        <div className="p-4" style={{ background: "var(--white)" }}>
          <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>{featured.title}</p>
          <p className="font-arabic text-[12px]" dir="rtl" style={{ color: "var(--gray)" }}>{featured.ar}</p>
          <button className="mt-2 px-4 py-1.5 rounded-full text-[11px] font-bold text-white btn-press" style={{ background: "var(--teal-deep)" }}>
            ▶ {featuredStatus.pct > 0 && featuredStatus.pct < 100 ? "Continue Watching" : featuredStatus.pct >= 100 ? "Watch Again" : "Start Watching"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="shrink-0 px-3 py-1 rounded-full text-[10px] font-medium btn-press"
            style={{ background: filter === f ? "var(--teal-deep)" : "var(--white)", color: filter === f ? "#fff" : "var(--gray)", border: "1px solid var(--gray-light)" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Video list */}
      {sorted.map((v) => {
        const vi = videos.indexOf(v);
        const status = getStatus(v);
        const isStarred = starred.includes(vi);
        const isPinned = pinned.includes(vi);
        return (
          <div key={vi} className="flex gap-3 p-3 rounded-xl btn-press relative" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: isPinned ? "3px solid var(--gold)" : "3px solid transparent" }}>
            <div className="w-20 h-14 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--header-dark-to), var(--header-teal-from))" }}>
              <span className="text-xl">▶</span>
              {/* Mini progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div className="h-full" style={{ width: `${status.pct}%`, background: status.pct >= 100 ? "var(--success)" : "var(--gold)" }} />
              </div>
              {status.pct >= 100 && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: "var(--success)", color: "#fff" }}>✓</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate" style={{ color: "var(--navy)" }}>{v.title}</p>
                  <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{v.ar}</p>
                </div>
                <div className="flex gap-1 ml-1 shrink-0">
                  <button onClick={(e) => toggleStar(vi, e)} className="p-0.5">
                    <Star size={12} fill={isStarred ? "#C5965A" : "none"} color={isStarred ? "#C5965A" : "var(--gray-light)"} />
                  </button>
                  <button onClick={(e) => togglePin(vi, e)} className="p-0.5">
                    <Pin size={12} fill={isPinned ? "#C5965A" : "none"} color={isPinned ? "#C5965A" : "var(--gray-light)"} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{formatWatched(v.watchedSec)} / {v.duration}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${status.color}15`, color: status.color }}>{status.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{v.cat}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── EDUCATION ─── */
const EducationTab = () => {
  const modules = [
    { en: "Understanding Your Surgery", ar: "فهم عمليتك الجراحية", done: true },
    { en: "Post-Op Day 1–3", ar: "الأيام ١-٣ بعد العملية", done: true },
    { en: "Pain Management", ar: "إدارة الألم", done: true },
    { en: "Wound Care Basics", ar: "أساسيات العناية بالجرح", done: false, current: true },
    { en: "Mobility & Exercises", ar: "الحركة والتمارين", done: false },
    { en: "Nutrition for Recovery", ar: "التغذية للتعافي", done: false },
    { en: "Preparing for Travel Home", ar: "الاستعداد للسفر", done: false },
    { en: "Post-Return Care", ar: "الرعاية بعد العودة", done: false },
  ];
  const doneCount = modules.filter(m => m.done).length;

  const articles = [
    { emoji: "🩹", en: "Signs of Wound Infection", ar: "علامات التهاب الجرح", time: "3 min" },
    { emoji: "💊", en: "Understanding Your Medications", ar: "فهم أدويتك", time: "5 min" },
    { emoji: "🛫", en: "Flying After Knee Surgery", ar: "السفر الجوي بعد عملية الركبة", time: "4 min" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Learning Path */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>LEARNING PATH</p>
          <span className="text-[10px] font-bold" style={{ color: "var(--teal-deep)" }}>{doneCount}/8 complete</span>
        </div>
        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--gray-light)" }}>
          <div className="h-full rounded-full" style={{ width: `${(doneCount / 8) * 100}%`, background: "var(--gold)" }} />
        </div>
        <div className="space-y-1.5">
          {modules.map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg"
              style={{ background: m.current ? "var(--gold-pale)" : m.done ? "rgba(61,170,110,0.04)" : "var(--off-white)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0"
                style={{
                  background: m.done ? "var(--success)" : m.current ? "var(--gold)" : "var(--gray-light)",
                  color: m.done || m.current ? "#fff" : "var(--gray)",
                }}>
                {m.done ? "✓" : m.current ? "→" : "🔒"}
              </div>
              <div className="flex-1">
                <p className="text-[12px]" style={{ color: m.done ? "var(--gray)" : "var(--navy)", fontWeight: m.current ? 700 : 400 }}>{m.en}</p>
                <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{m.ar}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Articles */}
      <p className="font-mono text-[9px] tracking-widest px-1" style={{ color: "var(--gold)" }}>RECOMMENDED READING</p>
      {articles.map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl btn-press" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <span className="text-2xl">{a.emoji}</span>
          <div className="flex-1">
            <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>{a.en}</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{a.ar}</p>
          </div>
          <span className="font-mono text-[9px]" style={{ color: "var(--gold)" }}>{a.time}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── FAQs ─── */
const FAQsTab = () => {
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const sections = [
    { title: "🚨 Emergency", ar: "حالات الطوارئ", questions: [
      { q: "When should I go to the ER?", qar: "متى يجب أن أذهب للطوارئ؟", a: "Go immediately if: fever >38.5°C, sudden severe pain, wound bleeding that won't stop, difficulty breathing, or chest pain.", aar: "اذهب فوراً إذا: حرارة أعلى من ٣٨.٥، ألم شديد مفاجئ، نزيف لا يتوقف، صعوبة في التنفس، أو ألم في الصدر.", emergency: true },
    ]},
    { title: "💊 Medications", ar: "الأدوية", questions: [
      { q: "Can I take pain meds with food?", qar: "هل يمكنني تناول مسكنات الألم مع الطعام؟", a: "Yes, always take ibuprofen with food to protect your stomach. Omeprazole should be taken 30 minutes before eating.", aar: "نعم، تناول الإيبوبروفين دائماً مع الطعام لحماية المعدة. الأوميبرازول يؤخذ قبل الأكل بـ٣٠ دقيقة." },
    ]},
    { title: "✈️ Travel", ar: "السفر", questions: [
      { q: "Can I fly 10 days after surgery?", qar: "هل يمكنني السفر بالطائرة بعد ١٠ أيام من العملية؟", a: "Your surgeon has cleared you for travel on Apr 15. Wear compression stockings, move every hour, and stay hydrated.", aar: "وافق جراحك على سفرك في ١٥ أبريل. ارتدِ جوارب ضاغطة وتحرك كل ساعة واشرب الماء." },
    ]},
    { title: "🏠 After Return", ar: "بعد العودة", questions: [
      { q: "When is my first follow-up in KSA?", qar: "متى أول متابعة في السعودية؟", a: "Your first follow-up is scheduled for April 17 — a wound check at your local hospital. Bring your discharge summary.", aar: "أول متابعة مجدولة في ١٧ أبريل — فحص الجرح في مستشفاك المحلي. أحضر ملخص الخروج." },
    ]},
    { title: "🧠 Mental Health", ar: "الصحة النفسية", questions: [
      { q: "I feel anxious about recovery", qar: "أشعر بالقلق بشأن التعافي", a: "Recovery anxiety is completely normal. Talking about it helps. RufayQ is here 24/7 to listen and support you.", aar: "القلق من التعافي طبيعي تماماً. التحدث عنه يساعد. رُفَيِّق موجود ٢٤/٧ للاستماع ودعمك.", mental: true },
    ]},
  ];

  const lc = search.toLowerCase();
  const matchesQ = (q: { q: string; qar: string; a: string; aar: string }) =>
    !lc || q.q.toLowerCase().includes(lc) || q.qar.includes(search) || q.a.toLowerCase().includes(lc) || q.aar.includes(search);

  const filteredSections = sections
    .map(s => ({ ...s, questions: s.questions.filter(matchesQ) }))
    .filter(s => s.questions.length > 0);

  const highlightText = (text: string, isArabic = false) => {
    if (!lc) return text;
    const query = isArabic ? search : lc;
    const target = isArabic ? text : text.toLowerCase();
    const idx = target.indexOf(query);
    if (idx === -1) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span style={{ background: "rgba(197,150,90,0.25)", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Search */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--white)", border: search ? "1.5px solid var(--teal-deep)" : "1px solid var(--gray-light)", transition: "border 200ms" }}>
        <span className="text-[14px]">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-[13px] bg-transparent outline-none font-arabic"
          dir="rtl"
          placeholder="ابحث في الأسئلة الشائعة..."
          style={{ color: "var(--navy)" }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-[14px]" style={{ color: "var(--gray)" }}>✕</button>
        )}
      </div>

      {/* Result count when searching */}
      {search && (
        <p className="text-[10px] font-mono px-1" style={{ color: "var(--gray)" }}>
          {filteredSections.reduce((a, s) => a + s.questions.length, 0)} result(s) found
        </p>
      )}

      {filteredSections.length === 0 && (
        <div className="text-center py-8">
          <span className="text-3xl">🔍</span>
          <p className="text-[13px] mt-2" style={{ color: "var(--gray)" }}>No matching questions</p>
          <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد نتائج مطابقة</p>
        </div>
      )}

      {filteredSections.map((s, si) => (
        <div key={si} className="rounded-2xl overflow-hidden" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--gray-light)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{s.title}</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{s.ar}</p>
          </div>
          {s.questions.map((q, qi) => {
            const key = `${si}-${qi}`;
            const isOpen = openQ === key;
            return (
              <div key={qi}>
                <button onClick={() => setOpenQ(isOpen ? null : key)} className="w-full px-4 py-3 text-left btn-press flex items-center gap-2" style={{ borderBottom: "1px solid var(--gray-light)" }}>
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{highlightText(q.q)}</p>
                    <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{highlightText(q.qar, true)}</p>
                  </div>
                  <ChevronDown size={16} style={{ color: "var(--gray)", transition: "transform 200ms ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
                </button>
                {isOpen && (
                  <div className="px-4 py-3" style={{ background: "var(--off-white)" }}>
                    <p className="text-[12px]" style={{ color: "var(--navy)" }}>{highlightText(q.a)}</p>
                    <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>{highlightText(q.aar, true)}</p>
                    {(q as any).emergency && (
                      <a href="tel:112" className="mt-2 w-full py-2.5 rounded-xl text-[13px] font-bold text-white text-center block btn-press" style={{ background: "var(--error)" }}>
                        🚨 CALL EMERGENCY<span className="font-arabic" dir="rtl"> · اتصل بالطوارئ</span>

                      </a>
                    )}
                    {(q as any).mental && (
                      <button className="mt-2 w-full py-2.5 rounded-xl text-[13px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>
                        💬 Talk to RufayQ<span className="font-arabic" dir="rtl"> · تحدث مع رُفَيِّق</span>

                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <button className="w-full py-3 rounded-2xl text-[14px] font-bold text-white btn-press" style={{ background: "var(--gold)" }}>
        💬 Ask RufayQ<span className="font-arabic" dir="rtl"> · اسأل رُفَيِّق</span>

      </button>
    </div>
  );
};

/* ─── NUTRITION ─── */
const NutritionTab = () => {
  const [waterCount, setWaterCount] = useState(5);

  const nutrients = [
    { name: "Protein", ar: "بروتين", why: "Essential for tissue repair", goal: "60g/day", gradient: "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))",
      foods: ["Chicken breast", "Greek yogurt", "Lentils", "Eggs"] },
    { name: "Vitamin C", ar: "فيتامين سي", why: "Boosts wound healing", goal: "200mg/day", gradient: "linear-gradient(135deg, #C5965A, #A07A3A)",
      foods: ["Oranges", "Bell peppers", "Broccoli", "Kiwi"] },
    { name: "Omega-3", ar: "أوميغا ٣", why: "Reduces inflammation", goal: "2g/day", gradient: "linear-gradient(135deg, var(--header-dark-to), var(--header-dark-from))",
      foods: ["Salmon", "Walnuts", "Flax seeds", "Sardines"] },
  ];

  const meals = [
    { time: "Breakfast", ar: "فطور", emoji: "🍳", items: "Eggs, whole wheat toast, avocado, orange juice", tags: ["High protein", "Vitamin C"] },
    { time: "Lunch", ar: "غداء", emoji: "🥗", items: "Grilled chicken salad, quinoa, mixed vegetables", tags: ["High protein", "Iron"] },
    { time: "Dinner", ar: "عشاء", emoji: "🍛", items: "Baked salmon, brown rice, steamed broccoli", tags: ["Omega-3", "Vitamin C"] },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Water Tracker */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>WATER INTAKE</p>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{waterCount}/8 glasses</p>
          <p className="font-mono text-[10px]" style={{ color: "var(--teal-deep)" }}>{(waterCount * 0.25).toFixed(2)}L / 2L</p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <button key={i} onClick={() => setWaterCount(i + 1)} className="text-[20px] btn-press" style={{ opacity: i < waterCount ? 1 : 0.25 }}>
              💧
            </button>
          ))}
        </div>
      </div>

      {/* Nutrients */}
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {nutrients.map((n, i) => (
          <div key={i} className="shrink-0 w-[200px] rounded-2xl p-4 text-white" style={{ background: n.gradient }}>
            <p className="text-[15px] font-bold">{n.name}</p>
            <p className="font-arabic text-[11px]" style={{ opacity: 0.6 }}>{n.ar}</p>
            <p className="text-[10px] mt-1" style={{ opacity: 0.7 }}>{n.why}</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(197,150,90,0.3)", color: "#F0D9BB" }}>{n.goal}</span>
            <div className="mt-2 space-y-0.5">
              {n.foods.map((f, fi) => <p key={fi} className="text-[10px]" style={{ opacity: 0.8 }}>• {f}</p>)}
            </div>
          </div>
        ))}
      </div>

      {/* Foods to Avoid */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.15)" }}>
        <p className="text-[12px] font-bold" style={{ color: "var(--error)" }}>⚠️ Foods to Avoid<span className="font-arabic" dir="rtl"> · أطعمة يجب تجنبها</span></p>
        <div className="mt-2 space-y-1">
          {["Alcohol — slows healing", "Excessive sugar — increases inflammation", "Processed foods — low nutrient value", "Caffeine excess — dehydration risk"].map((f, i) => (
            <p key={i} className="text-[11px]" style={{ color: "var(--navy)" }}>• {f}</p>
          ))}
        </div>
      </div>

      {/* Meals */}
      <p className="font-mono text-[9px] tracking-widest px-1" style={{ color: "var(--gold)" }}>SUGGESTED MEALS</p>
      {meals.map((m, i) => (
        <div key={i} className="rounded-xl p-3" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[18px]">{m.emoji}</span>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>{m.time}</p>
            <p className="font-arabic text-[10px]" style={{ color: "var(--gray)" }}>{m.ar}</p>
          </div>
          <p className="text-[11px]" style={{ color: "var(--gray)" }}>{m.items}</p>
          <div className="flex gap-1.5 mt-1.5">
            {m.tags.map((t, ti) => (
              <span key={ti} className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── EXERCISES ─── */
const ExercisesTab = () => {
  const authUserId = useAuthUserId();
  const [doneExercises, setDoneExercises] = useState<number[]>([]);
  const [expandedEx, setExpandedEx] = useState<number | null>(null);

  const exercises = [
    { name: "Ankle Pumps", ar: "تحريك الكاحل", difficulty: "Easy", duration: "5 min", reps: "10 reps × 3 sets",
      steps: ["Lie flat on your back", "Point toes forward, hold 3s", "Pull toes toward you, hold 3s", "Repeat 10 times"],
      stepsAr: ["استلقِ على ظهرك", "وجّه أصابع القدم للأمام، ثبّت ٣ ثوان", "اسحب الأصابع نحوك، ثبّت ٣ ثوان", "كرر ١٠ مرات"] },
    { name: "Quad Sets", ar: "تمارين العضلة الرباعية", difficulty: "Easy", duration: "5 min", reps: "10 reps × 3 sets",
      steps: ["Sit with legs extended", "Tighten thigh muscle", "Press knee down, hold 5s", "Relax and repeat"],
      stepsAr: ["اجلس مع فرد الرجلين", "شدّ عضلة الفخذ", "اضغط الركبة لأسفل ٥ ثوان", "استرخِ وكرر"] },
    { name: "Heel Slides", ar: "تمرير الكعب", difficulty: "Medium", duration: "8 min", reps: "10 reps × 2 sets",
      steps: ["Lie on back, legs straight", "Slowly bend knee sliding heel", "Hold at comfortable bend 3s", "Slide back slowly"],
      stepsAr: ["استلقِ على ظهرك والرجلان ممدودتان", "اثنِ الركبة ببطء", "ثبّت ٣ ثوان", "أعد الرجل ببطء"] },
    { name: "Seated Knee Extension", ar: "مد الركبة جالساً", difficulty: "Medium", duration: "8 min", reps: "8 reps × 3 sets",
      steps: ["Sit in chair, feet flat", "Slowly straighten knee", "Hold straight for 5s", "Lower slowly with control"],
      stepsAr: ["اجلس على كرسي", "افرد الركبة ببطء", "ثبّت ٥ ثوان", "أنزل ببطء"] },
    { name: "Standing Balance", ar: "توازن الوقوف", difficulty: "Hard", duration: "10 min", reps: "30s × 4 sets",
      steps: ["Stand holding chair back", "Shift weight to surgical leg", "Try releasing hand briefly", "Hold 30 seconds"],
      stepsAr: ["قف ممسكاً بظهر الكرسي", "انقل الوزن للرجل المعالجة", "حاول رفع اليد لحظات", "ثبّت ٣٠ ثانية"] },
  ];

  const weekDays = [
    { short: "أحد", done: true }, { short: "اثن", done: true }, { short: "ثلا", done: true },
    { short: "أربع", done: false }, { short: "خمي", done: false }, { short: "جمع", done: false }, { short: "سبت", done: false },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Disclaimer */}
      <div className="rounded-xl px-4 py-3" style={{ background: "var(--gold-pale)", border: "1px solid rgba(197,150,90,0.3)" }}>
        <p className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>⚠️ Only do exercises approved by your physiotherapist</p>
        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>قم فقط بالتمارين الموصى بها من أخصائي العلاج الطبيعي</p>
      </div>

      {/* Phase badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-3 py-1 rounded-full font-bold" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
          Phase 1 of 3 — Gentle Mobility
        </span>
        <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>Week 1-2</span>
      </div>

      {/* Exercises */}
      {exercises.map((ex, i) => {
        const isDone = doneExercises.includes(i);
        const isExpanded = expandedEx === i;
        const diffColor = ex.difficulty === "Easy" ? "var(--success)" : ex.difficulty === "Medium" ? "var(--warning)" : "var(--error)";

        return (
          <div key={i} className="rounded-2xl overflow-hidden" style={{
            background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            borderLeft: isDone ? "4px solid var(--success)" : "4px solid transparent",
          }}>
            <button onClick={() => setExpandedEx(isExpanded ? null : i)} className="w-full p-4 text-left btn-press">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${diffColor}20`, color: diffColor }}>{ex.difficulty}</span>
                <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{ex.duration}</span>
              </div>
              <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>{ex.name}</p>
              <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{ex.ar}</p>
              <p className="font-mono text-[10px] mt-1" style={{ color: "var(--gold)" }}>{ex.reps}</p>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4">
                <div className="space-y-1.5 mb-3">
                  {ex.steps.map((s, si) => (
                    <div key={si}>
                      <p className="text-[11px]" style={{ color: "var(--navy)" }}>{si + 1}. {s}</p>
                      <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{ex.stepsAr[si]}</p>
                    </div>
                  ))}
                </div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  setDoneExercises(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
                }} className="w-full py-2.5 rounded-xl text-[13px] font-bold btn-press"
                  style={{
                    background: isDone ? "rgba(61,170,110,0.1)" : "var(--teal-deep)",
                    color: isDone ? "var(--success)" : "#fff",
                  }}>
                  {isDone ? "✓ Done · تم" : "Mark as Done · تم"}
                </button>
                <StepDetailsPanel
                  stepRef={`carehub:exercise:${slugify(ex.name)}`}
                  timelineKind="carehub"
                  userId={authUserId}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Weekly dots */}
      <div className="rounded-2xl p-4" style={{ background: "var(--white)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--gold)" }}>THIS WEEK</p>
        <div className="flex justify-between">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px]"
                style={{ background: d.done ? "var(--teal-deep)" : "var(--gray-light)", color: d.done ? "#fff" : "var(--gray)" }}>
                {d.done ? "✓" : ""}
              </div>
              <span className="font-arabic text-[8px]" style={{ color: "var(--gray)" }}>{d.short}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CareHubScreen;