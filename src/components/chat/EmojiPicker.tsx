import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

/**
 * Lightweight WhatsApp-style emoji picker. No external deps — uses curated
 * categories tuned for a medical / travel companion app. Recent picks persist
 * to localStorage so frequently used emojis stay top-of-mind.
 */
const CATEGORIES: { key: string; label: string; emojis: string[] }[] = [
  {
    key: "smileys",
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😊","🙂","😉","😍","🥰","😘","😎","🤩","🤗","🤔","😴","😇","🥲","😢","😭","😅","🤣","😂","😏","😌","😔","😞","😟","😕","🙁","😣","😖","😩","🥺","😤","😡","🤯","😱","😨","😰","😥"],
  },
  {
    key: "gestures",
    label: "People",
    emojis: ["👍","👎","👏","🙌","🙏","👌","✌️","🤞","🤝","💪","🫶","👋","🤲","🫡","🫰","👀","👶","👩","👨","🧕","👳","👨‍⚕️","👩‍⚕️","🧑‍⚕️","🤰","🤱","👵","👴"],
  },
  {
    key: "health",
    label: "Health",
    emojis: ["❤️","💚","💙","💛","🧡","💜","🤍","🩷","💔","🩹","🩺","💊","💉","🧬","🦷","🧠","🫀","🫁","🦴","🩸","🌡️","🏥","🚑","🧘","🧴","🧼","🛏️","🪥"],
  },
  {
    key: "travel",
    label: "Travel",
    emojis: ["✈️","🛫","🛬","🛩️","🚖","🚕","🚗","🚙","🚌","🚆","🚄","🚇","🛳️","⛴️","🏨","🛂","🛃","🧳","🗺️","🧭","🌍","🌎","🌏","🕌","🕋","🏖️","🏝️","🌃"],
  },
  {
    key: "food",
    label: "Food",
    emojis: ["☕","🍵","🥤","🧃","🥛","🍽️","🍞","🥗","🍲","🍛","🍚","🥘","🍱","🥙","🍇","🍊","🍋","🍌","🍎","🍓","🥑","🍅","🍯","🌶️","🍰","🍫","🍪","🍩"],
  },
  {
    key: "symbols",
    label: "Symbols",
    emojis: ["✅","☑️","✔️","❌","⚠️","❗","❓","💯","🔔","🔕","📌","📍","📅","📆","⏰","⏳","🕒","💬","💭","🗨️","🔒","🔓","🔑","🆗","🆘","♻️","⭐","🌟","✨","🎉","🎊","🎁"],
  },
];

const RECENT_KEY = "rufayq_emoji_recent_v1";
const MAX_RECENT = 24;

const loadRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((e) => typeof e === "string").slice(0, MAX_RECENT) : [];
  } catch { return []; }
};

interface Props {
  onSelect: (emoji: string) => void;
  /** Render the toggle button using this color (matches composer icons). */
  iconColor?: string;
}

export default function EmojiPicker({ onSelect, iconColor = "var(--teal-deep)" }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent());
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].key);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const pick = (emoji: string) => {
    onSelect(emoji);
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const cat = CATEGORIES.find((c) => c.key === activeCat) ?? CATEGORIES[0];

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center btn-press"
        style={{ background: open ? "var(--off-white)" : "transparent", color: iconColor }}
        aria-label="Insert emoji"
      >
        <Smile size={20} />
      </button>

      {open && (
        <div
          className="absolute z-50 rounded-2xl overflow-hidden"
          style={{
            bottom: "calc(100% + 8px)",
            left: 0,
            width: 312,
            maxWidth: "calc(100vw - 24px)",
            background: "var(--white)",
            border: "1px solid var(--gray-light)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
          }}
        >
          {/* Recent strip */}
          {recent.length > 0 && (
            <div className="px-2 pt-2">
              <p className="text-[10px] uppercase tracking-wider opacity-50 px-1 mb-1">Recent</p>
              <div className="flex flex-wrap gap-0.5">
                {recent.slice(0, 12).map((e) => (
                  <button
                    key={`r-${e}`}
                    onClick={() => pick(e)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--off-white)] text-[20px] leading-none"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji grid */}
          <div className="px-2 py-2 max-h-[200px] overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider opacity-50 px-1 mb-1">{cat.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((e) => (
                <button
                  key={`${cat.key}-${e}`}
                  onClick={() => pick(e)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--off-white)] text-[20px] leading-none"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div
            className="flex items-center gap-0.5 px-1.5 py-1.5"
            style={{ background: "var(--off-white)", borderTop: "1px solid var(--gray-light)" }}
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className="flex-1 text-[16px] py-1 rounded-md"
                style={{
                  background: activeCat === c.key ? "var(--white)" : "transparent",
                  boxShadow: activeCat === c.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
                aria-label={c.label}
              >
                {c.emojis[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
