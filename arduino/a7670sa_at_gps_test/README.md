# A7670SA AT/GPS Test

Sketch para testar ESP32-C6-Zero com modem A7670SA via Serial Monitor.

## Ligacao

| ESP32-C6-Zero | A7670SA |
|---|---|
| `GPIO2` | `RXD` |
| `GPIO3` | `TXD` |
| `GPIO21` | `PWR-K` |
| `GND` | `GND` |

Alimente o A7670SA por fonte propria. Use GND comum entre ESP32 e A7670SA.

## Serial Monitor

- Baud: `115200`
- Line ending: `Newline` ou `Both NL & CR`

## Sequencia sugerida

1. Envie `pwr` e aguarde o modem iniciar.
2. Envie `AT`.
3. Envie `init`.
4. Envie `net`.
5. Envie `gpson`.
6. Aguarde alguns minutos em area aberta.
7. Envie `gps`.
8. Envie `http` para testar trafego 4G.
9. Envie `sms` para testar envio de SMS.

Se `AT` nao retornar `OK`, nao continue para GPS/HTTP. Primeiro envie:

```text
scanbaud
```

Use o baud que retornar `BAUD_DETECTADO=...` no `#define MODEM_BAUD`.

Qualquer comando que nao seja um comando local e enviado direto ao modem como AT.

## SMS

O comando local:

```text
sms
```

envia uma mensagem de teste para `+5511948809483`.

Resposta esperada:

```text
+CMGS: <id>
OK
```

Se retornar erro, confira se o chip tem servico SMS ativo e saldo/plano permitido.
