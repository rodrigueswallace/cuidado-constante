# Contrato de Firmware IoT (JSON + Pseudocodigo C/ESP32)

Atualizado em: 2026-02-28

## 1) Escopo

Este contrato define o comportamento minimo do firmware da coleira para integrar com:

1. `ingest-gps` (envio de localizacao assinada por HMAC)
2. BLE advertising/conexao para app mobile

## 2) Configuracao persistente no dispositivo

```json
{
  "collar_id": "uuid",
  "serial": "COL-1234-ABCD",
  "activation_code": "654321",
  "ble_service_uuid": "0000fff0-0000-1000-8000-00805f9b34fb",
  "api_base_url": "https://<project-ref>.supabase.co/functions/v1",
  "shared_secret": "SEGREDO_HMAC"
}
```

## 3) Contrato HTTP - `ingest-gps`

### Request

`POST {api_base_url}/ingest-gps`

Headers:

```http
Content-Type: application/json
```

Body:

```json
{
  "collar_id": "uuid",
  "lat": -22.8832,
  "lng": -43.1034,
  "battery": 87,
  "ts": "2026-02-28T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

### Canonical para assinatura

```text
canonical = "collar_id|lat|lng|ts"
signature = HMAC_SHA256_HEX(shared_secret, canonical)
```

### Response esperada

- `200`: `{"ok":true}`
- `400`: payload invalido
- `401`: assinatura invalida
- `404`: coleira nao encontrada
- `500`: erro interno

## 4) Contrato BLE

Firmware deve:

1. anunciar BLE connectable
2. anunciar `ble_service_uuid`
3. manter nome BLE estavel (recomendado `CC-XXXX`)
4. opcional: expor bateria via characteristic

## 5) Regras de envio GPS (firmware)

1. Intervalo recomendado: 15s a 60s (configuravel).
2. Retry exponencial em falhas de rede.
3. Buffer local de eventos quando offline.
4. Nao descartar evento sem pelo menos 1 tentativa.

## 6) Pseudocodigo C/ESP32 (referencia)

```c
// Estruturas basicas
typedef struct {
  char collar_id[64];
  char serial[32];
  char activation_code[16];
  char ble_service_uuid[64];
  char api_base_url[128];
  char shared_secret[128];
} DeviceConfig;

typedef struct {
  double lat;
  double lng;
  int battery;          // 0..100, -1 se desconhecido
  char ts_iso[32];      // ex: 2026-02-28T18:00:00Z
} GpsSample;

void build_canonical(char *out, size_t out_len, const DeviceConfig *cfg, const GpsSample *s) {
  // IMPORTANTE: manter mesmo formato enviado no JSON para lat/lng/ts
  snprintf(out, out_len, "%s|%.6f|%.6f|%s", cfg->collar_id, s->lat, s->lng, s->ts_iso);
}

void compute_signature_hex(char *out_hex, size_t out_len, const char *secret, const char *canonical) {
  // usar mbedtls HMAC-SHA256 e converter para hex
  // out_hex precisa de 65 bytes (64 hex + terminador)
}

bool post_ingest_gps(const DeviceConfig *cfg, const GpsSample *s) {
  char canonical[256];
  char sig_hex[65];
  char url[192];
  char body[512];

  build_canonical(canonical, sizeof(canonical), cfg, s);
  compute_signature_hex(sig_hex, sizeof(sig_hex), cfg->shared_secret, canonical);

  snprintf(url, sizeof(url), "%s/ingest-gps", cfg->api_base_url);
  snprintf(body, sizeof(body),
    "{\"collar_id\":\"%s\",\"lat\":%.6f,\"lng\":%.6f,\"battery\":%d,\"ts\":\"%s\",\"signature\":\"%s\"}",
    cfg->collar_id, s->lat, s->lng, s->battery, s->ts_iso, sig_hex
  );

  // HTTP POST JSON (Wi-Fi/4G)
  // return true se status 200
  return http_post_json(url, body) == 200;
}

void gps_loop(const DeviceConfig *cfg) {
  while (1) {
    GpsSample s;
    if (!read_gps(&s.lat, &s.lng)) {
      delay_ms(5000);
      continue;
    }

    s.battery = read_battery_percent(); // -1 se sem sensor
    build_utc_iso8601(s.ts_iso, sizeof(s.ts_iso));

    bool ok = post_ingest_gps(cfg, &s);
    if (!ok) {
      queue_event_locally(&s); // fallback offline
    }

    flush_local_queue_if_online(cfg); // reenviar pendentes
    delay_ms(30000); // exemplo: 30s
  }
}
```

## 7) Pseudocodigo BLE (ESP32)

```c
void ble_init(const DeviceConfig *cfg) {
  ble_stack_init();
  ble_set_device_name("CC-1234");
  ble_add_primary_service(cfg->ble_service_uuid);
  // opcional: battery service/characteristic
  ble_start_advertising_connectable();
}
```

## 8) Criterios de aceite (QA)

1. `ingest-gps` retorna 200 com payload assinado valido.
2. Payload com assinatura alterada retorna 401.
3. BLE visivel no scan do app.
4. App conecta no dispositivo sem desconexao imediata.
5. Em offline, evento fica em fila local e reenvia ao voltar rede.
