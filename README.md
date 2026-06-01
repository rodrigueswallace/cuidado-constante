# Cuidado Constante (MVP)

MVP Android-first para rastreamento de pets com GPS + 4G + BLE, app em Expo e backend Supabase.

## Estrutura Supabase

- Migrations: `supabase/migrations/`
- SQL consolidado para SQL Editor: `supabase/sql/schema.sql`
- Edge Functions:
  - `supabase/functions/ingest-gps`
  - `supabase/functions/ingest-ble`
  - `supabase/functions/get-latest-gps`
  - `supabase/functions/register-collar`
  - `supabase/functions/delete-account`
- Shared helpers:
  - `supabase/functions/_shared/cors.ts`
  - `supabase/functions/_shared/supabase.ts`
- Config de JWT por function: `supabase/config.toml`

## Provisionar no Supabase

### 1) Link no projeto Supabase

```bash
supabase login
supabase link --project-ref <project-ref>
```

### 2) Aplicar SQL

```bash
supabase db push
```

Alternativa manual: rodar `supabase/sql/schema.sql` no SQL Editor.

### 3) Configurar secrets das functions

```bash
supabase secrets set \
  COLLAR_SHARED_SECRET=seu_segredo \
  SUPABASE_URL=https://<project-ref>.supabase.co \
  SUPABASE_ANON_KEY=<anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`COLLAR_SHARED_SECRET` deve ser o mesmo segredo usado pelo firmware para gerar HMAC. Nao coloque esse valor em docs publicas nem em variaveis `EXPO_PUBLIC_*`.

### 4) Deploy das functions

```bash
supabase functions deploy ingest-gps
supabase functions deploy ingest-ble
supabase functions deploy get-latest-gps
supabase functions deploy register-collar
supabase functions deploy delete-account
```

Atalho do repo:

```bash
npm run supabase:functions:deploy
```

## App mobile

```bash
npm install
cp .env.example .env
npm run start
```

Para BLE/background em Android fisico:

```bash
npx expo prebuild
npm run android
```

## Variaveis de ambiente do app

Obrigatorias:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Opcionais para BLE:

- `EXPO_PUBLIC_BLE_SERVICE_UUID`: filtro de scan BLE.
- `EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX`: prioriza dispositivos por prefixo de nome.
- `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID`: servico BLE usado para configurar nome do dispositivo.
- `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID`: characteristic usada para gravar nome BLE.

## Status de JWT das Edge Functions

Todas ficam com `verify_jwt = false` em `supabase/config.toml`. As functions que exigem usuario validam o JWT internamente pelo header `Authorization`.

- `ingest-gps`: entrada do dispositivo por assinatura HMAC.
- `ingest-ble`: app autenticado envia RSSI/BLE.
- `get-latest-gps`: app autenticado busca eventos GPS.
- `register-collar`: app autenticado vincula serial/codigo ao pet.
- `delete-account`: app autenticado exclui a conta.

## Teste rapido das functions

### ingest-gps

1. Criar pet + collar no banco, ou seedar uma collar sem `pet_id`.
2. Gerar `signature = HMAC_SHA256(secret, "collar_id|lat|lng|ts")`.
3. Fazer POST para `/functions/v1/ingest-gps`.

Payload:

```json
{
  "collar_id": "uuid",
  "lat": -23.56,
  "lng": -46.63,
  "battery": 81,
  "ts": "2026-01-01T10:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

### ingest-ble

POST autenticado por Bearer token do usuario:

```json
{
  "collar_id": "uuid",
  "rssi": -63,
  "battery": 79,
  "ts": "2026-01-01T10:02:00Z"
}
```

### get-latest-gps

POST autenticado:

```json
{
  "collar_id": "uuid"
}
```

### register-collar

POST autenticado por Bearer token para validar `serial` + `activation_code` e vincular a coleira a um pet do usuario logado.

Payload:

```json
{
  "pet_id": "uuid",
  "serial": "COL-1234-ABCD",
  "activation_code": "654321"
}
```

Resposta de sucesso:

```json
{
  "collar_id": "uuid",
  "serial": "COL-1234-ABCD",
  "ble_service_uuid": "0000fff0-0000-1000-8000-00805f9b34fb"
}
```

### delete-account

POST autenticado:

```json
{}
```

Resposta de sucesso:

```json
{
  "ok": true
}
```

## Teste de 1 ponto GPS

1. Defina `collar_id`, `lat`, `lng` e `ts`.
2. Monte `canonical = "collar_id|lat|lng|ts"`.
3. Gere `signature` em HMAC SHA-256 hex com `COLLAR_SHARED_SECRET`.
4. Envie `POST /functions/v1/ingest-gps`.
5. No app, abra `GPS` e toque em `Atualizar posicao`.
