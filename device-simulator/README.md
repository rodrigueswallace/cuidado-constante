# Simulador de dispositivo GPS

App Expo separado do app principal. Ele simula a coleira:

- abre e inicia sozinho;
- pede permissao de localizacao do celular;
- consulta `poll-gps-request` a cada 10 segundos;
- quando encontra pedido pendente, pega a localizacao do celular;
- envia para `ingest-gps`;
- mostra tudo na tela como um monitor serial.

## Parametros configurados

```txt
SUPABASE_FUNCTION_URL=https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1/ingest-gps
SUPABASE_POLL_URL=https://nodzwvvbcoejqfbgsfbw.supabase.co/functions/v1/poll-gps-request
COLLAR_ID=c0b1b208-38aa-48c2-88a3-8d343964e117
COLLAR_SHARED_SECRET=test
```

## Como rodar

Abra um terminal nesta pasta:

```bash
cd device-simulator
npm install
npm run start
```

Depois abra no Expo Go ou rode no Android:

```bash
npm run android
```

## Como testar o fluxo

1. Abra o app simulador no celular e aceite a permissao de localizacao.
2. No app principal, va para a tela GPS.
3. Clique em `Atualizar posição`.
4. Volte ao simulador e veja o log:
   - `Consultando pedido GPS...`
   - `Pedido GPS encontrado`
   - `Capturando coordenadas do celular...`
   - `Enviando coordenadas para o Supabase...`
   - `Pedido GPS atendido com sucesso.`
5. No app principal, a posicao deve atualizar depois que o simulador enviar.

## APK pelo GitHub Actions

Use o workflow manual `Device Simulator Android Local Build`.

Ele gera o artifact `device-simulator-android-apk` com o arquivo:

```txt
app-debug.apk
```

Esse APK ja recebe o bundle JavaScript embutido no workflow, entao ele deve abrir instalado no celular sem precisar do Metro/Expo rodando.

O workflow do app principal tambem ficou manual, pelo workflow `Android Local Build`.

## Observacao de seguranca

Este app tem `COLLAR_SHARED_SECRET` no codigo porque ele e apenas um simulador interno.
Nao use esse modelo como app de usuario final em producao.
