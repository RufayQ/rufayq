/**
 * Shared mapping between a JourneyMilestone and the `transport_attachments`
 * row predicates used by RelatedDocumentsCard. Centralised so Journey,
 * Records, and the chat handoff all derive the same key.
 */
export interface MilestoneKeyInput {
  id: string;
  refId: string;
  kind: string; // "departure" | "return" | "appointment" | "treatment" | "followup"
}

export interface MilestoneKey {
  segmentRef: string;
  ticketId: string | null;
}

export const milestoneKeyFor = (m: MilestoneKeyInput): MilestoneKey => {
  if (m.kind === "departure" || m.kind === "return") {
    return { segmentRef: `flight-${m.refId}`, ticketId: m.refId };
  }
  return { segmentRef: `milestone-${m.id}`, ticketId: null };
};
