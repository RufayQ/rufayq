import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { lifestyleStore, subscribeLifestyle, type LifestylePlan, type LifestylePlanType } from "./lifestyleStore";
import LifestylePlanCard from "./LifestylePlanCard";
import AddLifestylePlanSheet from "./AddLifestylePlanSheet";
import { armAll } from "./lifestyleReminders";

interface Props {
  onChat?: (context: string) => void;
}

const TABS: { id: LifestylePlanType; emoji: string; en: string; ar: string }[] = [
  { id: "gym", emoji: "🏋️", en: "Gym", ar: "نادي" },
  { id: "nutrition", emoji: "🥗", en: "Nutrition", ar: "تغذية" },
  { id: "recreation", emoji: "🌿", en: "Recreation", ar: "ترفيه" },
  { id: "fitness", emoji: "🏃", en: "Fitness", ar: "لياقة" },
];

const LifestyleTabs = ({ onChat }: Props) => {
  const [active, setActive] = useState<LifestylePlanType>("gym");
  const [plans, setPlans] = useState<LifestylePlan[]>(() => lifestyleStore.list());
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    armAll(plans);
    const unsub = subscribeLifestyle(() => setPlans(lifestyleStore.list()));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = subscribeLifestyle(() => setPlans(lifestyleStore.list()));
    return unsub;
  }, []);

  const visible = plans.filter((p) => p.type === active);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sub-tabs */}
      <div
        className="shrink-0 overflow-x-auto px-4 py-2 flex gap-2"
        style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-light)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium btn-press whitespace-nowrap"
            style={{
              background: active === t.id ? "var(--teal-deep)" : "var(--white)",
              color: active === t.id ? "#fff" : "var(--gray)",
              border: active === t.id ? "none" : "1px solid var(--gray-light)",
            }}
          >
            {t.emoji} {t.en}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "var(--off-white)" }}>
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-3"
              style={{ background: "var(--teal-light)" }}
            >
              {TABS.find((t) => t.id === active)?.emoji}
            </div>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>
              No {active} plans yet
            </p>
            <p className="font-arabic text-[11px] mb-4" dir="rtl" style={{ color: "var(--gray)" }}>
              لا توجد خطط بعد
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold btn-press"
              style={{ background: "var(--teal-deep)", color: "#fff" }}
            >
              <Plus size={14} /> Add plan
            </button>
          </div>
        ) : (
          <>
            {visible.map((p) => (
              <LifestylePlanCard key={p.id} plan={p} onChat={onChat} />
            ))}
            <button
              onClick={() => setShowAdd(true)}
              className="w-full rounded-2xl py-3 text-[12px] font-semibold btn-press flex items-center justify-center gap-1.5"
              style={{
                background: "transparent",
                color: "var(--teal-deep)",
                border: "1.5px dashed var(--teal-deep)",
              }}
            >
              <Plus size={14} /> Add another plan
            </button>
          </>
        )}
      </div>

      <AddLifestylePlanSheet open={showAdd} defaultType={active} onClose={() => setShowAdd(false)} />
    </div>
  );
};

export default LifestyleTabs;
