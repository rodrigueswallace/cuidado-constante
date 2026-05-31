alter table public.collars
  add column if not exists display_name text,
  add column if not exists ble_device_name text;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'collars'
      and policyname = 'collars_update_owner'
  ) then
    create policy collars_update_owner
      on public.collars
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.pets
          where pets.id = collars.pet_id
            and pets.owner_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.pets
          where pets.id = collars.pet_id
            and pets.owner_user_id = auth.uid()
        )
      );
  end if;
end $$;

grant update on public.collars to authenticated;
