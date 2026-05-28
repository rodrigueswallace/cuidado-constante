alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text;

alter table public.pets
  add column if not exists species text,
  add column if not exists birth_date date,
  add column if not exists color text,
  add column if not exists sex text,
  add column if not exists weight_kg numeric(6,2),
  add column if not exists size text,
  add column if not exists microchip text,
  add column if not exists breed text,
  add column if not exists notes text;

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
