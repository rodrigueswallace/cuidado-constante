# A7670SA Supabase GPS

Sketch para enviar GPS do ESP32-C6-Zero + A7670SA para a Edge Function `ingest-gps`.

## O que ele faz

1. Usa 4G do A7670SA.
2. Consulta periodicamente a Edge Function `poll-gps-request`.
3. Quando houver pedido criado pelo app, liga GNSS/GPS.
4. Tenta obter latitude/longitude reais.
5. Se nao conseguir fix, usa:

```text
-23.4066756, -46.8783888
```

6. Gera assinatura HMAC SHA-256.
7. Faz POST para `ingest-gps` com o `request_id`, fechando o pedido.

## Preencher antes de compilar

No arquivo `a7670sa_supabase_gps.ino`, ajuste:

```cpp
static const char* SUPABASE_FUNCTION_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1/ingest-gps";
static const char* SUPABASE_POLL_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1/poll-gps-request";
static const char* COLLAR_ID = "COLOQUE_O_UUID_DA_COLEIRA";
static const char* COLLAR_SHARED_SECRET = "COLOQUE_O_COLLAR_SHARED_SECRET";
```

`COLLAR_ID` precisa existir na tabela `public.collars`.

`COLLAR_SHARED_SECRET` precisa ser igual ao secret configurado na Edge Function.

## Ligacao

| ESP32-C6-Zero | A7670SA |
|---|---|
| `GPIO2` | `RXD` |
| `GPIO3` | `TXD` |
| `GPIO21` | `PWR-K` |
| `GND` | `GND` |

## Como testar

Serial Monitor:

- Baud: `115200`
- Line ending: `Newline` ou `Both NL & CR`

Comandos manuais:

```text
pwr
send
poll
```

Use `pwr` apenas se o modem nao estiver ligado.

Depois de ligado, o sketch consulta pedidos automaticamente a cada 10 segundos.

O comando `poll` forca uma consulta imediata.

O comando `send` envia um ponto manualmente, sem depender de pedido do app.

Quando o app criar um pedido, o sketch imprime:

```text
Pedido GPS recebido: <request_id>
```

e roda o fluxo completo:

- checks de rede
- tentativa de GPS
- coordenada escolhida
- payload JSON
- resposta HTTP/Supabase

## Observacoes

Se `AT+HTTPSSL=1` retornar `ERROR`, mas o POST ainda funcionar, ignore. Se HTTPS falhar, pode ser preciso ajustar SSL conforme o firmware do A7670SA.

Se o GPS retornar vazio, o envio continua com a coordenada fallback.
