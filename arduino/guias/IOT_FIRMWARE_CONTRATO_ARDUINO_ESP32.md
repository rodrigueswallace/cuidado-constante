# Contrato de Firmware - Arduino-ESP32

Atualizado em: 2026-05-31

## 1) Objetivo

Implementar firmware da coleira usando framework Arduino no ESP32 para:

1. Enviar GPS assinado para `ingest-gps`.
2. Anunciar BLE para deteccao/conexao no app.
3. Opcionalmente receber nome BLE configurado pelo app.

## 2) Bibliotecas recomendadas

1. Rede HTTP: `WiFi.h`, `HTTPClient.h`.
2. JSON: `ArduinoJson`.
3. HMAC SHA-256: `mbedtls/md.h`.
4. BLE: `BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLEAdvertising.h`.
5. Persistencia local: `Preferences.h`.

## 3) Configuracao persistente

Salvar em `Preferences` ou equivalente:

1. `collar_id`
2. `serial`
3. `activation_code`
4. `ble_service_uuid`
5. `api_base_url` (`https://<project-ref>.supabase.co/functions/v1`)
6. `shared_secret`
7. opcional: nome BLE configurado pelo app

## 4) Contrato HTTP do GPS

Endpoint:

```text
POST {api_base_url}/ingest-gps
```

Body JSON:

```json
{
  "collar_id": "uuid",
  "lat": -22.883200,
  "lng": -43.103400,
  "battery": 87,
  "ts": "2026-05-31T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

Canonical para assinatura:

```text
collar_id|lat|lng|ts
```

O valor de `shared_secret` deve ser igual ao secret `COLLAR_SHARED_SECRET` da Edge Function.

## 5) Exemplo base

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
  int battery;
  String tsIso;
};
```

## 6) HMAC SHA-256

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
  for (int i = 0; i < 32; i++) sprintf(&out[i * 2], "%02x", hmac[i]);
  out[64] = '\0';
  return String(out);
}
```

## 7) Payload e POST

```cpp
String buildCanonical(const DeviceConfig& cfg, const GpsSample& s) {
  char buf[256];
  snprintf(buf, sizeof(buf), "%s|%.6f|%.6f|%s", cfg.collarId.c_str(), s.lat, s.lng, s.tsIso.c_str());
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

## 8) BLE advertising

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

## 9) Nome BLE configuravel pelo app

Se o app for configurar o nome BLE da coleira, o firmware deve implementar um service/characteristic de escrita com resposta.

Os UUIDs precisam bater com o `.env` do app:

1. `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID`
2. `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID`

Ao receber escrita nessa characteristic:

1. validar tamanho do nome
2. salvar em `Preferences`
3. atualizar/reiniciar advertising conforme a biblioteca BLE usada
4. reaplicar o nome apos reboot

## 10) Loop principal sugerido

```cpp
void loop() {
  // 1) Ler GPS
  // 2) Montar ts ISO8601 UTC
  // 3) Ler bateria
  // 4) postIngestGps(...)
  // 5) Se falhar, enfileirar localmente
  // 6) Tentar flush da fila quando online
  delay(30000);
}
```

## 11) Criterios de aceite

1. Retorno 200 em `ingest-gps` com assinatura correta.
2. Retorno 401 com assinatura alterada.
3. BLE visivel no app com nome esperado.
4. Em falta de rede, evento nao e perdido.
5. Ao retornar rede, fila e reenviada.
6. Se nome BLE configuravel estiver habilitado, o nome persiste apos reboot.

## 12) Seguranca minima

1. Nao logar `shared_secret` em serial monitor de producao.
2. Nao expor segredo por BLE.
3. Nao colocar `shared_secret` em variaveis `EXPO_PUBLIC_*`.
4. Separar segredos por ambiente.
5. Planejar OTA ou outro mecanismo para rotacao de segredo.