alter table public.collars
  alter column pet_id drop not null;

alter table public.collars
  add column if not exists activation_code text;

update public.collars
set activation_code = coalesce(activation_code, substr(md5(id::text), 1, 6))
where activation_code is null;

alter table public.collars
  alter column activation_code set not null;

create index if not exists idx_collars_serial_activation on public.collars(serial, activation_code);
