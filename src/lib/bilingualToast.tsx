import { toast as sonnerToast, type ExternalToast } from "sonner";

/**
 * Bilingual toast helper.
 * Renders the English line in LTR (left-aligned) and the Arabic line in RTL
 * (right-aligned, Noto Naskh Arabic) so bidi mixing never breaks alignment.
 */
type Kind = "success" | "error" | "info" | "warning" | "default";

export interface BilingualToastInput {
  en: string;
  ar: string;
  kind?: Kind;
  duration?: number;
  id?: string | number;
}

const Body = ({ en, ar }: { en: string; ar: string }) => (
  <div className="flex w-full flex-col gap-0.5">
    <span dir="ltr" className="block text-left text-[13px] font-semibold leading-snug">
      {en}
    </span>
    <span
      dir="rtl"
      lang="ar"
      className="font-arabic block text-right text-[12px] leading-snug opacity-90"
    >
      {ar}
    </span>
  </div>
);

export function notify({ en, ar, kind = "default", duration = 2200, id }: BilingualToastInput) {
  const opts: ExternalToast = {
    duration,
    id,
    // Force the toast container to behave as a block so left/right alignment
    // of the two language rows works regardless of the active document dir.
    className: "rufayq-bilingual-toast",
    unstyled: false,
  };
  const node = <Body en={en} ar={ar} />;
  switch (kind) {
    case "success": return sonnerToast.success(node, opts);
    case "error":   return sonnerToast.error(node, opts);
    case "warning": return sonnerToast.warning(node, opts);
    case "info":    return sonnerToast.info(node, opts);
    default:        return sonnerToast(node, opts);
  }
}

// Re-export raw toast for places that don't need bilingual layout.
export { sonnerToast as toast };
