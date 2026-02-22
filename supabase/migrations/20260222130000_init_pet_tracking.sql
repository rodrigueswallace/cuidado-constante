create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.collars (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  serial text not null unique,
  ble_service_uuid text not null,
  last_seen timestamptz,
  battery numeric(5,2) check (battery is null or (battery >= 0 and battery <= 100)),
  created_at timestamptz not null default now()
);

create table if not exists public.gps_events (
  id uuid primary key default gen_random_uuid(),
  collar_id uuid not null references public.collars(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  battery numeric(5,2) check (battery is null or (battery >= 0 and battery <= 100)),
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ble_events (
  id uuid primary key default gen_random_uuid(),
  collar_id uuid not null references public.collars(id) on delete cascade,
  rssi integer not null check (rssi between -127 and 20),
  battery numeric(5,2) check (battery is null or (battery >= 0 and battery <= 100)),
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pets_owner on public.pets(owner_user_id);
create index if not exists idx_collars_pet on public.collars(pet_id);
create index if not exists idx_collars_last_seen on public.collars(last_seen desc);
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
     where c.id = target_collar_id
       and p.owner_user_id = auth.uid()
  );
$$;

revoke all on function public.is_owner_of_collar(uuid) from public;
grant execute on function public.is_owner_of_collar(uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pets' and policyname = 'pets_select_owner') then
    create policy pets_select_owner
      on public.pets
      for select
      to authenticated
      using (owner_user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'collars' and policyname = 'collars_select_owner') then
    create policy collars_select_owner
      on public.collars
      for select
      to authenticated
      using (
        exists (
          select 1
            from public.pets p
           where p.id = collars.pet_id
             and p.owner_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'gps_events' and policyname = 'gps_events_select_owner') then
    create policy gps_events_select_owner
      on public.gps_events
      for select
      to authenticated
      using (public.is_owner_of_collar(collar_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ble_events' and policyname = 'ble_events_select_owner') then
    create policy ble_events_select_owner
      on public.ble_events
      for select
      to authenticated
      using (public.is_owner_of_collar(collar_id));
  end if;
end $$;

grant select on public.pets to authenticated;
grant select on public.collars to authenticated;
grant select on public.gps_events to authenticated;
grant select on public.ble_events to authenticated;

revoke insert, update, delete on public.pets from authenticated;
revoke insert, update, delete on public.collars from authenticated;
revoke insert, update, delete on public.gps_events from authenticated;
revoke insert, update, delete on public.ble_events from authenticated;
