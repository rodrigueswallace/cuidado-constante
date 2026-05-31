create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) >= 1),
  species text,
  birth_date date,
  color text,
  sex text,
  weight_kg numeric(6,2),
  size text,
  microchip text,
  breed text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.collars (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  serial text not null unique,
  activation_code text not null,
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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  active_collar uuid references public.collars(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pets_owner on public.pets(owner_user_id);
create index if not exists idx_collars_pet on public.collars(pet_id);
create index if not exists idx_collars_serial_activation on public.collars(serial, activation_code);
create index if not exists idx_collars_last_seen on public.collars(last_seen desc);
create index if not exists idx_gps_events_collar_ts on public.gps_events(collar_id, ts desc);
create index if not exists idx_ble_events_collar_ts on public.ble_events(collar_id, ts desc);
create index if not exists idx_profiles_active_collar on public.profiles(active_collar);

alter table public.pets enable row level security;
alter table public.collars enable row level security;
alter table public.gps_events enable row level security;
alter table public.ble_events enable row level security;
alter table public.profiles enable row level security;

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
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pets' and policyname = 'pets_insert_owner') then
    create policy pets_insert_owner
      on public.pets
      for insert
      to authenticated
      with check (owner_user_id = auth.uid());
  end if;
end $$;

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
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own') then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pets' and policyname = 'pets_update_owner') then
    create policy pets_update_owner
      on public.pets
      for update
      to authenticated
      using (owner_user_id = auth.uid())
      with check (owner_user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (
        id = auth.uid()
        and (
          active_collar is null
          or public.is_owner_of_collar(active_collar)
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (
        id = auth.uid()
        and (
          active_collar is null
          or public.is_owner_of_collar(active_collar)
        )
      );
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
grant insert on public.pets to authenticated;
grant update on public.pets to authenticated;
grant select on public.collars to authenticated;
grant select on public.gps_events to authenticated;
grant select on public.ble_events to authenticated;
grant select, insert, update on public.profiles to authenticated;

revoke delete on public.pets from authenticated;
revoke insert, update, delete on public.collars from authenticated;
revoke insert, update, delete on public.gps_events from authenticated;
revoke insert, update, delete on public.ble_events from authenticated;
revoke delete on public.profiles from authenticated;

create or replace function public.handle_new_user_onboarding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_birth_date text;
  parsed_birth_date date;
begin
  raw_birth_date := nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_birth_date', '')), '');

  if raw_birth_date is not null then
    begin
      parsed_birth_date := raw_birth_date::date;
    exception
      when others then
        parsed_birth_date := null;
    end;
  end if;

  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        updated_at = now();

  if nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_name', '')), '') is not null then
    insert into public.pets (
      owner_user_id,
      name,
      species,
      birth_date,
      color,
      sex,
      weight_kg,
      size,
      microchip,
      breed,
      notes
    )
    values (
      new.id,
      trim(new.raw_user_meta_data ->> 'pet_name'),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_species', '')), ''),
      parsed_birth_date,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_color', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_sex', '')), ''),
      case
        when nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_weight_kg', '')), '') is null then null
        else (new.raw_user_meta_data ->> 'pet_weight_kg')::numeric
      end,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_size', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_microchip', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_breed', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'pet_notes', '')), '')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_onboarding on auth.users;

create trigger on_auth_user_created_onboarding
  after insert on auth.users
  for each row execute procedure public.handle_new_user_onboarding();
