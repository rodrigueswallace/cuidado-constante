# Cuidado Constante (MVP)

MVP Android-first para rastreamento de pets com GPS + 4G + BLE, app em Expo e backend Supabase.

## Estrutura Supabase implementada

- Migração principal: `supabase/migrations/20260222130000_init_pet_tracking.sql`
- SQL espelho para SQL Editor: `supabase/sql/schema.sql`
- Edge Functions:
  - `supabase/functions/ingest-gps`
  - `supabase/functions/ingest-ble`
  - `supabase/functions/get-latest-gps`
- Shared helpers:
  - `supabase/functions/_shared/cors.ts`
  - `supabase/functions/_shared/supabase.ts`
- Config de JWT por função: `supabase/config.toml`

## Provisionar no Supabase (implementação)

### 1) Link no projeto Supabase

```bash
supabase login
supabase link --project-ref <project-ref>
```

### 2) Aplicar SQL (migrations)

```bash
supabase db push
```

Alternativa manual: rodar `supabase/sql/schema.sql` no SQL Editor.

### 3) Configurar secrets das funções

```bash
supabase secrets set \
  COLLAR_SHARED_SECRET=seu_segredo \
  SUPABASE_URL=https://<project-ref>.supabase.co \
  SUPABASE_ANON_KEY=<anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 4) Deploy das functions

```bash
supabase functions deploy ingest-gps
supabase functions deploy ingest-ble
supabase functions deploy get-latest-gps
```

## Teste rápido das functions

### ingest-gps

1. Criar pet + collar no banco.
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

POST autenticado por Bearer token do usuário:

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

## App mobile

```bash
npm install
cp .env.example .env
npm run start
```

Para BLE/background em Android físico:

```bash
npx expo prebuild
npm run android
```
