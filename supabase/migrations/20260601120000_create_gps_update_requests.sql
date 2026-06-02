create table if not exists public.gps_update_requests (
  id uuid primary key default gen_random_uuid(),
  collar_id uuid not null references public.collars(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  processing_at timestamptz,
  completed_at timestamptz,
  gps_event_id uuid references public.gps_events(id) on delete set null,
  error text
);

create index if not exists idx_gps_update_requests_collar_status
  on public.gps_update_requests(collar_id, status, requested_at);

create unique index if not exists idx_gps_update_requests_one_open
  on public.gps_update_requests(collar_id)
  where status in ('pending', 'processing');

alter table public.gps_update_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gps_update_requests'
      and policyname = 'gps_update_requests_select_owner'
  ) then
    create policy gps_update_requests_select_owner
      on public.gps_update_requests
      for select
      to authenticated
      using (public.is_owner_of_collar(collar_id));
  end if;
end $$;

revoke all on public.gps_update_requests from anon;
revoke all on public.gps_update_requests from public;
grant select on public.gps_update_requests to authenticated;
revoke insert, update, delete on public.gps_update_requests from authenticated;
