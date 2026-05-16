# Step details expansion — attachments + notes

Reusable per-step panel with attachments and timestamped notes for the Journey master timeline (flights + appointments) and Care Hub exercises. Same durable user-or-device scoping pattern as `RelatedDocumentsCard`.

## Database

New migration creates two tables, indexes, triggers, RLS, and a private storage bucket.

```sql
create table public.step_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  device_id text null,
  step_ref text not null,
  timeline_kind text not null check (timeline_kind in ('journey','carehub')),
  file_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes int null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_attachments_owner_check check (user_id is not null or device_id is not null)
);

create table public.step_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  device_id text null,
  step_ref text not null,
  timeline_kind text not null check (timeline_kind in ('journey','carehub')),
  body text not null check (char_length(body) between 1 and 1000),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_notes_owner_check check (user_id is not null or device_id is not null)
);
```

Partial indexes on `(user_id|device_id, timeline_kind, step_ref)` filtered by `deleted_at is null`. Notes index also orders by `created_at desc`.

`updated_at` triggers reuse `public.update_updated_at_column`.

### RLS

Enable on both tables. SELECT / INSERT / UPDATE / DELETE allowed when:

```
user_id = auth.uid()
OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
```

UI uses UPDATE for soft-delete (`deleted_at = now()`), never hard-delete.

Insert rules:
- Signed-in: write **both** `user_id = auth.uid()` and `device_id = <header>` when available.
- Guest: `user_id = null`, `device_id = <header>`.

### Storage bucket `step-attachments` (private)

Paths:
- `user/<uid>/<safeStepRef>/<uuid>.<ext>` — signed-in
- `<deviceId>/<safeStepRef>/<uuid>.<ext>` — guest

`safeStepRef = encodeURIComponent(stepRef)` — never put raw `step_ref` in the path.

Storage RLS mirrors `transport-attachments`: `user/<auth.uid()>/...` and legacy `<deviceId>/...` reachable by header.

## Frontend

### New `src/components/timeline/StepDetailsPanel.tsx`

```ts
interface StepDetailsPanelProps {
  stepRef: string;
  timelineKind: "journey" | "carehub";
  userId?: string | null;
}
```

Behavior, copied from `RelatedDocumentsCard` but rewritten (it is too transport-specific to reuse directly):

- **Attachments**: photo / PDF / doc upload, image thumbnail or file icon, open via signed URL, soft-delete only.
- **Notes**: textarea (≤1000 chars), optimistic insert, newest first, soft-delete own note.
- Bilingual EN + AR labels, RTL preserved.
- **Fetch**: signed-in uses `or(user_id.eq.<uid>,device_id.eq.<deviceId>)`; guest uses `eq(device_id, <deviceId>)`. Both filter `deleted_at is null`.
- On fetch error: log + bilingual toast; **keep last-known items mounted** (no flicker on transient failure).
- **No localStorage sync queue in v1** — guests write straight to Supabase under device scope when online.

### `src/components/journey/UnifiedTimeline.tsx`

- Add `userId?: string | null` prop.
- Add `expandedId` local state; chevron toggles expansion. **Preserve existing `onItemTap`** — wire chevron to expand, keep row tap firing the existing handler (or split into row body + chevron button).
- Compute stable `stepRef` per item:
  - `journey:<tripId>:flight:outbound`
  - `journey:<tripId>:flight:return`
  - `journey:<tripId>:appointment:<appointmentId>`
- Render `<StepDetailsPanel stepRef={…} timelineKind="journey" userId={userId} />` below the expanded row.

### `src/screens/JourneyScreen.tsx`

Pass the existing `userId` from `useTransportTimeline` (or `useAuthUserId`) into `<UnifiedTimeline userId={userId} />`.

### `src/screens/CareHubScreen.tsx`

- Use `useAuthUserId()` once at the top.
- Inside the existing exercise-expanded panel (`expandedEx === i`), render
  `<StepDetailsPanel stepRef={`carehub:exercise:${slugify(ex.name)}`} timelineKind="carehub" userId={authUserId} />`.
- **Day cards / care-plan items remain out of scope for v1.**

## Tests

`src/components/timeline/__tests__/StepDetailsPanel.test.tsx`:
- Guest fetch/insert uses device scope only.
- Signed-in upload inserts `user_id`, `device_id`, `step_ref`, `timeline_kind`.
- Signed-in storage path starts with `user/<uid>/`.
- Note insertion appears optimistically and persists newest-first.
- Attachment + note delete update `deleted_at`; never call `.delete()` or storage `.remove()`.
- Fetch error keeps previously rendered items mounted.

Component-level coverage:
- `UnifiedTimeline` expands and renders the panel with the expected `journey:*` step ref.
- `CareHubScreen` exercise expansion renders the panel with `carehub:exercise:*`.

## Acceptance criteria

Manual smoke as signed-in user:
1. Open Journey master timeline, expand a flight or appointment.
2. Add a note and attach a file.
3. Refresh — both still visible.
4. DB: `step_attachments.user_id` set, `file_path` starts with `user/<uid>/`, `step_notes.user_id` set.
5. Delete from UI → `deleted_at` populated, storage object remains.

Repeat as guest → rows are device-scoped (`user_id is null`, `device_id` set, `file_path` starts with `<deviceId>/`).

## Out of scope (deferred)

- Provider visibility into patient notes/attachments on provider-pushed appointments (needs explicit consent/RLS design).
- LocalStorage sync queue for offline writes.
- Care Hub day cards / care-plan items.

## Files

- New migration (tables, indexes, triggers, RLS, storage bucket + policies)
- New `src/components/timeline/StepDetailsPanel.tsx`
- Edit `src/components/journey/UnifiedTimeline.tsx`
- Edit `src/screens/JourneyScreen.tsx`
- Edit `src/screens/CareHubScreen.tsx`
- New test file `src/components/timeline/__tests__/StepDetailsPanel.test.tsx`
