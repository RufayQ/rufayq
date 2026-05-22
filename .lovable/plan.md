Plan to fix the Records scanner upload crash and add durable QC logging:  
  
Please **fix and harden the scanner upload implementation** with an API-first approach and production-safe behavior.

#### **Context / objective**

The previous implementation attempted to persist scanner files in IndexedDB and add QC telemetry, but the design and integration are incomplete.  
I need a clean, correct fix focused on:

1. stable scanner uploads (single / multi-page / multi-record),
2. durable preview rehydration after refresh,
3. sanitized QC telemetry with explicit API contract,
4. lightweight localStorage metadata only (no heavy payload persistence),
5. updated docs/OpenAPI that match the real behavior.

---

## **Requirements**

### **1) Effective API first (must be explicit and correct)**

Implement the telemetry/storage contract first, then wire UI/store code to it.

- Add/verify a dedicated scanner telemetry RPC (do **not** piggyback unrelated RPCs):
  - log_scanner_qc_event(...)
- Ensure it records sanitized scanner-stage events into existing QC tables:
  - stage events in qc_crash_events
  - terminal pass/fail run entries in qc_test_runs (for save_completed/save_failed)
- Sanitize data strictly:
  - allowed: scenario type, file counts/sizes, MIME families, storage mode, quota estimate, error name/message
  - forbidden: document content, OCR text, raw image/PDF bytes, full filenames, patient identifiers
- Keep telemetry non-blocking and failure-tolerant (never crash or delay upload flow).

### **2) Scanner file durability + memory stability**

- Persist selected files to IndexedDB as Blob entries immediately after selection/finalization.
- Persist only lightweight metadata in React/localStorage:
  - blob key, mimeType, file size, redacted/safe filename metadata policy
- Remove any base64 persistence path for large scanner payloads.
- Avoid retaining large page image arrays in localStorage.
- Reset hidden file input after each selection so selecting the same file retriggers flow.
- Revoke temporary object URLs where practical to reduce WebView memory leaks.

### **3) Store hardening + rehydration**

Update medical/travel scanned record stores to:

- store lightweight metadata + blobKey
- rehydrate missing preview URLs from IndexedDB on refresh/reopen
- handle fallback paths safely:
  - IndexedDB unavailable
  - quota failures
  - blob missing/corrupted
  - metadata-only fallback
- preserve existing list behavior without regressions.

### **4) Scanner flow telemetry stages (wire these)**

Emit stages:

- file_selected
- indexeddb_store_started
- indexeddb_store_completed
- review_opened
- save_started
- save_completed
- save_failed
- quota_fallback_used

For each event include:

- scenario: single | multi-page | multi-record
- fileCount, totalBytes, largestFileBytes
- mimeFamilies
- storageMode: indexeddb | memory | metadata-only
- quotaEstimateBytes when available
- errorName/errorMessage for failures only

### **5) OpenAPI/docs alignment**

Update scanner docs/OpenAPI to reflect actual contract:

- single upload, multi-page upload, multi-record upload
- IndexedDB blob-reference contract
- telemetry payload fields and sanitization policy
- quota/error fallback behavior

### **6) Quality bar / acceptance criteria**

- No scanner crashes with large file batches.
- No base64-heavy persistence to localStorage.
- Refresh restores previews from IndexedDB blob references.
- Telemetry rows appear for both success and failure scenarios.
- No console errors in normal flow.
- TypeScript passes for touched modules.
- Add/update focused tests for:
  - single image/PDF
  - multi-page
  - multi-record
  - quota fallback
  - refresh rehydration

---

## **Deliverables**

1. Code changes
2. Migration/RPC changes
3. Updated OpenAPI/docs
4. Test updates + test results
5. Short “what changed and why” summary
6. Explicit list of any remaining known risks