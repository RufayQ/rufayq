Fix the two Supabase security scan errors related to transport attachments and subscription events.  
  
Context:

1. The `transport_attachments` table stores sensitive travel document metadata such as passport/visa attachment paths. Its RLS policies must not use `USING (true)` or `WITH CHECK (true)`.

2. The `transport-attachments` storage bucket stores the actual sensitive files. Storage policies must not allow access based only on `bucket_id = 'transport-attachments'`.

3. Attachment storage paths follow this layout:

   <device_id>/<segment_ref>/<filename>

4. The app sends an `x-device-id` request header for device-scoped guest access.

5. The `subscription_events` insert policy currently allows anonymous inserts via `auth.uid() IS NULL`; remove that allowance.

Required changes:

- Update the existing migration that creates `transport-attachments` / `transport_attachments` so fresh database resets are secure.

- Add a new forward migration so existing deployments are also fixed.

- For `storage.objects` policies on bucket `transport-attachments`:

  - SELECT must require:

    bucket_id = 'transport-attachments'

    AND (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')

  - INSERT must use the same condition in `WITH CHECK`.

  - DELETE must use the same condition in `USING`.

- For `public.transport_attachments` table policies:

  - SELECT must require:

    device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')

  - INSERT must require:

    device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')

    AND split_part(file_path, '/', 1) = device_id

  - DELETE must require:

    device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')

- For `public.subscription_events`, replace the INSERT policy so it only allows:

    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')

  Do not allow `auth.uid() IS NULL`.

Implementation notes:

- Preserve anonymous/device guest support, but only when the row/device path matches the `x-device-id` header.

- Keep the existing policy names if possible to minimize app changes.

- Do not change UI code unless needed.

- After editing, verify there are no remaining insecure patterns in the touched migrations:

  - `auth.uid() IS NULL`

  - `USING (true)`

  - `WITH CHECK (true)`

  - storage policies for `transport-attachments` that check only `bucket_id`

- Run lint/build checks if available.

Why this prompt matches the fix

The storage fix requires the first folder segment in transport-attachments object paths to match the request’s x-device-id, for read/upload/delete policies. 【F:supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql†L7-L33】

The table fix requires transport_attachments.device_id to match x-device-id, and insert additionally requires file_path to begin with the same device id. 【F:supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql†L35-L55】

The subscription-event fix removes anonymous inserts and limits direct inserts to admin/moderator roles. 【F:supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql†L57-L61】

The original attachment migration was also updated so new database resets create secure policies from the start. 【F:supabase/migrations/20260510012801_bf32208d-2864-4e3c-b9ca-3ce92a1a8187.sql†L6-L77】

The original subscription-event migration was also updated to remove the auth.uid() IS NULL branch. 【F:supabase/migrations/20260426220752_198d334a-5a4d-46f7-98b8-f13e86de907b.sql†L76-L79】

Checks used

✅ git status --short && nl -ba supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql | sed -n '1,90p' && nl -ba supabase/migrations/20260510012801_bf32208d-2864-4e3c-b9ca-3ce92a1a8187.sql | sed -n '1,85p' && nl -ba supabase/migrations/20260426220752_198d334a-5a4d-46f7-98b8-f13e86de907b.sql | sed -n '72,82p'

44 files changed

+3455

-413

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

src/components/AppointmentFormSheet.tsx

+76

-25

src/components/DuplicateTicketDialog.tsx

+106

-0

src/components/JourneyHelicopterTimeline.tsx

+114

-0

src/components/TicketDetailSheet.tsx

+68

-1

src/components/TicketsFilterBar.tsx

+192

-0

src/components/TransportCard.tsx

+29

-0

src/components/home/ActiveTripCard.tsx

+83

-0

src/components/home/DischargeAlertBanner.tsx

+19

-0

src/components/home/EmptyJourneyCard.tsx

+37

-0

src/components/home/HomeHeader.tsx

+68

-0

src/components/home/OtherJourneysList.tsx

+54

-0

src/components/home/QuickActionsGrid.tsx

+35

-0

src/components/journey/UnifiedTimeline.tsx

+68

-0

src/components/journey/__tests__/UnifiedTimeline.test.tsx

+35

-0

src/constants/data.ts

+4

-0

src/hooks/useAppointments.ts

+6

-1

src/hooks/useDomainData.ts

+12

-4

src/hooks/usePatientName.ts

+46

-0

src/hooks/useProviderAppointments.ts

+42

-0

src/hooks/useTransportTimeline.ts

+41

-0

src/lib/__tests__/appointmentRows.test.ts

+100

-0

src/lib/__tests__/transportDuplicates.test.ts

+125

-0

src/lib/__tests__/transportRescan.test.ts

+254

-0

src/lib/__tests__/transportStore.crud.test.ts

+121

-0

src/lib/api/appointmentApi.ts

+1

-0

src/lib/api/schemas.ts

+1

-0

src/lib/appointmentRows.ts

+153

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

+130

-0

src/pages/Index.tsx

+24

-5

src/screens/HomeScreen.tsx

+269

-253

src/screens/JourneyScreen.tsx

+414

-117

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/HomeScreen.test.tsx

+115

-0

src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx

+168

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260426220752_198d334a-5a4d-46f7-98b8-f13e86de907b.sql

+1

-1

supabase/migrations/20260510012801_bf32208d-2864-4e3c-b9ca-3ce92a1a8187.sql

+21

-7

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

supabase/migrations/20260513120000_appointment_visit_type.sql

+9

-0

supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql

+61

-0

&nbsp;