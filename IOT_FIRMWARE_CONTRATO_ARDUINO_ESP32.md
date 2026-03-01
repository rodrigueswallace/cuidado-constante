# Contrato de Firmware - Arduino-ESP32

Atualizado em: 2026-02-28

## 1) Objetivo

Implementar firmware da coleira usando framework Arduino no ESP32 para:

1. Enviar GPS assinado para `ingest-gps`.
2. Anunciar BLE para detecção/conexão no app.

## 2) Bibliotecas recomendadas (Arduino)

1. Rede HTTP:
- `WiFi.h`
- `HTTPClient.h`

2. JSON:
- `ArduinoJson`

3. HMAC SHA-256:
- `mbedtls/md.h` (já disponível no core ESP32)

4. BLE:
- `BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLEAdvertising.h`

5. Persistência local:
- `Preferences.h` (NVS)

## 3) Configuração persistente no dispositivo

Salvar em `Preferences` (namespace `device_cfg`):

1. `collar_id` (UUID)
2. `serial`
3. `activation_code`
4. `ble_service_uuid`
5. `api_base_url` (`https://<project-ref>.supabase.co/functions/v1`)
6. `shared_secret`

## 4) Contrato HTTP do GPS

Endpoint:

`POST {api_base_url}/ingest-gps`

Body JSON:

```json
{
  "collar_id": "uuid",
  "lat": -22.883200,
  "lng": -43.103400,
  "battery": 87,
  "ts": "2026-02-28T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

Canonical para assinatura:

`collar_id|lat|lng|ts`

## 5) Exemplo base (Arduino)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "mbedtls/md.h"
#include <BLEDevice.h>

struct DeviceConfig {
  String collarId;
  String serial;
  String activationCode;
  String bleServiceUuid;
  String apiBaseUrl;
  String sharedSecret;
};

struct GpsSample {
  double lat;
  double lng;
  int battery;       // -1 se indisponivel
  String tsIso;      // ISO8601 UTC
};
```

## 6) HMAC SHA-256 (Arduino ESP32)

```cpp
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

## 7) Montar canonical + payload JSON

```cpp
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
```

## 8) POST para ingest-gps (Arduino)

```cpp
bool postIngestGps(const DeviceConfig& cfg, const GpsSample& s, int& statusCode) {
  String canonical = buildCanonical(cfg, s);
  String signature = hmacSha256Hex(cfg.sharedSecret, canonical);
  if (signature.length() == 0) return false;

  String body = buildPayloadJson(cfg, s, signature);
  String url = cfg.apiBaseUrl + "/ingest-gps";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  statusCode = http.POST(body);
  String resp = http.getString();
  http.end();

  return statusCode == 200;
}
```

## 9) BLE advertising (Arduino ESP32)

```cpp
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

## 10) Loop principal sugerido

```cpp
void loop() {
  // 1) Ler GPS
  // 2) Montar ts ISO8601 UTC
  // 3) Ler bateria
  // 4) postIngestGps(...)
  // 5) Se falhar, enfileirar localmente
  // 6) Tentar flush da fila quando online
  delay(30000); // ex: 30s
}
```

## 11) Fila offline (recomendado)

1. Guardar últimos N eventos em memória + persistência leve (Preferences/LittleFS).
2. Tentar reenviar em cada ciclo de loop quando rede estiver disponível.
3. Usar backoff em erro de rede.

## 12) Critérios de aceite

1. Retorno 200 em `ingest-gps` com assinatura correta.
2. Retorno 401 com assinatura alterada (teste negativo).
3. BLE visível no app com nome esperado.
4. Em falta de rede, evento não é perdido.
5. Ao retornar rede, fila é reenviada.

## 13) Segurança mínima

1. Não logar `shared_secret` em serial monitor de produção.
2. Não expor segredo por BLE.
3. Separar segredos por ambiente (homolog/prod).
4. Planejar atualização OTA para rotação de segredo.
