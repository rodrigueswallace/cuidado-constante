# Guia Detalhado - Arduino/ESP32 com `ingest-gps` e `ingest-ble`

Atualizado em: 2026-05-27

## 1) Objetivo deste guia

Este arquivo explica, em passo a passo detalhado, como integrar um firmware Arduino/ESP32 com as Edge Functions do projeto:

1. `ingest-gps`
2. `ingest-ble`

Tambem explica:

1. quais dados precisam existir no Supabase antes do teste
2. quais segredos/configuracoes precisam bater entre dispositivo e backend
3. o que o Arduino pode chamar diretamente
4. o que nao deve ser chamado diretamente do Arduino no desenho atual
5. como validar e diagnosticar erros

## 2) Resumo importante antes de comecar

### `ingest-gps`

Esta function foi desenhada para ser chamada pelo dispositivo.

Ela recebe:

1. `collar_id`
2. `lat`
3. `lng`
4. `battery`
5. `ts`
6. `signature`

Ela valida a assinatura HMAC usando `COLLAR_SHARED_SECRET`.

### `ingest-ble`

No estado atual do projeto, esta function **nao foi desenhada para ser chamada diretamente pelo Arduino**.

Motivo:

1. ela exige `Authorization: Bearer <JWT do usuario>`
2. ela valida se a coleira pertence ao usuario autenticado
3. o firmware da coleira nao deve armazenar JWT de usuario

Conclusao pratica:

1. `ingest-gps`: o Arduino chama direto
2. `ingest-ble`: o app mobile chama, nao o Arduino

Se voce quiser que o Arduino envie BLE diretamente para o backend, sera preciso mudar a arquitetura da `ingest-ble`.

## 3) Arquivos do projeto que definem o comportamento

As regras abaixo vem destes arquivos:

1. [supabase/functions/ingest-gps/index.ts](../../supabase/functions/ingest-gps/index.ts)
2. [supabase/functions/ingest-ble/index.ts](../../supabase/functions/ingest-ble/index.ts)
3. [IOT_FIRMWARE_CONTRATO.md](IOT_FIRMWARE_CONTRATO.md)
4. [IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md](IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md)

## 4) Visao geral do fluxo correto

### Fluxo GPS

1. O dispositivo le GPS
2. O dispositivo monta timestamp UTC ISO8601
3. O dispositivo monta a string canonical
4. O dispositivo calcula a assinatura HMAC SHA-256 em hex
5. O dispositivo envia `POST /functions/v1/ingest-gps`
6. O backend valida a assinatura
7. O backend grava em `gps_events`
8. O backend atualiza `collars.last_seen` e `collars.battery`

### Fluxo BLE no desenho atual do projeto

1. O Arduino anuncia BLE
2. O app escaneia e conecta
3. O app mede RSSI e eventualmente bateria
4. O app autenticado chama `ingest-ble`
5. O backend grava em `ble_events`

## 5) O que precisa existir no Supabase antes do primeiro teste

Antes de ligar o Arduino, confirme que estes itens existem:

1. projeto Supabase criado
2. migrations aplicadas
3. Edge Functions publicadas
4. secrets configurados
5. registro da coleira em `public.collars`

### 5.1) Deploy e secrets obrigatorios

Voce precisa ter no Supabase:

1. `COLLAR_SHARED_SECRET`
2. `SUPABASE_URL`
3. `SUPABASE_ANON_KEY`
4. `SUPABASE_SERVICE_ROLE_KEY`

E a function `ingest-gps` precisa estar deployada.

### 5.2) Cadastro da coleira no banco

O `collar_id` que o Arduino usar precisa existir no banco.

Exemplo:

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

Observacao importante:

1. `collar_id` do Arduino precisa ser exatamente o `id` dessa linha
2. `shared_secret` no Arduino precisa ser o mesmo `COLLAR_SHARED_SECRET` do ambiente

## 6) Configuracao persistente que o Arduino precisa guardar

Idealmente em `Preferences` ou estrutura equivalente:

```json
{
  "collar_id": "918590ce-2118-409f-80d7-24d46dc6c167",
  "serial": "COL-1000-TEST",
  "activation_code": "100001",
  "ble_service_uuid": "0000fff0-0000-1000-8000-00805f9b34fb",
  "api_base_url": "https://SEU_PROJECT_REF.supabase.co/functions/v1",
  "shared_secret": "SEU_SEGREDO_HMAC"
}
```

## 7) Passo a passo detalhado para `ingest-gps`

## 7.1) Confirmar a URL base correta

A URL base precisa ser:

```txt
https://<project-ref>.supabase.co/functions/v1
```

O endpoint final sera:

```txt
https://<project-ref>.supabase.co/functions/v1/ingest-gps
```

