create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  role_pref text check (role_pref in ('patient','doctor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

create policy "owner can read own push tokens"
  on public.device_push_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy "owner can insert own push tokens"
  on public.device_push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "owner can update own push tokens"
  on public.device_push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner can delete own push tokens"
  on public.device_push_tokens for delete
  to authenticated
  using (user_id = auth.uid());