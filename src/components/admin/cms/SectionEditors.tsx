/**
 * SectionEditors — typed editors for the Core 7 block types.
 *
 * Each editor receives the current `content` blob for one locale and emits
 * patches via `onChange`. The parent (PageEditor) handles persistence.
 *
 * Other section types fall back to <JsonEditor /> for Phase 1.
 */
import { Plus, Trash2, Mail, Phone, MessageCircle, MapPin, Clock, Map as MapIcon } from "lucide-react";
import type {
  CtaConfig, FeaturesContent, HeroContent, HowContent,
  CtaSectionContent, FaqContent, PricingContent, RichTextContent, SectionType, ContactContent,
} from "./cmsTypes";

type AnyContent = Record<string, unknown>;

const inputCls =
  "w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400";
const labelCls = "block text-xs uppercase tracking-wide text-slate-400 mb-1";
const sectionCls = "rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3";
const subBtn = "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-700 text-slate-200 hover:border-amber-400";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className={labelCls}>{label}</span>
    {children}
  </label>
);

const CtaEditor = ({ value, onChange, label }: { value?: CtaConfig; onChange: (v: CtaConfig) => void; label: string }) => (
  <div className={sectionCls}>
    <div className="text-[11px] font-semibold text-amber-300">{label}</div>
    <div className="grid grid-cols-2 gap-2">
      <Field label="Label">
        <input className={inputCls} value={value?.label ?? ""} onChange={(e) => onChange({ ...(value ?? { label: "", link: "/" }), label: e.target.value })} />
      </Field>
      <Field label="Link">
        <input className={inputCls} value={value?.link ?? ""} onChange={(e) => onChange({ ...(value ?? { label: "", link: "/" }), link: e.target.value })} />
      </Field>
    </div>
  </div>
);

