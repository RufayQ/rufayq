/**
 * linkRecordToMilestone — single canonical implementation used by both
 * RelatedDocumentsCard ("Attach from Records") and the Records screen
 * ("Apply to milestone"). Guarantees identical behaviour everywhere and
 * avoids duplicating storage artefacts on retries.
 */
import { supabase } from "@/integrations/supabase/client";
import { milestoneKeyFor, type MilestoneKeyInput } from "./milestoneKey";
import {
  TRANSPORT_BUCKET,
  importScanToBucket,
  type UnifiedRecord,
} from "./recordSources";
import { withDeviceHeader } from "@/lib/supabaseDeviceScope";

export interface LinkContext {
  userId?: string | null;
  deviceId: string;
  sourceDocumentId?: string | null;
}

export const linkRecordToMilestone = async (
  rec: UnifiedRecord,
  milestone: MilestoneKeyInput,
  ctx: LinkContext,
): Promise<void> => {
  if (!rec.linkableToMilestone) {
    throw new Error("This record cannot be linked to a milestone");
  }
  const { segmentRef, ticketId } = milestoneKeyFor(milestone);

  let filePath: string | undefined = rec.filePath;
  let fileName = rec.fileName;
  let mimeType: string | null = rec.mimeType;
  let sizeBytes: number | null = null;
  let label = rec.label;
  let keyFields: { label: string; value: string }[] | null = null;

  if (rec.origin === "travel-scan" || rec.origin === "medical-scan") {
    const imported = await importScanToBucket(rec, { userId: ctx.userId ?? null, deviceId: ctx.deviceId });
    filePath = imported.filePath;
    fileName = imported.fileName;
    mimeType = imported.mimeType;
    sizeBytes = imported.sizeBytes;
    keyFields = rec.travelScan?.keyFields ?? null;
  } else if (rec.origin === "transport") {
    keyFields = (rec.transport?.keyFields ?? null) as { label: string; value: string }[] | null;
  }

  if (!filePath) throw new Error("Record has no file to link");

  // Idempotency: skip if an identical link already exists for this milestone.
  const { data: existing } = await withDeviceHeader(supabase
    .from("transport_attachments")
    .select("id")
    .eq("device_id", ctx.deviceId)
    .eq("segment_ref", segmentRef)
    .eq("file_path", filePath)
    .is("deleted_at", null)
    .limit(1), ctx.deviceId);
  if (existing && existing.length > 0) return;

  const { error } = await withDeviceHeader(supabase.from("transport_attachments").insert({
    device_id: ctx.deviceId,
    user_id: ctx.userId ?? null,
    ticket_id: ticketId,
    source_document_id: ctx.sourceDocumentId ?? null,
    segment_ref: segmentRef,
    label,
    file_name: fileName,
    file_path: filePath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    key_fields: keyFields && keyFields.length ? (keyFields as unknown as never) : null,
  } as never), ctx.deviceId);
  if (error) throw error;
  // Silence unused-var (TRANSPORT_BUCKET) — kept as a stable re-export for callers.
  void TRANSPORT_BUCKET;
};
