# Guia Passo a Passo: Integrar Arduino/ESP32 com Supabase para Enviar GPS

Atualizado em: 2026-05-31

## Objetivo

No final deste guia, o seu Arduino/ESP32 deve:

1. ter uma `collar` cadastrada no Supabase
2. gerar o payload esperado pela Edge Function `ingest-gps`
3. assinar esse payload com HMAC SHA-256
4. fazer `POST` para o Supabase
5. gravar eventos em `public.gps_events`
6. permitir que o app mostre a localização da coleira

## Referências do repositório

Este guia foi montado com base nestes arquivos já existentes no projeto:

1. [supabase/functions/ingest-gps/index.ts](../../supabase/functions/ingest-gps/index.ts)
2. [IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md](IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md)
3. [PASSO_A_PASSO_CONFIGURAR_E_CONECTAR_COLEIRA.md](PASSO_A_PASSO_CONFIGURAR_E_CONECTAR_COLEIRA.md)
4. [GUIA_DETALHADO_ARDUINO_EDGE_FUNCTIONS.md](GUIA_DETALHADO_ARDUINO_EDGE_FUNCTIONS.md)
5. [supabase/sql/schema.sql](../../supabase/sql/schema.sql)

## Visão geral do fluxo

O fluxo correto é este:

1. cadastrar a coleira no banco
2. gravar no Arduino os mesmos dados da coleira
3. coletar latitude, longitude, bateria e timestamp
4. montar a assinatura HMAC
5. enviar o `POST` para `ingest-gps`
6. ativar a coleira no app com `serial + código de ativação`
7. visualizar a posição no app

## Etapa 1: Cadastrar a coleira no banco

Antes de qualquer envio GPS, a `collar` precisa existir no banco.

Abra o Supabase SQL Editor e rode:

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

Campos importantes:

1. `id`: será o `collar_id` do firmware
2. `serial`: usado no app para ativar a coleira
3. `activation_code`: usado no app para ativar a coleira
4. `ble_service_uuid`: UUID BLE anunciado pela coleira
5. `pet_id`: começa como `null`

## Etapa 2: Separar os dados que o firmware precisa

O firmware precisa destes dados:

1. `collar_id`
2. `serial`
3. `activation_code`
4. `ble_service_uuid`
5. `api_base_url`
6. `shared_secret`

Os dois campos abaixo são obrigatórios:

1. `api_base_url`: URL base do seu projeto Supabase para Edge Functions
2. `shared_secret`: segredo usado para assinar o GPS com HMAC SHA-256

Formato da URL:

```txt
https://<project-ref>.supabase.co/functions/v1
```

Exemplo:

```cpp
const char* COLLAR_ID = "918590ce-2118-409f-80d7-24d46dc6c167";
const char* SERIAL = "COL-1000-TEST";
const char* ACTIVATION_CODE = "100001";
const char* BLE_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const char* API_BASE_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1";
const char* SHARED_SECRET = "test";
```

Regra importante:

1. o que está no Arduino precisa bater com o que está no banco
2. o `SHARED_SECRET` precisa ser o mesmo segredo que a Edge Function `ingest-gps` usa para validar a assinatura

## Etapa 2.1: Descobrir a URL do Supabase e a secret

Você precisa de:

1. `project-ref` do Supabase
2. `shared secret` do ambiente

Exemplo de URL final:

```txt
https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1
```

No firmware, isso vira:

```cpp
const char* API_BASE_URL = "https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1";
```

Sobre a secret:

1. sim, você precisa mandar a assinatura gerada com a `secret`
2. a `secret` não vai no JSON como campo separado
3. ela é usada localmente no Arduino para gerar `signature`
4. essa `signature` é que vai no payload

Resumo:

1. o Arduino precisa conhecer a `shared secret`
2. o Supabase precisa ter a mesma `shared secret`
3. se elas forem diferentes, a Edge Function vai responder erro de assinatura

## Etapa 3: Instalar as bibliotecas necessárias

Para ESP32 com framework Arduino, use:

1. `WiFi.h`
2. `HTTPClient.h`
3. `ArduinoJson`
4. `mbedtls/md.h`
5. `Preferences.h`
6. opcionalmente BLE, se a coleira também anunciar Bluetooth

Base de referência:

1. [IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md](IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md)

## Etapa 4: Entender o endpoint correto

O endpoint é:

```txt
POST https://<project-ref>.supabase.co/functions/v1/ingest-gps
```

Não envie GPS direto para a tabela.

O envio deve passar pela Edge Function `ingest-gps`.

## Etapa 5: Montar o payload correto

O JSON esperado é:

```json
{
  "collar_id": "uuid-da-coleira",
  "lat": -23.561234,
  "lng": -46.654321,
  "battery": 81,
  "ts": "2026-05-31T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

Campos:

1. `collar_id`: UUID da coleira
2. `lat`: latitude
3. `lng`: longitude
4. `battery`: bateria
5. `ts`: timestamp ISO8601 UTC
6. `signature`: assinatura HMAC SHA-256

## Etapa 6: Montar a string canônica da assinatura

A assinatura não é feita sobre o JSON inteiro.

Ela é feita sobre esta string:

```txt
collar_id|lat|lng|ts
```

Exemplo:

```txt
918590ce-2118-409f-80d7-24d46dc6c167|-23.561234|-46.654321|2026-05-31T18:00:00Z
```

Esse formato precisa ser exato.

## Etapa 7: Implementar HMAC SHA-256 no ESP32

Exemplo:

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

## Etapa 8: Montar a canonical e o JSON

Exemplo:

```cpp
#include <ArduinoJson.h>

