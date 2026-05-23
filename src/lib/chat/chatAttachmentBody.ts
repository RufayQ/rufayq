/**
 * Encodes/decodes RufayQ attachment payloads embedded inside a chat message
 * body. Receivers detect the marker and render an "elite card" instead of a
 * raw blob URL link (which on iOS/Android opened the file outside the app).
 *
 * Format: `[[RUFAYQ_ATTACH:<base64-utf8-json>]]` on its own line. We base64
 * the JSON so newlines, quotes, and unicode never break Supabase realtime
 * delivery or the chat composer's whitespace-pre wrapping.
 */

export interface ChatAttachmentPayload {
  /** Records-side classification — drives the "Save to my records" routing. */
  kind: "travel" | "medical";
  /** Human label shown on the card (e.g. "Schengen Visa"). */
  label: string;
  /** Original file name (e.g. "ticket.pdf"). */
  fileName: string;
  /** Bilingual source labels used as a small caption on the card. */
  sourceLabelEn: string;
  sourceLabelAr: string;
  /** Preview / open URL (Supabase signed URL or remote https URL). */
  url?: string;
  /** MIME hint for picking the right icon + preview affordance. */
  mimeType?: string | null;
}

const MARKER_OPEN = "[[RUFAYQ_ATTACH:";
const MARKER_CLOSE = "]]";
const MARKER_RE = /\[\[RUFAYQ_ATTACH:([A-Za-z0-9+/=_-]+)\]\]/g;

const encodeBase64 = (raw: string): string => {
  try {
    if (typeof window === "undefined") {
      return Buffer.from(raw, "utf-8").toString("base64");
    }
    // btoa needs latin1 — round-trip via TextEncoder for safe unicode.
    const bytes = new TextEncoder().encode(raw);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary);
  } catch {
    return "";
  }
};

const decodeBase64 = (b64: string): string | null => {
  try {
    if (typeof window === "undefined") {
      return Buffer.from(b64, "base64").toString("utf-8");
    }
    const binary = window.atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

export const encodeChatAttachment = (payload: ChatAttachmentPayload): string => {
  const json = JSON.stringify(payload);
  return `${MARKER_OPEN}${encodeBase64(json)}${MARKER_CLOSE}`;
};

export type ChatBodySegment =
  | { type: "text"; value: string }
  | { type: "attachment"; payload: ChatAttachmentPayload };

export const parseChatBody = (body: string): ChatBodySegment[] => {
  if (!body) return [{ type: "text", value: "" }];
  const segments: ChatBodySegment[] = [];
  let cursor = 0;
  MARKER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKER_RE.exec(body)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, match.index) });
    }
    const decoded = decodeBase64(match[1]);
    let payload: ChatAttachmentPayload | null = null;
    if (decoded) {
      try {
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === "object" && parsed.label) payload = parsed;
      } catch { /* fall through to text */ }
    }
    if (payload) {
      segments.push({ type: "attachment", payload });
    } else {
      segments.push({ type: "text", value: match[0] });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) {
    segments.push({ type: "text", value: body.slice(cursor) });
  }
  // Drop pure-whitespace text fragments that sit between attachment lines so
  // the card stands alone visually.
  return segments.filter((s) => s.type !== "text" || s.value.replace(/^\s+|\s+$/g, "") !== "");
};

export const hasAttachment = (body: string): boolean => {
  MARKER_RE.lastIndex = 0;
  return MARKER_RE.test(body);
};

/**
 * Humanize a stored message body for inbox-style previews. Replaces the raw
 * `[[RUFAYQ_ATTACH:...]]` blob with a bilingual "shared attachment" label so
 * conversation rows never show base64 noise.
 */
export const humanizeChatPreview = (body: string | null | undefined): string => {
  if (!body) return "";
  const segs = parseChatBody(body);
  const parts = segs
    .map((s) => {
      if (s.type === "attachment") {
        const lbl = s.payload.label || s.payload.fileName || "attachment";
        return `📎 ${lbl} · مرفق مشترك`;
      }
      return s.value.trim();
    })
    .filter(Boolean);
  return parts.join(" · ");
};
