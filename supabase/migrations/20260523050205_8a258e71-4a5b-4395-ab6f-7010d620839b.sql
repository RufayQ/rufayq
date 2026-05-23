create or replace function public.security_scan_db()
returns table (
  internal_id text,
  title text,
  severity text,
  description text,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- 1) Tables in public without RLS
  return query
  select
    'rls_disabled:' || c.relname,
    'Table public.' || c.relname || ' has RLS disabled',
    'high'::text,
    'Row-level security is not enabled on this table. Any authenticated client can read or write it.',
    jsonb_build_object('schema','public','table',c.relname)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  -- 2) Functions in public missing a pinned search_path (mutable search_path)
  return query
  select
    'search_path_missing:' || p.proname || ':' || p.oid::text,
    'Function public.' || p.proname || ' has no fixed search_path',
    'medium'::text,
    'SECURITY DEFINER and trigger functions should set search_path explicitly to avoid hijacking via schema shadowing.',
    jsonb_build_object('schema','public','function',p.proname,'oid',p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (p.proconfig is null
         or not exists (
           select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%'
         ));

  -- 3) Extensions installed in public schema
  return query
  select
    'extension_in_public:' || e.extname,
    'Extension ' || e.extname || ' installed in public schema',
    'low'::text,
    'Extensions in the public schema can clutter and conflict with app objects. Move to a dedicated schema (e.g. extensions).',
    jsonb_build_object('extension',e.extname)
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where n.nspname = 'public';
end;
$$;

revoke all on function public.security_scan_db() from public, anon, authenticated;
grant execute on function public.security_scan_db() to service_role;