// ============== HERO ==============
export const HeroEditor = ({ content, onChange }: { content: HeroContent; onChange: (v: HeroContent) => void }) => {
  const badges = content.badges ?? [];
  const updateBadge = (i: number, patch: Partial<{ text: string; icon: string }>) => {
    const next = [...badges];
    next[i] = { ...next[i], ...patch };
    onChange({ ...content, badges: next });
  };
  return (
    <div className="space-y-3">
      <Field label="Eyebrow"><input className={inputCls} value={content.eyebrow ?? ""} onChange={(e) => onChange({ ...content, eyebrow: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Title line 1"><input className={inputCls} value={content.titleLine1 ?? ""} onChange={(e) => onChange({ ...content, titleLine1: e.target.value })} /></Field>
        <Field label="Title line 2"><input className={inputCls} value={content.titleLine2 ?? ""} onChange={(e) => onChange({ ...content, titleLine2: e.target.value })} /></Field>
      </div>
      <Field label="Highlighted phrase (gold)"><input className={inputCls} value={content.highlight ?? ""} onChange={(e) => onChange({ ...content, highlight: e.target.value })} /></Field>
      <Field label="Subtitle"><textarea rows={3} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
      <CtaEditor label="Primary CTA" value={content.primaryCta} onChange={(v) => onChange({ ...content, primaryCta: v })} />
      <CtaEditor label="Secondary CTA" value={content.secondaryCta} onChange={(v) => onChange({ ...content, secondaryCta: v })} />
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-amber-300">Trust badges</div>
          <button type="button" className={subBtn} onClick={() => onChange({ ...content, badges: [...badges, { text: "" }] })}><Plus size={12} /> Add badge</button>
        </div>
        {badges.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
            <Field label="Text"><input className={inputCls} value={b.text} onChange={(e) => updateBadge(i, { text: e.target.value })} /></Field>
            <Field label="Icon"><input className={inputCls} value={b.icon ?? ""} placeholder="shield, lock, globe" onChange={(e) => updateBadge(i, { icon: e.target.value })} /></Field>
            <button type="button" className="p-2 rounded-md border border-slate-700 text-rose-400 hover:border-rose-500" onClick={() => onChange({ ...content, badges: badges.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== FEATURES ==============
export const FeaturesEditor = ({ content, onChange }: { content: FeaturesContent; onChange: (v: FeaturesContent) => void }) => {
  const cards = content.cards ?? [];
  const update = (i: number, patch: Partial<FeaturesContent["cards"] extends (infer U)[] | undefined ? U : never>) => {
    const next = [...cards]; next[i] = { ...next[i], ...patch };
    onChange({ ...content, cards: next });
  };
  return (
    <div className="space-y-3">
      <Field label="Section title"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
      <Field label="Subtitle"><textarea rows={2} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-amber-300">Feature cards ({cards.length})</div>
          <button type="button" className={subBtn} onClick={() => onChange({ ...content, cards: [...cards, { title: "", desc: "" }] })}><Plus size={12} /> Add card</button>
        </div>
        {cards.map((c, i) => (
          <div key={i} className="rounded border border-slate-800 p-3 space-y-2">
            <div className="grid grid-cols-[100px_1fr_auto] gap-2">
              <Field label="Icon"><input className={inputCls} value={c.icon ?? ""} onChange={(e) => update(i, { icon: e.target.value })} /></Field>
              <Field label="Title"><input className={inputCls} value={c.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
              <button type="button" className="self-end p-2 rounded-md border border-slate-700 text-rose-400 hover:border-rose-500" onClick={() => onChange({ ...content, cards: cards.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
            <Field label="Description"><textarea rows={2} className={inputCls} value={c.desc ?? ""} onChange={(e) => update(i, { desc: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CTA label (optional)"><input className={inputCls} value={c.ctaLabel ?? ""} onChange={(e) => update(i, { ctaLabel: e.target.value })} /></Field>
              <Field label="CTA link (optional)"><input className={inputCls} value={c.ctaLink ?? ""} onChange={(e) => update(i, { ctaLink: e.target.value })} /></Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== HOW ==============
export const HowEditor = ({ content, onChange }: { content: HowContent; onChange: (v: HowContent) => void }) => {
  const steps = content.steps ?? [];
  const update = (i: number, patch: Partial<{ icon: string; title: string; desc: string }>) => {
    const next = [...steps]; next[i] = { ...next[i], ...patch };
    onChange({ ...content, steps: next });
  };
  return (
    <div className="space-y-3">
      <Field label="Section title"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
      <Field label="Subtitle"><textarea rows={2} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-amber-300">Steps ({steps.length})</div>
          <button type="button" className={subBtn} onClick={() => onChange({ ...content, steps: [...steps, { title: "", desc: "" }] })}><Plus size={12} /> Add step</button>
        </div>
        {steps.map((s, i) => (
          <div key={i} className="rounded border border-slate-800 p-3 space-y-2">
            <div className="grid grid-cols-[80px_1fr_auto] gap-2">
              <Field label="#"><div className="text-slate-300 text-sm pt-2">{i + 1}</div></Field>
              <Field label="Title"><input className={inputCls} value={s.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
              <button type="button" className="self-end p-2 rounded-md border border-slate-700 text-rose-400 hover:border-rose-500" onClick={() => onChange({ ...content, steps: steps.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
            <Field label="Description"><textarea rows={2} className={inputCls} value={s.desc ?? ""} onChange={(e) => update(i, { desc: e.target.value })} /></Field>
            <Field label="Icon"><input className={inputCls} value={s.icon ?? ""} onChange={(e) => update(i, { icon: e.target.value })} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== CTA ==============
export const CtaEditorBlock = ({ content, onChange }: { content: CtaSectionContent; onChange: (v: CtaSectionContent) => void }) => (
  <div className="space-y-3">
    <Field label="Title"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
    <Field label="Subtitle"><textarea rows={2} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
    <CtaEditor label="Primary CTA" value={content.primaryCta} onChange={(v) => onChange({ ...content, primaryCta: v })} />
    <CtaEditor label="Secondary CTA" value={content.secondaryCta} onChange={(v) => onChange({ ...content, secondaryCta: v })} />
  </div>
);

// ============== FAQ ==============
export const FaqEditor = ({ content, onChange }: { content: FaqContent; onChange: (v: FaqContent) => void }) => {
  const items = content.items ?? [];
  const update = (i: number, patch: Partial<{ q: string; a: string }>) => {
    const next = [...items]; next[i] = { ...next[i], ...patch };
    onChange({ ...content, items: next });
  };
  return (
    <div className="space-y-3">
      <Field label="Section title"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
      <Field label="Subtitle"><textarea rows={2} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-amber-300">FAQ items ({items.length})</div>
          <button type="button" className={subBtn} onClick={() => onChange({ ...content, items: [...items, { q: "", a: "" }] })}><Plus size={12} /> Add Q&A</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="rounded border border-slate-800 p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-400">Q{i + 1}</span>
              <button type="button" className="text-rose-400 hover:text-rose-300" onClick={() => onChange({ ...content, items: items.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
            <Field label="Question"><input className={inputCls} value={it.q} onChange={(e) => update(i, { q: e.target.value })} /></Field>
            <Field label="Answer"><textarea rows={3} className={inputCls} value={it.a} onChange={(e) => update(i, { a: e.target.value })} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============== PRICING (header copy only in Phase 1) ==============
export const PricingEditor = ({ content, onChange }: { content: PricingContent; onChange: (v: PricingContent) => void }) => (
  <div className="space-y-3">
    <Field label="Title"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
    <Field label="Subtitle"><textarea rows={2} className={inputCls} value={content.subtitle ?? ""} onChange={(e) => onChange({ ...content, subtitle: e.target.value })} /></Field>
    <p className="text-[11px] text-slate-500 italic">Plan tiers (Free/Starter/Companion/Family) and prices are managed in <code>subscriptionPlans.ts</code> for Phase 1. Phase 2 adds inline plan editing.</p>
  </div>
);

// ============== RICH TEXT ==============
export const RichTextEditor = ({ content, onChange }: { content: RichTextContent; onChange: (v: RichTextContent) => void }) => (
  <div className="space-y-3">
    <Field label="Title (optional)"><input className={inputCls} value={content.title ?? ""} onChange={(e) => onChange({ ...content, title: e.target.value })} /></Field>
    <Field label="Body (markdown)"><textarea rows={8} className={inputCls + " font-mono"} value={content.body ?? ""} onChange={(e) => onChange({ ...content, body: e.target.value })} /></Field>
  </div>
);

// ============== GENERIC JSON FALLBACK ==============
export const JsonEditor = ({ content, onChange }: { content: AnyContent; onChange: (v: AnyContent) => void }) => {
  const text = JSON.stringify(content, null, 2);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-amber-300/80">No rich editor for this block type yet — edit the JSON directly. Phase 2 will add a visual editor.</p>
      <textarea
        rows={12}
        className={inputCls + " font-mono"}
        defaultValue={text}
        onBlur={(e) => {
          try { onChange(JSON.parse(e.target.value || "{}")); }
          catch { /* keep last value if invalid */ }
        }}
      />
    </div>
  );
};

export const editorFor = (type: SectionType) => {
  switch (type) {
    case "hero": return HeroEditor;
    case "features": return FeaturesEditor;
    case "how": return HowEditor;
    case "cta": case "footer_cta": return CtaEditorBlock;
    case "faq": return FaqEditor;
    case "pricing": return PricingEditor;
    case "rich_text": return RichTextEditor;
    default: return JsonEditor;
  }
};
