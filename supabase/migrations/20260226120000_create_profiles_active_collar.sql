create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  active_collar uuid references public.collars(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_active_collar on public.profiles(active_collar);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
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
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
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

grant select, insert, update on public.profiles to authenticated;
revoke delete on public.profiles from authenticated;
