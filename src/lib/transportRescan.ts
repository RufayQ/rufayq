<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
import { extractFlightTicket } from "@/lib/flightExtraction";
import { parsedLegToSegment, type FlightSegment, type TransportTicket } from "@/lib/transportTickets";
import { saveTicket, type TicketScope } from "@/lib/transportStore";
import { fetchScanImagesAsDataUrls, ScanStorageError } from "@/lib/transportScanStorage";
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

export type RescanErrorCode =
  | "manual"
  | "no-images"
  | "storage"
  | "extraction"
  | "save"
  | "unknown";

export class RescanError extends Error {
  constructor(
    message: string,
    public code: RescanErrorCode,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "RescanError";
  }
}

export async function rescanTicket(
  ticket: TransportTicket,
  scope: TicketScope,
): Promise<TransportTicket> {
  if (ticket.source === "manual") {
    throw new RescanError("Cannot re-scan a manually entered ticket", "manual");
  }
<<<<<<< ours
<<<<<<< ours
=======

>>>>>>> theirs
=======

>>>>>>> theirs
  const paths = ticket.sourceImagePaths || [];
  if (paths.length === 0) {
    throw new RescanError("No source images stored for this ticket", "no-images");
  }

  let files: string[];
  try {
    files = await fetchScanImagesAsDataUrls(paths);
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
  } catch (error) {
    if (error instanceof ScanStorageError) {
      throw new RescanError(error.message, "storage", error);
    }
    throw new RescanError("Failed to load stored scan images", "storage", error);
  }

  let extracted: Awaited<ReturnType<typeof extractFlightTicket>>;
  try {
    extracted = await extractFlightTicket({ files });
  } catch (error) {
    throw new RescanError(
      error instanceof Error ? error.message : "Extraction failed",
      "extraction",
      error,
    );
  }

  const outboundSegments: FlightSegment[] = extracted.rawOutbound.map((raw, i) =>
    parsedLegToSegment(raw, "outbound", i),
  );
  const returnSegments: FlightSegment[] = extracted.rawReturn.map((raw, i) =>
    parsedLegToSegment(raw, "return", i),
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
  );

  if (outboundSegments.length === 0 && returnSegments.length === 0) {
    throw new RescanError("Extraction returned no segments", "extraction");
  }

<<<<<<< ours
<<<<<<< ours
  const passengerName =
    [extracted.passengerFirstName, extracted.passengerLastName]
      .filter(Boolean)
      .join(" ")
      .trim() || ticket.passengerName;

  const updated: TransportTicket = {
    ...ticket,
    deviceId: ticket.deviceId || scope.deviceId,
    userId: ticket.userId ?? scope.userId ?? null,
=======
=======
>>>>>>> theirs
  const now = new Date().toISOString();
  const passengerName = [extracted.passengerFirstName, extracted.passengerLastName]
    .filter(Boolean)
    .join(" ")
    .trim() || ticket.passengerName;

  const updated: TransportTicket = {
    ...ticket,
    id: ticket.id,
    deviceId: ticket.deviceId || scope.deviceId,
    userId: ticket.userId ?? scope.userId ?? null,
    createdAt: ticket.createdAt,
    tripType: ticket.tripType,
    saveToTransportTimeline: ticket.saveToTransportTimeline,
    saveToMedicalRecords: ticket.saveToMedicalRecords,
    sendToDoctor: ticket.sendToDoctor,
    pendingSegmentRef: ticket.pendingSegmentRef ?? null,
    traveler: ticket.traveler,
    source: ticket.source ?? "ocr",
    sourceImagePaths: paths,
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    outboundSegments,
    returnSegments,
    passengerName: passengerName || undefined,
    passengerPassport: extracted.passportNumber || ticket.passengerPassport,
<<<<<<< ours
<<<<<<< ours
    bookingReference:
      outboundSegments[0]?.pnr || returnSegments[0]?.pnr || ticket.bookingReference,
=======
    bookingReference: outboundSegments[0]?.pnr || returnSegments[0]?.pnr || ticket.bookingReference,
>>>>>>> theirs
=======
    bookingReference: outboundSegments[0]?.pnr || returnSegments[0]?.pnr || ticket.bookingReference,
>>>>>>> theirs
    extraction: {
      provider: extracted.provider,
      confidence: extracted.confidence ?? null,
      detectedLanguage: extracted.detectedLanguage ?? null,
      translated: !!extracted.translated,
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
      runAt: now,
    },
    updatedAt: now,
  };

  try {
    return await saveTicket(updated);
  } catch (error) {
    throw new RescanError(
      error instanceof Error ? error.message : "Save failed",
      "save",
      error,
    );
  }
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
}
