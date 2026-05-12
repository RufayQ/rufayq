/**
 * Re-run AI vision extraction on a previously-scanned ticket using the
 * source images stored in the `transport-scans` bucket.
 *
 * Preserves identity fields (id, deviceId, userId, createdAt, save flags,
 * traveler, pendingSegmentRef, sourceImagePaths) so the same DB row is
 * upserted; replaces parsed segments + passenger fields + extraction
 * metadata with fresh values.
 */
import { saveTicket, type TicketScope } from "@/lib/transportStore";
import {
  parsedLegToSegment,
  type TransportTicket,
  type FlightSegment,
} from "@/lib/transportTickets";
import { extractFlightTicket } from "@/lib/flightExtraction";
import {
  fetchScanImagesAsDataUrls,
  ScanStorageError,
} from "@/lib/transportScanStorage";

export class RescanError extends Error {
  constructor(message: string, public code:
    | "manual"
    | "no-images"
    | "storage"
    | "extraction"
    | "save"
    | "unknown",
    public cause?: unknown,
  ) {
    super(message);
  }
}

export async function rescanTicket(
  ticket: TransportTicket,
  scope: TicketScope,
): Promise<TransportTicket> {
  if (ticket.source === "manual") {
    throw new RescanError("Cannot re-scan a manually entered ticket", "manual");
  }
  const paths = ticket.sourceImagePaths || [];
  if (paths.length === 0) {
    throw new RescanError("No source images stored for this ticket", "no-images");
  }

  let files: string[];
  try {
    files = await fetchScanImagesAsDataUrls(paths);
  } catch (e) {
    if (e instanceof ScanStorageError) {
      throw new RescanError(e.message, "storage", e);
    }
    throw new RescanError("Failed to load source images", "storage", e);
  }

  let extracted;
  try {
    extracted = await extractFlightTicket({ files });
  } catch (e) {
    throw new RescanError(
      e instanceof Error ? e.message : "Extraction failed",
      "extraction",
      e,
    );
  }

  const outboundSegments: FlightSegment[] = extracted.rawOutbound.map(
    (raw, i) => parsedLegToSegment(raw, "outbound", i),
  );
  const returnSegments: FlightSegment[] = extracted.rawReturn.map(
    (raw, i) => parsedLegToSegment(raw, "return", i),
  );

  if (outboundSegments.length === 0 && returnSegments.length === 0) {
    throw new RescanError("Extraction returned no segments", "extraction");
  }

  const passengerName =
    [extracted.passengerFirstName, extracted.passengerLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || ticket.passengerName;

  const updated: TransportTicket = {
    ...ticket,
    deviceId: ticket.deviceId || scope.deviceId,
    userId: ticket.userId ?? scope.userId ?? null,
    outboundSegments,
    returnSegments,
    passengerName: passengerName || undefined,
    passengerPassport: extracted.passportNumber || ticket.passengerPassport,
    bookingReference:
      outboundSegments[0]?.pnr || returnSegments[0]?.pnr || ticket.bookingReference,
    extraction: {
      provider: extracted.provider,
      confidence: extracted.confidence ?? null,
      detectedLanguage: extracted.detectedLanguage ?? null,
      translated: !!extracted.translated,
      runAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveTicket(updated);
  } catch (e) {
    throw new RescanError(
      e instanceof Error ? e.message : "Save failed",
      "save",
      e,
    );
  }

  return updated;
}
