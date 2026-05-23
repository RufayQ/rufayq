/**
 * connectionsStore — local-first directory of people the user has connected
 * with via QR (family, providers, friends). Pure frontend (localStorage)
 * until a backend table is wired.
 *
 * Each connection is classified at add-time so other parts of the app
 * (chat suggestions, emergency contacts, provider access prompts) can
 * filter by relationship.
 */

export type ConnectionCategory = "family" | "provider" | "friend";
export type ProviderKind = "doctor" | "hospital" | "clinic" | "pharmacy" | "other";
export type FamilyRelation =
  | "spouse" | "parent" | "child" | "sibling" | "relative" | "other";

export interface QrPayload {
  /** Schema tag so we can evolve later. */
  v: 1;
  /** App identifier. */
  app: "rufayq";
  /** Stable user handle (device id or auth uid). */
  handle: string;
  /** Display name (EN). */
  name: string;
  /** Display name (AR), optional. */
  nameAr?: string;
  /** Optional contact details the user opts to share. */
  phone?: string;
  email?: string;
  /** Issued-at (ms epoch) so the QR can be rotated/expired client-side. */
  iat: number;
}

export interface Connection {
  id: string;
  handle: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  category: ConnectionCategory;
  /** For category === "provider". */
  providerKind?: ProviderKind;
  /** For category === "family". */
  familyRelation?: FamilyRelation;
  /** Free-text label (e.g. "Best friend", "Cardiologist – Dr. Asma"). */
  note?: string;
  addedAt: number;
}

const KEY = "rufayq_connections_v1";

export const CATEGORY_META: Record<ConnectionCategory, { en: string; ar: string; emoji: string; tone: string }> = {
  family:   { en: "Family",   ar: "العائلة",        emoji: "👨‍👩‍👧", tone: "#C5965A" },
  provider: { en: "Provider", ar: "مزوّد رعاية",    emoji: "🩺",      tone: "#0F7C8A" },
  friend:   { en: "Friend",   ar: "صديق",           emoji: "🤝",      tone: "#7A5BCE" },
};

export const PROVIDER_KIND_META: Record<ProviderKind, { en: string; ar: string }> = {
  doctor:   { en: "Doctor",   ar: "طبيب" },
  hospital: { en: "Hospital", ar: "مستشفى" },
  clinic:   { en: "Clinic",   ar: "عيادة" },
  pharmacy: { en: "Pharmacy", ar: "صيدلية" },
  other:    { en: "Other",    ar: "أخرى" },
};

export const FAMILY_RELATION_META: Record<FamilyRelation, { en: string; ar: string }> = {
  spouse:   { en: "Spouse",  ar: "الزوج/الزوجة" },
  parent:   { en: "Parent",  ar: "الوالد/الوالدة" },
  child:    { en: "Child",   ar: "ابن/ابنة" },
  sibling:  { en: "Sibling", ar: "أخ/أخت" },
  relative: { en: "Relative", ar: "قريب" },
  other:    { en: "Other",   ar: "أخرى" },
};

export const loadConnections = (): Connection[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Connection[]) : [];
  } catch { return []; }
};

const saveAll = (list: Connection[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  try { window.dispatchEvent(new CustomEvent("rufayq:connections-changed")); } catch {}
};

export const addConnection = (c: Omit<Connection, "id" | "addedAt">): Connection => {
  const list = loadConnections();
  // Dedupe by handle: if already present, merge & overwrite classification.
  const existing = list.find((x) => x.handle === c.handle);
  const next: Connection = existing
    ? { ...existing, ...c, id: existing.id, addedAt: existing.addedAt }
    : { ...c, id: crypto.randomUUID(), addedAt: Date.now() };
  const others = list.filter((x) => x.handle !== c.handle);
  saveAll([next, ...others]);
  return next;
};

export const removeConnection = (id: string) => {
  saveAll(loadConnections().filter((c) => c.id !== id));
};

export const encodeQrPayload = (p: QrPayload): string => {
  // Prefix lets us recognize our codes when scanning third-party QRs.
  return `rufayq://connect?d=${encodeURIComponent(btoa(JSON.stringify(p)))}`;
};

export const decodeQrPayload = (raw: string): QrPayload | null => {
  try {
    let token = raw.trim();
    if (token.startsWith("rufayq://connect")) {
      const url = new URL(token);
      token = url.searchParams.get("d") || "";
      if (!token) return null;
      const json = atob(decodeURIComponent(token));
      const parsed = JSON.parse(json) as QrPayload;
      if (parsed?.app !== "rufayq") return null;
      return parsed;
    }
    // Fallback: raw JSON
    const parsed = JSON.parse(token) as QrPayload;
    if (parsed?.app !== "rufayq") return null;
    return parsed;
  } catch { return null; }
};
