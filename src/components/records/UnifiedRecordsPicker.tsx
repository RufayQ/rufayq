/**
 * UnifiedRecordsPicker — single source of truth for "Attach from My Records"
 * across Chat AND Journey milestones. Both surfaces read the SAME unified
 * `listAllUserRecords()` reader, which merges transport_attachments + local
 * travel/medical scans + lounge cards.
 *
 * This file is a neutral alias around the underlying ChatRecordsPicker
 * implementation so call sites outside chat (e.g. Journey milestone
 * RelatedDocumentsCard) don't import a "chat"-named symbol. Behaviour,
 * data source, and props are identical.
 */
export { default, type PickedRecord } from "@/components/chat/ChatRecordsPicker";
