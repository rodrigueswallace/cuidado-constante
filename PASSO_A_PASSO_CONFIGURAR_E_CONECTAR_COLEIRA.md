# Passo a Passo Mastigado - Configurar e Conectar Coleira (Arduino + App)

Atualizado em: 2026-02-28

## Objetivo

No final deste roteiro, sua coleira Arduino deve:

1. aparecer no BLE do app
2. conectar no app
3. enviar GPS e aparecer no mapa

---

## Etapa 1 - Separar os dados da coleira

Você precisa destes 6 dados:

1. `serial` (ex.: `COL-1000-TEST`)
2. `activation_code` (ex.: `100001`)
3. `ble_service_uuid` (UUID que o Arduino anuncia no BLE)
4. `collar_id` (UUID único da coleira)
5. `shared_secret` (segredo para assinar GPS)
6. `api_base_url` (ex.: `https://SEU_REF.supabase.co/functions/v1`)

Regra importante:
- Esses dados precisam bater entre **Arduino** e **Supabase**.

---

## Etapa 2 - Cadastrar a coleira no Supabase

Abra Supabase SQL Editor e rode:

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

Troque os valores pelos seus.

---

## Etapa 3 - Gravar os mesmos dados no Arduino

No firmware, configure:

1. `collar_id` = mesmo `id` do banco
2. `serial` = mesmo do banco
3. `activation_code` = mesmo do banco
4. `ble_service_uuid` = mesmo do banco
5. `api_base_url` = URL do seu projeto
6. `shared_secret` = segredo correto do ambiente

Se algum valor não bater, não conecta corretamente.

---

## Etapa 4 - Firmware mínimo que precisa existir

No Arduino precisa ter:

1. BLE advertising `connectable`
2. anúncio do `ble_service_uuid`
3. leitura GPS (`lat/lng`)
4. geração de `ts` em UTC ISO8601
5. assinatura HMAC SHA-256 de:
- `collar_id|lat|lng|ts`
6. POST para:
- `{api_base_url}/ingest-gps`

Referência técnica:
- `IOT_FIRMWARE_CONTRATO_ARDUINO_ESP32.md`

---

## Etapa 5 - Subir firmware e validar no Serial Monitor

Depois do upload, verifique no monitor serial:

1. BLE iniciado
2. rede conectada (Wi-Fi/4G)
3. POST de GPS com status `200`

Se status não for 200, pare aqui e corrija antes de testar app.

---

## Etapa 6 - Ativar a coleira no app

No app:

1. abrir `Config`
2. tocar `Adicionar nova coleira`
3. preencher `serial` + `activation_code`
4. confirmar ativação

Se der erro, revise dados da Etapa 1 e 2.

---

## Etapa 7 - Testar GPS no mapa

1. ir para tela `GPS`
2. tocar `Atualizar posição`
3. confirmar que:
- `Eventos GPS recebidos` aumentou
- marcador da coleira aparece/atualiza

---

## Etapa 8 - Testar BLE no app

1. ir para tela `BLE`
2. tocar `Escanear BLE`
3. escolher sua coleira
4. tocar `Conectar`

Esperado:

1. conexão bem-sucedida
2. RSSI/proximidade atualizando
3. envio BLE para backend sem erro

---

## Etapa 9 - Comando de debug (Android)

Use este comando:

```bash
adb logcat -c
adb logcat -v time ReactNativeJS:I *:S | findstr /i "BLE SCAN BLE CONNECT BLE INGEST EDGE ERROR GPS FETCH"
```

Você quer ver:

1. `BLE SCAN => start/stop`
2. `BLE CONNECT OK`
3. `BLE INGEST => sent > 0`
4. sem `EDGE ERROR` crítico

---

## Etapa 10 - Se não conectar, checklist rápido

1. `serial` e `activation_code` batem com banco?
2. `collar_id` no Arduino é o mesmo do banco?
3. `ble_service_uuid` anunciado é o mesmo cadastrado?
4. assinatura HMAC usa exatamente `collar_id|lat|lng|ts`?
5. `shared_secret` está correto?
6. Arduino está realmente anunciando BLE connectable?

---

## Resumo final

Para funcionar, 4 coisas devem estar alinhadas:

1. cadastro no Supabase
2. dados iguais no Arduino
3. firmware enviando GPS assinado
4. app ativando e conectando no BLE certo
