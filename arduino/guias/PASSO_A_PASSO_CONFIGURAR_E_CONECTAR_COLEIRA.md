# Passo a Passo - Configurar e Conectar Coleira (Arduino + App)

Atualizado em: 2026-05-31

## Objetivo

No final deste roteiro, sua coleira Arduino deve:

1. aparecer no BLE do app
2. conectar no app
3. enviar GPS para o Supabase
4. aparecer no mapa do app

## Etapa 1 - Separar os dados da coleira

Voce precisa destes dados:

1. `serial` (ex.: `COL-1000-TEST`)
2. `activation_code` (ex.: `100001`)
3. `ble_service_uuid` (UUID que o Arduino anuncia no BLE)
4. `collar_id` (UUID unico da coleira)
5. `shared_secret` (segredo para assinar GPS)
6. `api_base_url` (ex.: `https://SEU_REF.supabase.co/functions/v1`)
7. opcional: UUIDs de configuracao BLE para gravar nome da coleira

Esses dados precisam bater entre Arduino, Supabase e app.

## Etapa 2 - Cadastrar a coleira no Supabase

Abra Supabase SQL Editor e rode, trocando os valores:

```sql
insert into public.collars (id, serial, activation_code, ble_service_uuid, pet_id)
values (
  '918590ce-2118-409f-80d7-24d46dc6c167',
  'COL-1000-TEST',
  '100001',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  null
)
on conflict (serial) do update
set
  id = excluded.id,
  activation_code = excluded.activation_code,
  ble_service_uuid = excluded.ble_service_uuid;
```

## Etapa 3 - Gravar os mesmos dados no Arduino

No firmware, configure:

1. `collar_id` = mesmo `id` do banco
2. `serial` = mesmo do banco
3. `activation_code` = mesmo do banco
4. `ble_service_uuid` = mesmo do banco
5. `api_base_url` = URL do seu projeto
6. `shared_secret` = mesmo valor do Supabase secret `COLLAR_SHARED_SECRET`
7. se usar nome BLE configuravel, os UUIDs de config BLE precisam bater com o `.env` do app

## Etapa 4 - Firmware minimo

No Arduino precisa ter:

1. BLE advertising `connectable`
2. anuncio do `ble_service_uuid`
3. leitura GPS (`lat/lng`)
4. geracao de `ts` em UTC ISO8601
5. assinatura HMAC SHA-256 de `collar_id|lat|lng|ts`
6. POST para `{api_base_url}/ingest-gps`
7. opcional: characteristic BLE de escrita para configurar nome do dispositivo pelo app

Referencia tecnica: `IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md`.

## Etapa 5 - Validar no Serial Monitor

Depois do upload, verifique:

1. BLE iniciado
2. rede conectada (Wi-Fi/4G)
3. POST de GPS com status `200`

Se status nao for 200, corrija antes de testar no app.

## Etapa 6 - Ativar a coleira no app

No app:

1. abrir `Config`
2. tocar em adicionar nova coleira/dispositivo
3. preencher `serial` + `activation_code`
4. confirmar ativacao

## Etapa 7 - Testar GPS no mapa

1. ir para tela `GPS`
2. tocar `Atualizar posicao`
3. confirmar que os eventos GPS aumentam e o marcador aparece/atualiza

## Etapa 8 - Testar BLE no app

1. ir para tela `BLE`
2. tocar `Escanear BLE`
3. escolher sua coleira
4. tocar `Conectar`

Esperado:

1. conexao bem-sucedida
2. RSSI/proximidade atualizando
3. envio BLE para backend sem erro

## Etapa 9 - Nome BLE configuravel pelo app (opcional)

Se quiser alterar o nome BLE pela tela de dispositivo do app, configure no app:

1. `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID`
2. `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID`

No Arduino, use os mesmos UUIDs, receba o novo nome, salve em `Preferences` e reinicie/republique o advertising com o nome atualizado.

## Etapa 10 - Debug Android

```bash
adb logcat -c
adb logcat -v time ReactNativeJS:I *:S | findstr /i "BLE SCAN BLE CONNECT BLE INGEST EDGE ERROR GPS FETCH"
```

Procure:

1. `BLE SCAN => start/stop`
2. `BLE CONNECT OK`
3. `BLE INGEST => sent > 0`
4. ausencia de `EDGE ERROR` critico

## Etapa 11 - Checklist rapido

1. `serial` e `activation_code` batem com banco?
2. `collar_id` no Arduino e o mesmo do banco?
3. `ble_service_uuid` anunciado e o mesmo cadastrado?
4. assinatura HMAC usa exatamente `collar_id|lat|lng|ts`?
5. `shared_secret` e igual ao `COLLAR_SHARED_SECRET` do Supabase?
6. Arduino esta anunciando BLE connectable?
7. se alterou nome BLE no app, o firmware implementa a characteristic de configuracao e persiste o nome?

## Resumo

Para funcionar, estes pontos precisam estar alinhados:

1. cadastro no Supabase
2. dados iguais no Arduino
3. firmware enviando GPS assinado
4. app ativando e conectando no BLE certo
5. `shared_secret` apenas no Arduino e no Supabase, nunca em `EXPO_PUBLIC_*`