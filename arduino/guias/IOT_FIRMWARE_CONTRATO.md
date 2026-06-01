# Contrato de Firmware IoT (JSON + Pseudocodigo C/ESP32)

Atualizado em: 2026-05-31

## 1) Escopo

Este contrato define o comportamento minimo do firmware da coleira para integrar com:

1. `ingest-gps` para envio de localizacao assinada por HMAC.
2. BLE advertising/conexao para o app mobile.
3. Opcionalmente, configuracao de nome BLE pelo app.

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

`shared_secret` deve ser o mesmo valor configurado no Supabase como `COLLAR_SHARED_SECRET`.

## 3) Contrato HTTP - `ingest-gps`

Endpoint:

```text
POST {api_base_url}/ingest-gps
```

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
  "ts": "2026-05-31T18:00:00Z",
  "signature": "hex_hmac_sha256"
}
```

Canonical para assinatura:

```text
canonical = "collar_id|lat|lng|ts"
signature = HMAC_SHA256_HEX(shared_secret, canonical)
```

Responses esperadas:

- `200`: `{"ok":true}`
- `400`: payload invalido
- `401`: assinatura invalida
- `404`: coleira nao encontrada
- `500`: erro interno ou function sem secret

## 4) Contrato BLE

Firmware deve:

1. anunciar BLE connectable
2. anunciar `ble_service_uuid`
3. manter nome BLE estavel, recomendado `CC-XXXX`
4. opcionalmente expor bateria via characteristic
5. opcionalmente expor characteristic de escrita para configurar o nome BLE pelo app

Para nome BLE configuravel, o firmware deve expor:

1. service UUID igual ao `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID` do app
2. characteristic UUID igual ao `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID` do app
3. escrita com resposta (`write with response`)
4. persistencia do nome em NVS/Preferences
5. reaplicacao do nome no proximo advertising/reboot

Essa configuracao nao substitui o `ble_service_uuid` usado para scan/conexao.

## 5) Regras de envio GPS

1. Intervalo recomendado: 15s a 60s, configuravel.
2. Retry exponencial em falhas de rede.
3. Buffer local de eventos quando offline.
4. Nao descartar evento sem pelo menos 1 tentativa.
5. Usar exatamente o mesmo formato de `lat` e `lng` no JSON e no canonical.

## 6) Pseudocodigo C/ESP32

```c
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
  int battery;
  char ts_iso[32];
} GpsSample;

void build_canonical(char *out, size_t out_len, const DeviceConfig *cfg, const GpsSample *s) {
  snprintf(out, out_len, "%s|%.6f|%.6f|%s", cfg->collar_id, s->lat, s->lng, s->ts_iso);
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

  return http_post_json(url, body) == 200;
}
```

## 7) Criterios de aceite

1. `ingest-gps` retorna 200 com payload assinado valido.
2. Payload com assinatura alterada retorna 401.
3. BLE aparece no scan do app.
4. App conecta no dispositivo sem desconexao imediata.
5. Em offline, evento fica em fila local e reenvia ao voltar rede.
6. Se nome BLE configuravel estiver habilitado, o nome persiste apos reboot.

## 8) Seguranca

1. Nao logar `shared_secret` em serial monitor de producao.
2. Nao expor segredo por BLE.
3. Nao colocar `shared_secret` em variaveis `EXPO_PUBLIC_*`.
4. Separar segredos por ambiente.
5. Planejar OTA ou outro mecanismo para rotacao de segredo.