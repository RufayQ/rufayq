import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import type { ChatMessageStatus } from "@/hooks/useChatThread";

interface Props {
  status: ChatMessageStatus | undefined;
  /** True if any OTHER participant's `last_read_at` >= this message's created_at. */
  seen: boolean;
  /** Color for non-seen ticks. Defaults to faded white for own bubbles. */
  color?: string;
  /** Color for the "seen" double tick (WhatsApp blue). */
  seenColor?: string;
}

/**
 * WhatsApp-style status indicator for outgoing chat messages.
 *  - sending: ⏱ clock
 *  - sent:    ✓ single tick
 *  - delivered/seen: ✓✓ double tick (blue when seen)
 *  - failed:  ! red alert
 */
export default function MessageTicks({ status, seen, color = "rgba(255,255,255,0.65)", seenColor = "#53bdeb" }: Props) {
  if (status === "failed") {
    return <AlertCircle size={12} color="#ff6b6b" strokeWidth={2.5} aria-label="Failed to send" />;
  }
  if (status === "sending") {
    return <Clock size={11} color={color} strokeWidth={2.5} aria-label="Sending" />;
  }
  if (seen) {
    return <CheckCheck size={13} color={seenColor} strokeWidth={2.75} aria-label="Seen" />;
  }
  // status === "sent" (single tick). We treat "sent" === "delivered" here
  // since we can't observe per-device receipt beyond participant read-state.
  return <Check size={12} color={color} strokeWidth={2.5} aria-label="Sent" />;
}
