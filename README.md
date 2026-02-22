# Cuidado Constante (MVP)

MVP Android-first para rastreamento de pets com **GPS + 4G + BLE** usando **React Native (Expo)** + **Supabase**.

## Arquitetura

- **Coleira inteligente** envia GPS via HTTP para `Edge Function /ingest-gps` (a cada 30s).
- **App mobile** autentica no Supabase Auth e consome apenas **Edge Functions** para escrita/leitura principal.
- **GPS Tab** usa Google Maps + trilha histórica + rota inteligente (Directions API com throttling).
- **BLE Tab** faz scan/connect GATT (UUID custom), lê RSSI e bateria (placeholder de característica).
- **Config Tab** mostra permissões, ajustes e logout.
- **Offline**: fila local de eventos BLE com retry automático.

## Funcionalidades implementadas

1. Login e cadastro (email/senha).
2. Navegação por abas: GPS, BLE, Config.
3. Mapa em tempo real via polling + Realtime.
4. Distância usuário-pet (Haversine).
5. Rotas inteligentes com recálculo quando:
   - distância > 50m,
   - mudança > 25m,
   - ou tempo > 2 minutos,
   - além de botão manual.
6. BLE scan + conexão GATT + coleta RSSI + envio para backend.
7. SQL completo com índices e RLS.
8. Edge Functions:
   - `ingest-gps` (HMAC validation),
   - `ingest-ble` (auth obrigatório),
   - `get-latest-gps` (leitura protegida).

## Setup

```bash
npm install
cp .env.example .env
npm run start
```

### Variáveis

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_COLLAR_SHARED_SECRET`

## Supabase

1. Execute `supabase/sql/schema.sql` no SQL Editor.
2. Deploy das funções:

```bash
supabase functions deploy ingest-gps
supabase functions deploy ingest-ble
supabase functions deploy get-latest-gps
```

3. Configure secrets:

```bash
supabase secrets set COLLAR_SHARED_SECRET=... \
  SUPABASE_URL=... \
  SUPABASE_ANON_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=...
```

## Android físico (recomendado)

BLE + background exigem Dev Client/Bare:

```bash
npx expo prebuild
npm run android
```

Permissões relevantes já estão em `app.json`.

## Payload da coleira para ingestão GPS

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

Assinatura esperada: `HMAC_SHA256(secret, "collar_id|lat|lng|ts")`.

## Limitações conhecidas

- iOS possui restrições mais severas para scan BLE/background contínuo.
- Leitura real de bateria BLE depende da característica GATT implementada pela coleira.
- Expo Go não cobre stack BLE completa; usar Dev Client/Bare.
- Para produção, adotar rotação de segredos, rate limiting e observabilidade.
