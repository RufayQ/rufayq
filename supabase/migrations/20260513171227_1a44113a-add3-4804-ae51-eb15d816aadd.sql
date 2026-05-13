alter table public.provider_appointments
  add column if not exists appointment_type text,
  add column if not exists visit_type text;

alter table public.appointments
  add column if not exists visit_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'provider_appointments_appointment_type_check'
  ) then
    alter table public.provider_appointments
      add constraint provider_appointments_appointment_type_check
      check (appointment_type is null or appointment_type in ('physician','lab','radiology'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'provider_appointments_visit_type_check'
  ) then
    alter table public.provider_appointments
      add constraint provider_appointments_visit_type_check
      check (visit_type is null or visit_type in ('in-person','telemedicine','clinic'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_visit_type_check'
  ) then
    alter table public.appointments
      add constraint appointments_visit_type_check
      check (visit_type is null or visit_type in ('in-person','telemedicine','clinic'));
  end if;
end $$;