/**
 * Chat attachment gating — single source of truth for which attachment
 * sources are allowed per subscription tier.
 *
 * Sharing already-saved records is FREE for every tier (FREE, STARTER,
 * COMPANION, FAMILY). Uploading fresh files from the device camera/files
 * picker is a Companion+ perk.
 */

export type PlanCode = string | null | undefined;

const COMPANION_PLUS = new Set(["COMPANION", "FAMILY"]);

/** Normalize whatever the DB returned (legacy lowercase included) to uppercase. */
const normalize = (plan: PlanCode): string => (plan ?? "").toString().toUpperCase();

/** Device camera / file upload — gated to Companion+ tiers. */
export const canUploadDeviceFiles = (plan: PlanCode): boolean =>
  COMPANION_PLUS.has(normalize(plan));

/** Attaching from "My Records" — always free, every tier, including guests. */
export const canAttachFromRecords = (_plan: PlanCode): boolean => true;
