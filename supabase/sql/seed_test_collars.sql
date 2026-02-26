-- Seed de coleiras para testes de ativacao via register-collar.
-- Mantem pet_id nulo para permitir vinculacao pelo app.

insert into public.collars (serial, activation_code, ble_service_uuid, pet_id)
values
  ('COL-1000-TEST', '100001', '0000fff0-0000-1000-8000-00805f9b34fb', null),
  ('COL-1001-TEST', '100002', '0000fff0-0000-1000-8000-00805f9b34fb', null),
  ('COL-1002-TEST', '100003', '0000fff0-0000-1000-8000-00805f9b34fb', null)
on conflict (serial) do update
set
  activation_code = excluded.activation_code,
  ble_service_uuid = excluded.ble_service_uuid;