Erro comum:

1. usar a URL da API REST do Supabase em vez de `/functions/v1`

## 7.2) Montar o payload com tipos corretos

O backend espera:

```json
{
  "collar_id": "uuid",
  "lat": -23.561234,
  "lng": -46.654321,
  "battery": 81,
  "ts": "2026-05-27T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

Detalhes importantes:

1. `lat` deve ser numero
2. `lng` deve ser numero
3. `battery` pode ser numero ou `null`
4. `ts` deve ser string ISO8601 UTC
5. `signature` deve ser string hexadecimal minuscula

## 7.3) Montar a string canonical exatamente do jeito esperado

O backend faz esta validacao:

```txt
canonical = collar_id|lat|lng|ts
```

Exemplo:

```txt
918590ce-2118-409f-80d7-24d46dc6c167|-23.561234|-46.654321|2026-05-27T18:00:00Z
```

Isto e critico:

1. o `lat` na assinatura precisa bater com o `lat` enviado no JSON
2. o `lng` na assinatura precisa bater com o `lng` enviado no JSON
3. o `ts` na assinatura precisa bater com o `ts` enviado no JSON

Erro comum:

1. assinar com `%.6f` e enviar com outro formato
2. assinar com virgula decimal e enviar com ponto decimal
3. usar horario local em vez de UTC

## 7.4) Calcular a assinatura HMAC SHA-256

Regra:

```txt
signature = HMAC_SHA256_HEX(shared_secret, canonical)
```

Exemplo Arduino:

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

## 7.5) Enviar o POST HTTP

Exemplo Arduino:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

struct DeviceConfig {
  String collarId;
  String apiBaseUrl;
  String sharedSecret;
};

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

String buildPayloadJson(const DeviceConfig& cfg, const GpsSample& s, const String& signature) {
  StaticJsonDocument<384> doc;
  doc["collar_id"] = cfg.collarId;
  doc["lat"] = s.lat;
  doc["lng"] = s.lng;
  doc["battery"] = s.battery;
  doc["ts"] = s.tsIso;
  doc["signature"] = signature;

  String body;
  serializeJson(doc, body);
  return body;
}

bool postIngestGps(const DeviceConfig& cfg, const GpsSample& s, int& statusCode, String& responseBody) {
  String canonical = buildCanonical(cfg, s);
  String signature = hmacSha256Hex(cfg.sharedSecret, canonical);
  if (signature.length() == 0) return false;

  String body = buildPayloadJson(cfg, s, signature);
  String url = cfg.apiBaseUrl + "/ingest-gps";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  statusCode = http.POST(body);
  responseBody = http.getString();
  http.end();

  return statusCode == 200;
}
```

## 7.6) O que conferir no monitor serial

Durante o teste, logue:

1. URL final do POST
2. `canonical`
3. `signature`
4. status HTTP
5. corpo da resposta

Nao logue isso em producao:

1. `shared_secret`

Exemplo de debug:

```cpp
Serial.println("POST /ingest-gps");
Serial.println("canonical=" + canonical);
Serial.println("signature=" + signature);
Serial.printf("status=%d\n", statusCode);
Serial.println("response=" + responseBody);
```

## 7.7) Respostas esperadas e significado

### `200 {"ok":true}`

Significa:

1. assinatura valida
2. coleira encontrada
3. evento gravado

### `400 {"error":"payload_invalido"}`

Possiveis causas:

1. faltou `collar_id`
2. `lat` nao e numero
3. `lng` nao e numero
4. faltou `ts`
5. faltou `signature`

### `401 {"error":"assinatura_invalida"}`

Possiveis causas:

1. `shared_secret` errado
2. `canonical` montado errado
3. `lat/lng/ts` assinados diferentes dos enviados
4. assinatura em formato errado

### `404 {"error":"coleira_nao_encontrada"}`

Possiveis causas:

1. `collar_id` nao existe em `public.collars`

### `500`

Possiveis causas:

1. `COLLAR_SHARED_SECRET` nao configurado no Supabase
2. erro interno na function
3. falha ao gravar no banco

## 8) Checklist de validacao do `ingest-gps`

1. o ESP32 tem internet
2. o `api_base_url` termina com `/functions/v1`
3. o `collar_id` existe no banco
4. o `shared_secret` do Arduino bate com o do Supabase
5. o `ts` esta em UTC
6. `lat` e `lng` sao enviados no mesmo formato usado na assinatura
7. o status HTTP aparece no serial

## 9) Passo a passo detalhado para BLE

## 9.1) O que o firmware deve fazer no BLE

No desenho atual, o papel do firmware e:

1. anunciar BLE
2. usar nome estavel
3. anunciar `ble_service_uuid`
4. opcionalmente expor characteristic de bateria