String buildCanonical(const String& collarId, double lat, double lng, const String& tsIso) {
  char buf[256];
  snprintf(buf, sizeof(buf), "%s|%.6f|%.6f|%s", collarId.c_str(), lat, lng, tsIso.c_str());
  return String(buf);
}

String buildPayloadJson(
  const String& collarId,
  double lat,
  double lng,
  int battery,
  const String& tsIso,
  const String& signature
) {
  StaticJsonDocument<384> doc;
  doc["collar_id"] = collarId;
  doc["lat"] = lat;
  doc["lng"] = lng;
  doc["battery"] = battery;
  doc["ts"] = tsIso;
  doc["signature"] = signature;

  String body;
  serializeJson(doc, body);
  return body;
}
```

## Etapa 9: Conectar o ESP32 à internet

Se for Wi-Fi:

```cpp
#include <WiFi.h>

const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASS = "SUA_SENHA";

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi conectado.");
}
```

Se for modem 4G, mantenha a mesma lógica de payload e POST. Só muda a camada de conectividade.

## Etapa 10: Fazer o POST para `ingest-gps`

Exemplo:

```cpp
#include <HTTPClient.h>

bool postIngestGps(
  const String& apiBaseUrl,
  const String& collarId,
  const String& sharedSecret,
  double lat,
  double lng,
  int battery,
  const String& tsIso,
  int& statusCode
) {
  String canonical = buildCanonical(collarId, lat, lng, tsIso);
  String signature = hmacSha256Hex(sharedSecret, canonical);
  if (signature.length() == 0) return false;

  String body = buildPayloadJson(collarId, lat, lng, battery, tsIso, signature);
  String url = apiBaseUrl + "/ingest-gps";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  statusCode = http.POST(body);

  String response = http.getString();
  Serial.print("HTTP status: ");
  Serial.println(statusCode);
  Serial.print("Resposta: ");
  Serial.println(response);

  http.end();
  return statusCode == 200;
}
```

## Etapa 11: Montar um teste mínimo no `setup` e `loop`

Exemplo:

```cpp
void setup() {
  Serial.begin(115200);
  connectWifi();
}

void loop() {
  double lat = -23.561234;
  double lng = -46.654321;
  int battery = 81;
  String tsIso = "2026-05-31T18:00:00Z";

  int statusCode = 0;
  bool ok = postIngestGps(
    API_BASE_URL,
    COLLAR_ID,
    SHARED_SECRET,
    lat,
    lng,
    battery,
    tsIso,
    statusCode
  );

  Serial.print("Envio GPS ok? ");
  Serial.println(ok ? "sim" : "nao");

  delay(30000);
}
```

Para produção:

1. troque `lat/lng` fixos pela leitura real do GPS
2. gere `ts` em UTC real
3. leia bateria real

## Etapa 12: Fazer upload e validar no Serial Monitor

Depois do upload:

1. abra o monitor serial
2. confirme que a internet conectou
3. confirme que o `POST` foi disparado
4. confirme que o status voltou `200`

Você deve ver algo como:

```txt
Wi-Fi conectado.
HTTP status: 200
Resposta: {"ok":true}
Envio GPS ok? sim
```

## Etapa 13: Confirmar no banco se o evento entrou

No SQL Editor:

```sql
select *
from public.gps_events
order by created_at desc
limit 20;
```

Se estiver tudo certo, os eventos aparecerão nessa consulta.

## Etapa 14: Ativar a coleira no app

Depois que a `collar` já existe no banco:

1. abra o app
2. vá para adicionar dispositivo
3. informe `serial`
4. informe `código de ativação`

Isso vincula a coleira ao pet.

## Etapa 15: Verificar a localização no app

Depois de vincular:

1. abra a tela GPS
2. atualize a posição
3. confirme se os eventos foram carregados

## Erros mais comuns

### 1. `assinatura_invalida`

Causas comuns:

1. a string `collar_id|lat|lng|ts` foi montada diferente
2. o `shared_secret` está errado
3. o `ts` usado na assinatura não é o mesmo do JSON

### 2. `coleira_nao_encontrada`

Causas comuns:

1. o `collar_id` não existe em `public.collars`
2. o UUID do firmware não bate com o UUID do banco

### 3. `payload_invalido`

Causas comuns:

1. faltou campo no JSON
2. `lat/lng` inválidos
3. `battery` em formato errado

### 4. `HTTP status` diferente de 200

Causas comuns:

1. URL errada
2. internet indisponível
3. JSON inválido
4. erro de assinatura

### 5. O app não mostra o GPS

Causas comuns:

1. a coleira não foi ativada no app
2. o evento entrou no banco, mas a `collar` ainda não está vinculada ao pet

## Checklist final

Antes de testar no app, confirme:

1. `collar` cadastrada no banco
2. `collar_id` do firmware igual ao banco
3. `serial` e `activation_code` iguais ao banco
4. `shared_secret` correto
5. `POST` indo para `/functions/v1/ingest-gps`
6. resposta `200`
7. eventos aparecendo em `public.gps_events`

## Próximo passo recomendado

Depois de validar o teste fixo:

1. integrar o módulo GPS real
2. gerar `ts` UTC real
3. ler bateria real
4. adicionar fila offline para não perder eventos sem rede

## Observação final

Se você quiser um firmware completo já montado para `ESP32 + GPS + ingest-gps`, use este guia junto com:

1. [IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md](IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md)
2. [GUIA_DETALHADO_ARDUINO_EDGE_FUNCTIONS.md](GUIA_DETALHADO_ARDUINO_EDGE_FUNCTIONS.md)
