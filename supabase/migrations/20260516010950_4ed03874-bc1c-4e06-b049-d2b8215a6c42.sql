
-- ============================================================
-- Step details: attachments + notes
-- ============================================================

create table if not exists public.step_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  device_id text null,
  step_ref text not null,
  timeline_kind text not null check (timeline_kind in ('journey', 'carehub')),
  file_path text not null,
  file_name text not null,
  mime_type text null,
  size_bytes int null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_attachments_owner_check check (user_id is not null or device_id is not null)
);

create table if not exists public.step_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  device_id text null,
  step_ref text not null,
  timeline_kind text not null check (timeline_kind in ('journey', 'carehub')),
  body text not null check (char_length(body) between 1 and 1000),
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint step_notes_owner_check check (user_id is not null or device_id is not null)
);

create index if not exists idx_step_attachments_user_ref
  on public.step_attachments(user_id, timeline_kind, step_ref)
  where deleted_at is null;
create index if not exists idx_step_attachments_device_ref
  on public.step_attachments(device_id, timeline_kind, step_ref)
  where deleted_at is null;
create index if not exists idx_step_notes_user_ref
  on public.step_notes(user_id, timeline_kind, step_ref, created_at desc)
  where deleted_at is null;
create index if not exists idx_step_notes_device_ref
  on public.step_notes(device_id, timeline_kind, step_ref, created_at desc)
  where deleted_at is null;

create trigger trg_step_attachments_updated_at
  before update on public.step_attachments
  for each row execute function public.update_updated_at_column();

create trigger trg_step_notes_updated_at
  before update on public.step_notes
  for each row execute function public.update_updated_at_column();

alter table public.step_attachments enable row level security;
alter table public.step_notes enable row level security;

-- step_attachments policies
create policy "step_attachments select own"
  on public.step_attachments for select
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_attachments insert own"
  on public.step_attachments for insert
  with check (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_attachments update own"
  on public.step_attachments for update
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
  with check (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_attachments delete own"
  on public.step_attachments for delete
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

-- step_notes policies
create policy "step_notes select own"
  on public.step_notes for select
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_notes insert own"
  on public.step_notes for insert
  with check (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_notes update own"
  on public.step_notes for update
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
  with check (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

create policy "step_notes delete own"
  on public.step_notes for delete
  using (
    (user_id is not null and user_id = auth.uid())
    or (device_id is not null and device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  );

-- ============================================================
-- Storage bucket: step-attachments (private)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('step-attachments', 'step-attachments', false)
on conflict (id) do nothing;

-- Signed-in users: user/<uid>/...
create policy "step-attachments user select"
  on storage.objects for select
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "step-attachments user insert"
  on storage.objects for insert
  with check (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "step-attachments user update"
  on storage.objects for update
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "step-attachments user delete"
  on storage.objects for delete
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Guests/device-scope: <deviceId>/...
create policy "step-attachments device select"
  on storage.objects for select
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

create policy "step-attachments device insert"
  on storage.objects for insert
  with check (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

create policy "step-attachments device update"
  on storage.objects for update
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

create policy "step-attachments device delete"
  on storage.objects for delete
  using (
    bucket_id = 'step-attachments'
    and (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );
