/**
 * E2E test — Scanner wizard PDF attach + post-reload rehydration.
 *
 * Verifies the bug fix where ScannerWizard pre-suffixed `blobKey` with `:file`
 * (so the wizard would write blob bytes into IndexedDB under `<id>:file`) and
 * stores then composed `<id>:file:file` lookups, leaving the preview empty
 * after refresh. The shared `blobKeyUtil.normalizeBlobBase` makes that
 * impossible by stripping any trailing slot suffix at the boundary.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: Object.assign((..._a: any[]) => {}, { success: vi.fn(), error: vi.fn() }),
}));

import {
  addTravelScannedRecord,
  listTravelScannedRecords,
} from "@/lib/travelScannedRecordsStore";
import { putRecordBlob, makeBlobKey, resolveRecordBlobUrl } from "@/lib/records/recordBlobDb";
import { normalizeBlobBase, slotKey } from "@/lib/records/blobKeyUtil";
import { dropCachedRecordBlob } from "@/lib/records/recordBlobCache";

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
const PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]); // "%PDF-1.4"

beforeEach(() => {
  localStorage.clear();
});

describe("ScannerWizard attachment ↔ Record viewer rehydration", () => {
  it("normalises pre-suffixed blob keys to a single base", () => {
    const recId = "00000000-aaaa-bbbb-cccc-111122223333";
    const preSuffixed = makeBlobKey(recId, "file"); // <id>:file (legacy wizard call)
    expect(slotKey(preSuffixed, "file")).toBe(`${recId}:file`);
    expect(slotKey(preSuffixed, "pdf")).toBe(`${recId}:pdf`);
    expect(normalizeBlobBase(`${recId}:file`)).toBe(recId);
    expect(normalizeBlobBase(`${recId}:pages`)).toBe(recId);
  });

  it("attaches the uploaded PDF to a travel record and rehydrates the preview after reload", async () => {
    // 1. Simulate ScannerWizard.finalizePayload: write the file blob under <id>:file.
    const recId = "11111111-2222-3333-4444-555566667777";
    const fileKey = makeBlobKey(recId, "file");
    const pdfBlob = new Blob([PDF_BYTES], { type: "application/pdf" });
    await putRecordBlob(fileKey, pdfBlob);

    // 2. Wizard hands the *suffixed* key to the store (the original bug source).
    const created = addTravelScannedRecord({
      category: "legal",
      subcategory: "Ticket",
      title: "Flight Ticket",
      fileName: "ticket.pdf",
      pageCount: 1,
      mimeType: "application/pdf",
      blobKey: fileKey, // <-- "<id>:file"
      fileBytes: pdfBlob.size,
    });
    expect(created.id).toBeTruthy();

    // 3. Simulate a hard reload: drop the in-memory object URL cache so the
    //    store has to come back to IndexedDB through resolveRecordBlobUrl.
    dropCachedRecordBlob(fileKey);

    // 4. Reading the record back must surface the file slot under the
    //    normalised key (not the buggy <id>:file:file path).
    const reloaded = listTravelScannedRecords().find((r) => r.id === created.id);
    expect(reloaded).toBeTruthy();
    const resolved = await resolveRecordBlobUrl(slotKey(reloaded?.blobKey, "file", reloaded?.id));
    expect(resolved).toBeTruthy();
  });

  it("rehydrates image-only travel records the same way", async () => {
    const recId = "aaaa1111-bbbb-2222-cccc-3333dddd4444";
    const fileKey = makeBlobKey(recId, "file");
    const imgBlob = new Blob([PNG_BYTES], { type: "image/png" });
    await putRecordBlob(fileKey, imgBlob);

    const created = addTravelScannedRecord({
      category: "hotel",
      subcategory: "Booking",
      title: "Hotel Confirmation",
      fileName: "booking.png",
      pageCount: 1,
      mimeType: "image/png",
      blobKey: fileKey,
      fileBytes: imgBlob.size,
    });

    dropCachedRecordBlob(fileKey);
    const reloaded = listTravelScannedRecords().find((r) => r.id === created.id);
    const resolved = await resolveRecordBlobUrl(slotKey(reloaded?.blobKey, "file", reloaded?.id));
    expect(resolved).toBeTruthy();
  });
});
