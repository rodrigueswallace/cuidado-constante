grant update on public.pets to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pets'
      and policyname = 'pets_update_owner'
  ) then
    create policy pets_update_owner
      on public.pets
      for update
      to authenticated
      using (owner_user_id = auth.uid())
      with check (owner_user_id = auth.uid());
  end if;
end $$;