O firmware **nao precisa chamar `ingest-ble`**.

Quem chama `ingest-ble` e o app mobile autenticado.

## 9.2) Como o backend `ingest-ble` funciona hoje

A function atual exige:

1. `Authorization: Bearer <JWT do usuario>`
2. payload com `collar_id`
3. payload com `rssi`
4. payload com `ts`

Exemplo de payload aceito:

```json
{
  "collar_id": "uuid",
  "rssi": -63,
  "battery": 79,
  "ts": "2026-05-27T18:02:00Z"
}
```

Mas o JWT vem do app, nao do Arduino.

## 9.3) O que o Arduino deve fazer para o app conseguir usar `ingest-ble`

O Arduino deve:

1. iniciar o stack BLE
2. definir nome do dispositivo, por exemplo `CC-1234`
3. anunciar `ble_service_uuid`
4. aceitar conexao

Exemplo:

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

## 9.4) O que o app fara depois

O app:

1. escaneia dispositivos BLE
2. conecta no dispositivo
3. le RSSI
4. opcionalmente le bateria
5. envia os dados para `ingest-ble`

Entao, para BLE funcionar fim a fim, o firmware precisa focar em:

1. advertising estavel
2. nome consistente
3. UUID correto
4. conexao sem cair

## 10) Se voce quiser que o Arduino chame `ingest-ble` diretamente

Hoje isso nao fecha com a seguranca do projeto.

Problema:

1. o backend espera JWT do usuario
2. o Arduino nao deve guardar credencial de sessao de usuario

Se insistir nesse desenho, tera de mudar a function para um modelo parecido com `ingest-gps`, por exemplo:

1. autenticacao por HMAC do dispositivo
2. validacao por `collar_id` e assinatura
3. sem dependencia de JWT do usuario

Enquanto isso nao for feito, o correto e:

1. Arduino anunciar BLE
2. app chamar `ingest-ble`

## 11) Sequencia recomendada de testes

## 11.1) Primeiro testar apenas GPS

1. ligue o Arduino com internet funcional
2. force um ponto fixo de teste
3. envie 1 POST para `ingest-gps`
4. veja se retorna `200`

Nao misture BLE nesse primeiro teste.

## 11.2) Depois testar BLE sem backend

1. ligue o BLE advertising
2. abra o app
3. faca scan BLE
4. confirme que o dispositivo aparece
5. conecte

So depois disso pense em `ingest-ble`.

## 11.3) Depois validar o `ingest-ble` pelo app

1. usuario logado no app
2. coleira ativa configurada
3. scan BLE
4. conectar no dispositivo
5. ver se o app envia evento BLE ao backend

## 12) Diagnostico de erros comuns

## 12.1) GPS retorna `401 assinatura_invalida`

Checklist:

1. confira `shared_secret`
2. confira se a string canonical esta identica ao esperado
3. confira o formato de `lat` e `lng`
4. confira se `ts` foi alterado entre assinatura e envio

## 12.2) GPS retorna `404 coleira_nao_encontrada`

Checklist:

1. confira `collar_id`
2. confira se a linha existe em `public.collars`

## 12.3) App nao encontra o BLE

Checklist:

1. advertising realmente iniciado
2. UUID correto
3. nome BLE estavel
4. permissao BLE/localizacao no celular
5. distancia pequena durante o teste

## 12.4) App encontra, mas nao conecta

Checklist:

1. BLE connectable ativado
2. service UUID anunciado corretamente
3. firmware nao reiniciando
4. alimentacao do dispositivo estavel

## 12.5) `ingest-ble` retorna `401`

No desenho atual, isso normalmente significa:

1. o app nao enviou JWT
2. a sessao do usuario expirou

Nao e um erro para resolver no Arduino.

## 13) Recomendacao pratica de implementacao

Se voce quer colocar isso de pe com o menor risco:

1. implemente primeiro `ingest-gps`
2. deixe o BLE apenas para advertising/conexao
3. use o app para `ingest-ble`
4. so mude o backend de BLE se houver necessidade real de o dispositivo enviar isso sozinho

## 14) Modelo minimo de aceite

### GPS

1. `POST /ingest-gps` retorna `200`
2. `gps_events` recebe a linha
3. `collars.last_seen` atualiza

### BLE

1. app encontra o dispositivo no scan
2. app conecta sem desconectar imediatamente
3. app consegue medir RSSI
4. app envia `ingest-ble` com usuario autenticado

## 15) Conclusao

O ponto mais importante deste guia e:

1. `ingest-gps` e fluxo de dispositivo
2. `ingest-ble` hoje e fluxo de app autenticado

Se voce respeitar isso, a integracao fica coerente com o backend atual e evita erro de autenticacao e modelagem.
