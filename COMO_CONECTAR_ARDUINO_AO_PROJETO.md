# Como Conectar um Dispositivo Arduino ao Projeto

Atualizado em: 2026-03-13

## Objetivo

Este guia explica como conectar uma coleira baseada em Arduino/ESP32 ao projeto `cuidado-constante`, usando:

- BLE para descoberta e conexao com o app
- Wi-Fi/4G para envio de GPS ao Supabase
- HMAC SHA-256 para autenticacao do dispositivo

No final do fluxo, o dispositivo deve:

1. anunciar BLE com o UUID correto
2. ser vinculado a um pet pelo app
3. enviar eventos GPS para o backend
4. aparecer no mapa do aplicativo

## Arquitetura usada neste projeto

O dispositivo conversa com o backend por esta rota:

`https://<project-ref>.supabase.co/functions/v1/ingest-gps`

O app usa estas Edge Functions:

- `register-collar`: vincula a coleira ao pet do usuario
- `ingest-ble`: envia proximidade BLE detectada pelo app
- `get-latest-gps`: busca ultimos pontos GPS da coleira

Tabelas principais no Supabase:

- `public.collars`
- `public.gps_events`
- `public.ble_events`
- `public.pets`
- `public.profiles`

## Dados que precisam existir no dispositivo

O firmware deve persistir estes campos:

- `collar_id`: UUID da coleira no banco
- `serial`: identificador legivel da coleira
- `activation_code`: codigo usado no cadastro pelo app
- `ble_service_uuid`: UUID BLE anunciado pelo dispositivo
- `api_base_url`: base das funcoes do Supabase
- `shared_secret`: segredo usado para assinar os eventos GPS

Exemplo:

```txt
collar_id=918590ce-2118-409f-80d7-24d46dc6c167
serial=COL-1000-TEST
activation_code=100001
ble_service_uuid=0000fff0-0000-1000-8000-00805f9b34fb
api_base_url=https://SEU_PROJECT_REF.supabase.co/functions/v1
shared_secret=SEU_SEGREDO_DO_AMBIENTE
```

## Passo 1 - Cadastrar a coleira no Supabase

Antes de ligar o dispositivo ao app, a coleira precisa existir na tabela `public.collars`.

SQL base:

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

Regras importantes:

- `serial` e `activation_code` serao digitados no app
- `id` sera o `collar_id` usado pelo firmware
- `ble_service_uuid` precisa ser exatamente o UUID anunciado por BLE
- `pet_id` pode iniciar como `null`; o app faz a vinculacao depois

## Passo 2 - Configurar secrets no backend

A funcao `ingest-gps` valida a assinatura HMAC com a secret `COLLAR_SHARED_SECRET`.

No Supabase, configure:

```bash
supabase secrets set \
  COLLAR_SHARED_SECRET=seu_segredo \
  SUPABASE_URL=https://<project-ref>.supabase.co \
  SUPABASE_ANON_KEY=<anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

O valor de `COLLAR_SHARED_SECRET` precisa ser o mesmo gravado no Arduino.

## Passo 3 - Gravar a configuracao no Arduino/ESP32

No firmware, salve os mesmos dados do cadastro. O minimo necessario e:

```cpp
struct DeviceConfig {
  String collarId;
  String serial;
  String activationCode;
  String bleServiceUuid;
  String apiBaseUrl;
  String sharedSecret;
};
```

Sugestao de persistencia:

- `Preferences.h` para NVS
- `LittleFS` se precisar fila offline mais robusta

## Passo 4 - Fazer o Arduino anunciar BLE

O app encontra a coleira pelo `ble_service_uuid`. Se o dispositivo nao anunciar esse UUID, a conexao BLE falha.

Exemplo minimo:

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLEAdvertising.h>

void setupBleAdvertising(const String& serviceUuid, const String& deviceName) {
  BLEDevice::init(deviceName.c_str());
  BLEServer* server = BLEDevice::createServer();
  server->createService(BLEUUID(serviceUuid.c_str()));

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BLEUUID(serviceUuid.c_str()));
  advertising->setScanResponse(true);
  advertising->start();
}
```

Recomendacao pratica:

- nomeie o dispositivo com algo reconhecivel, por exemplo `COL-1000-TEST`
- mantenha o advertising `connectable`

## Passo 5 - Enviar GPS para o Supabase

O dispositivo nao envia GPS diretamente para tabela. Ele envia para a Edge Function `ingest-gps`.

Endpoint:

`POST {api_base_url}/ingest-gps`

Payload esperado:

```json
{
  "collar_id": "918590ce-2118-409f-80d7-24d46dc6c167",
  "lat": -22.8832,
  "lng": -43.1034,
  "battery": 87,
  "ts": "2026-03-13T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

### Regra da assinatura

A assinatura deve ser calculada em cima desta string canonical:

```txt
collar_id|lat|lng|ts
```

Exemplo:

```txt
918590ce-2118-409f-80d7-24d46dc6c167|-22.8832|-43.1034|2026-03-13T18:00:00Z
```

### Exemplo de HMAC SHA-256 no ESP32

```cpp
#include "mbedtls/md.h"

String hmacSha256Hex(const String& key, const String& msg) {
  unsigned char hmac[32];
  const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (!md) return "";

  int rc = mbedtls_md_hmac(
    md,
    (const unsigned char*)key.c_str(), key.length(),
    (const unsigned char*)msg.c_str(), msg.length(),
    hmac
  );
  if (rc != 0) return "";

  char out[65];
  for (int i = 0; i < 32; i++) {
    sprintf(&out[i * 2], "%02x", hmac[i]);
  }
  out[64] = '\0';
  return String(out);
}
```

### Exemplo de POST do GPS

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

struct GpsSample {
  double lat;
  double lng;
  int battery;
  String tsIso;
};

String buildCanonical(const DeviceConfig& cfg, const GpsSample& s) {
  char buf[256];
  snprintf(buf, sizeof(buf), "%s|%.6f|%.6f|%s",
           cfg.collarId.c_str(), s.lat, s.lng, s.tsIso.c_str());
  return String(buf);
}

bool postIngestGps(const DeviceConfig& cfg, const GpsSample& s, int& statusCode) {
  String canonical = buildCanonical(cfg, s);
  String signature = hmacSha256Hex(cfg.sharedSecret, canonical);
  if (signature.length() == 0) return false;

  StaticJsonDocument<384> doc;
  doc["collar_id"] = cfg.collarId;
  doc["lat"] = s.lat;
  doc["lng"] = s.lng;
  doc["battery"] = s.battery;
  doc["ts"] = s.tsIso;
  doc["signature"] = signature;

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(cfg.apiBaseUrl + "/ingest-gps");
  http.addHeader("Content-Type", "application/json");
  statusCode = http.POST(body);
  http.end();

  return statusCode == 200;
}
```

## Passo 6 - Vincular a coleira pelo app

O fluxo de vinculacao nao e feito pelo Arduino. Ele e feito pelo app via `register-collar`.

Fluxo:

1. o usuario entra na tela de configuracao
2. escolhe o pet
3. informa `serial` e `activation_code`
4. o app chama `register-collar`
5. o backend valida os dados e associa a coleira ao `pet_id`
6. o app recebe `collar_id`, `serial` e `ble_service_uuid`

Payload enviado pelo app:

```json
{
  "pet_id": "uuid-do-pet",
  "serial": "COL-1000-TEST",
  "activation_code": "100001"
}
```

Por isso, `serial` e `activation_code` precisam estar corretos no banco antes do teste.

## Passo 7 - Validar o funcionamento

Checklist minimo:

1. o Arduino sobe o BLE com o `ble_service_uuid` esperado
2. o app encontra a coleira na tela BLE
3. o usuario ativa a coleira com `serial` + `activation_code`
4. o Arduino envia `POST /ingest-gps`
5. a funcao responde `200`
6. surgem registros em `public.gps_events`
7. a coluna `public.collars.last_seen` passa a atualizar
8. a tela GPS do app mostra os eventos

## Erros mais comuns

### `401 assinatura_invalida`

Causa provavel:

- `shared_secret` diferente entre Arduino e Supabase
- canonical montada de forma diferente
- formato de `lat` e `lng` inconsistente
- `ts` enviado diferente do `ts` usado no HMAC

### `404 coleira_nao_encontrada`

Causa provavel:

- `collar_id` nao existe em `public.collars`

### `400 serial_ou_codigo_invalido` no app

Causa provavel:

- `serial` ou `activation_code` cadastrados no banco nao batem com o que foi digitado

### BLE nao aparece no app

Causa provavel:

- `ble_service_uuid` diferente
- advertising nao conectavel
- BLE nao iniciou corretamente no dispositivo

## Recomendacoes de firmware

- manter fila offline para nao perder eventos sem rede
- usar backoff quando o POST falhar
- nao logar `shared_secret` em producao
- separar segredo por ambiente
- considerar OTA para rotacao de credenciais

## Arquivos de referencia no projeto

Se quiser aprofundar ou comparar com a implementacao atual:

- `IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md`
- `PASSO_A_PASSO_CONFIGURAR_E_CONECTAR_COLEIRA.md`
- `supabase/functions/ingest-gps/index.ts`
- `supabase/functions/register-collar/index.ts`
- `supabase/sql/schema.sql`
