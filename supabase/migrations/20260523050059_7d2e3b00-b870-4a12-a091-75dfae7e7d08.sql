create table public.security_scan_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  source text not null check (source in ('manual','cron')),
  status text not null default 'ok' check (status in ('ok','partial','failed')),
  total int not null default 0,
  open int not null default 0,
  fixed_now int not null default 0,
  duration_ms int,
  error_summary text
);
create index idx_security_scan_runs_ran_at on public.security_scan_runs (ran_at desc);

alter table public.security_scan_runs enable row level security;

create policy "Admins read scan runs"
  on public.security_scan_runs
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));