create or replace function public.security_findings_upsert(_findings jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  seen_keys text[] := array[]::text[];
  rec jsonb;
  inserted_count int := 0;
  is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role'
                     or current_user = 'service_role';
begin
  if not is_service and not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  for rec in select * from jsonb_array_elements(_findings) loop
    seen_keys := array_append(seen_keys, (rec->>'scanner_name') || '|' || (rec->>'internal_id'));
    insert into public.security_findings(scanner_name, internal_id, title, severity, description, metadata, last_seen_at)
    values (
      rec->>'scanner_name',
      rec->>'internal_id',
      coalesce(rec->>'title', rec->>'internal_id'),
      coalesce(rec->>'severity', 'medium'),
      rec->>'description',
      coalesce(rec->'metadata', '{}'::jsonb),
      now()
    )
    on conflict (scanner_name, internal_id) do update
      set title = excluded.title,
          severity = excluded.severity,
          description = excluded.description,
          metadata = excluded.metadata,
          last_seen_at = now(),
          status = case when public.security_findings.status = 'fixed' then 'open' else public.security_findings.status end,
          resolved_at = case when public.security_findings.status = 'fixed' then null else public.security_findings.resolved_at end;
    inserted_count := inserted_count + 1;
  end loop;

  update public.security_findings
     set status = 'fixed', resolved_at = now()
   where status = 'open'
     and (scanner_name || '|' || internal_id) <> all(seen_keys);

  return inserted_count;
end $function$;