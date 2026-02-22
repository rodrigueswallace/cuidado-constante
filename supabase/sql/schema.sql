-- Extensions
create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collars (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  serial text not null unique,
  ble_service_uuid text not null,
  last_seen timestamptz,
  battery numeric(5,2),
  created_at timestamptz not null default now()
);

create table if not exists public.gps_events (
  id uuid primary key default gen_random_uuid(),
  collar_id uuid not null references public.collars(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  battery numeric(5,2),
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ble_events (
  id uuid primary key default gen_random_uuid(),
  collar_id uuid not null references public.collars(id) on delete cascade,
  rssi integer not null,
  battery numeric(5,2),
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pets_owner on public.pets(owner_user_id);
create index if not exists idx_collars_pet on public.collars(pet_id);
create index if not exists idx_gps_events_collar_ts on public.gps_events(collar_id, ts desc);
create index if not exists idx_ble_events_collar_ts on public.ble_events(collar_id, ts desc);

alter table public.pets enable row level security;
alter table public.collars enable row level security;
alter table public.gps_events enable row level security;
alter table public.ble_events enable row level security;

create or replace function public.is_owner_of_collar(target_collar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.collars c
    join public.pets p on p.id = c.pet_id
    where c.id = target_collar_id and p.owner_user_id = auth.uid()
  );
$$;

create policy pets_select_owner on public.pets
for select to authenticated
using (owner_user_id = auth.uid());

create policy collars_select_owner on public.collars
for select to authenticated
using (
  exists (
    select 1 from public.pets p
    where p.id = collars.pet_id and p.owner_user_id = auth.uid()
  )
);

create policy gps_events_select_owner on public.gps_events
for select to authenticated
using (public.is_owner_of_collar(collar_id));

create policy ble_events_select_owner on public.ble_events
for select to authenticated
using (public.is_owner_of_collar(collar_id));

-- write operations restricted to service role and edge functions
revoke insert, update, delete on public.pets from authenticated;
revoke insert, update, delete on public.collars from authenticated;
revoke insert, update, delete on public.gps_events from authenticated;
revoke insert, update, delete on public.ble_events from authenticated;
