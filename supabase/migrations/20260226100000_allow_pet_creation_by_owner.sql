grant insert on public.pets to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pets'
      and policyname = 'pets_insert_owner'
  ) then
    create policy pets_insert_owner
      on public.pets
      for insert
      to authenticated
      with check (owner_user_id = auth.uid());
  end if;
end $$;
