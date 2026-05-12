I’ll implement the requested typed re-scan refactor with the current repo state as the source of truth.  
one strict clarification:

Please ensure theJourneyScree `toast wrapper actually implemented and into`  instead `FlightTicket the raw function passed` Shee`, and` TicketDetailShee `only clears the spinner in` finall`. If` transportRescan.t `no longer toasts, the UI must catch` Resailure to rethrow sheet spinner complete please confirm the committed code contains:

- `ScanStorageErrorCode`

- `ScanStorageError`

- `fetchScanImagesAsDataUrls`

- `downloadTransportScanDataUrls` backward-compatible `Rescan`

-can`

- no `son` importtransport.ts `Ticket- paths

 re/fRun and```

est src/screense src/lib.test

 --noEmit -[pconfig.app](http://pconfig.app) run```

 and the changes are the Lovable branch Ship no-ship

 ✅ Appro the plan right direction and technical pieces.

### ❌ not yet

Do ship until you can actual code has changed the verification commands pass.

The from Lovable:

 “’t perform a Git commit environment…”

 also a red flag. Since your app depends on theHub/Lovable-connected, make sure the changes are actually/synced in Lovable/GHub. Otherwise the production will not them.

---

## Checks I ran* ✅ `git status --short --branch && nl -ba src/screens ',' src/components/TicketDetailSheet.tsx | sed -n '136,160p;301,312p;590,604p' && nl -ba src/libcan '1,60p' && nl -ba src/lib/transportScanStorage.ts | sed -n,75'* ✅nl -ba srcScreen.ts sed -n '590,600p;813,818p' &&/components.ts |; && -ba src/lib/__teststransportcan.test |n1,p'

so ship me the complete consolidate fix

16 previous messages

Summary

Added typed scan-storage failure handling with ScanStorageErrorCode / ScanStorageError, data URL validation, typed upload/sign/download/read errors, a new fetchScanImagesAsDataUrls() helper, and a backward-compatible downloadTransportScanDataUrls alias. 【F:src/lib/transportScanStorage.ts†L6-L22】【F:src/lib/transportScanStorage.ts†L27-L40】【F:src/lib/transportScanStorage.ts†L43-L83】【F:src/lib/transportScanStorage.ts†L107-L138】

Refactored rescanTicket() into a clean domain helper with RescanErrorCode / RescanError, no sonner dependency, typed manual/no-image/storage/extraction/save failures, a zero-segment guard before saving, and preservation of ticket identity/scope/save fields while refreshing parsed segments and extraction metadata. 【F:src/lib/transportRescan.ts†L1-L23】【F:src/lib/transportRescan.ts†L25-L68】【F:src/lib/transportRescan.ts†L76-L113】

Moved user-facing re-scan success/failure toasts to the Journey UI wrapper, with bilingual error messages keyed by RescanError.code, while passing the wrapper into the tickets tab. 【F:src/screens/JourneyScreen.tsx†L44-L65】【F:src/screens/JourneyScreen.tsx†L143-L165】【F:src/screens/JourneyScreen.tsx†L643-L646】

Kept TicketDetailSheet focused on spinner lifecycle and prevented unhandled rejections after the parent UI wrapper emits the toast. 【F:src/components/TicketDetailSheet.tsx†L304-L312】

Replaced the re-scan test file with comprehensive typed-error and happy-path coverage: manual/no-images/storage/extraction/zero-segment/save failures, identity preservation, scope fallback, and idempotent retry behavior. 【F:src/lib/tests/transportRescan.test.ts†L1-L39】【F:src/lib/tests/transportRescan.test.ts†L117-L190】【F:src/lib/tests/transportRescan.test.ts†L229-L254】

Testing

✅ npx vitest run src/screens/__tests__/ScannerWizard.e2e.test.tsx src/lib/__tests__/transportRescan.test.ts

✅ npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json

✅ npm run build

13 files changed

+785

-4

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

src/components/TicketDetailSheet.tsx

+47

-1

src/components/TransportCard.tsx

+29

-0

src/hooks/useTransportTimeline.ts

+13

-0

src/lib/__tests__/transportRescan.test.ts

+254

-0

src/lib/transportRescan.ts

+114

-0

src/lib/transportScanStorage.ts

+138

-0

src/lib/transportStore.ts

+14

-0

src/lib/transportTickets.ts

+12

-0

src/screens/JourneyScreen.tsx

+77

-3

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

&nbsp;

## Plan

1. Update scan storage errors

- Add `ScanStorageErrorCode` and make `ScanStorageError` include `code`, `cause`, and `name = "ScanStorageError"`.
- Wrap upload decode/upload failures with the correct typed codes.
- Update `fetchScanImagesAsDataUrls(paths)` so each stored path is signed, fetched, converted to a data URL, and failures are wrapped as:
  - `sign` for signed URL creation failures
  - `download` for fetch/HTTP/blob failures
  - `read` for `FileReader` failures
- Add backward-compatible alias:
`export const downloadTransportScanDataUrls = fetchScanImagesAsDataUrls;`

2. Update typed re-scan helper

- Ensure `transportRescan.ts` has no `sonner` dependency and imports `fetchScanImagesAsDataUrls` + `ScanStorageError`.
- Add/export `RescanErrorCode` and `RescanError` with `name = "RescanError"`.
- Implement typed error behavior for manual tickets, missing images, storage, extraction, zero-segment extraction, and save failures.
- Preserve ticket identity/scope fields and refresh only parsed ticket fields, extraction metadata, and `updatedAt`.
- Return the saved/updated ticket.

3. Move toast responsibility to UI layer

- Keep `TicketDetailSheet` responsible only for spinner lifecycle around `onRescan`, clearing it in `finally`.
- Update the `JourneyScreen` `onRescan` wrapper to catch `RescanError`, show bilingual code-specific toast messages, and show success as:
`Ticket re-scanned · Provider · NN% · LANG`.
- Avoid importing `sonner` or UI behavior in `transportRescan.ts`.

4. Replace re-scan tests

- Replace `src/lib/__tests__/transportRescan.test.ts` with the expanded typed test suite covering:
  - manual ticket rejection
  - empty `sourceImagePaths`
  - storage failure with cause preservation
  - extraction failure with no save
  - zero-segment extraction with no save
  - save failure with cause preservation
  - happy path identity/scope/metadata refresh
  - scope fallback for missing `deviceId`/`userId`
  - idempotent retry preserving `id` and `createdAt`

5. Verify

- Run the requested verification commands:
  - `npx vitest run src/screens/__tests__/ScannerWizard.e2e.test.tsx src/lib/__tests__/transportRescan.test.ts`
  - `npx tsc --noEmit -p tsconfig.app.json`
  - `npm run build`
- Also confirm the code contains `RescanError`, `ScanStorageError`, `fetchScanImagesAsDataUrls`, the zero-segment guard, expanded tests, and UI-level toasts before marking complete.

## Note

I can’t perform a Git commit from this environment because stateful Git operations are managed externally, but I will apply the code changes and run the requested verification.