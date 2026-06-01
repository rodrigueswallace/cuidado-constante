# Quick Structure - Build/APK

Atualizado em: 2026-05-31

## 1) Arquivos criticos para gerar APK

| Caminho | Papel no build |
|---|---|
| `package.json` | Scripts/dependencias do app. |
| `app.json` | Config Expo (nome app, permissoes Android/iOS). |
| `app.config.js` | Injeta Google Maps API key no Android. |
| `eas.json` | Perfil de build (`preview` gera APK). |
| `eas.md` | Anotacao dos envs esperados no EAS. |
| `index.js` | Entry point do Expo (`registerRootComponent`). |
| `App.tsx` | Inicializa navegacao e telas. |
| `babel.config.js` | Alias `@` usado nos imports do `src/`. |
| `tsconfig.json` | Config TypeScript do app. |
| `.github/workflows/android-local.yml` | Pipeline GitHub Actions que gera e publica artifact APK. |

## 2) Pastas do app

| Caminho | Responsabilidade |
|---|---|
| `src/screens/` | Telas Auth, GPS, BLE, Config, AddCollar, edicoes, reset e exclusao de conta. |
| `src/navigation/` | Fluxo de navegacao e tabs principais. |
| `src/hooks/` | Regras de rastreamento GPS/BLE e sessao auth. |
| `src/services/` | Supabase, Edge Functions, perfil, dispositivo, BLE config e branding. |
| `src/store/` | Estado global (coleira ativa, fila BLE, ajustes de rastreio). |
| `src/components/ui/` | Componentes visuais reutilizaveis. |
| `src/utils/` | Funcoes geo, direcoes e formatadores. |
| `src/theme/` | Tokens visuais. |
| `src/types/` | Tipos de dominio e formularios. |
| `arduino/guias/` | Guias Arduino/ESP32 e contrato de firmware. |

## 3) Backend Supabase

| Caminho | Responsabilidade |
|---|---|
| `supabase/config.toml` | `verify_jwt` de cada Edge Function. |
| `supabase/functions/` | Endpoints `ingest-gps`, `ingest-ble`, `get-latest-gps`, `register-collar`, `delete-account`. |
| `supabase/migrations/` | Estrutura do banco, policies e onboarding. |
| `supabase/sql/schema.sql` | Setup manual consolidado. |
| `supabase/sql/seed_test_collars.sql` | Seed de coleiras de teste. |

## 4) Variaveis minimas para build

| Variavel | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon para auth/chamadas mobile. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa/rotas Google. |

Variaveis opcionais BLE:

- `EXPO_PUBLIC_BLE_SERVICE_UUID`
- `EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX`
- `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID`
- `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID`

`COLLAR_SHARED_SECRET` e segredo da Edge Function/firmware para HMAC GPS. Nao deve ser `EXPO_PUBLIC_*`.

## 5) O que nao impacta runtime mobile direto

| Caminho | Observacao |
|---|---|
| `index.html`, `app.js`, `styles.css`, `register-collar.js`, `validation.js`, `test.js` | Prototipo web legado. |
| `img-log/` | Prints de teste/manual QA. |
| `inspect-android/` | Arquivos de debug local. |
| `dist/`, `.expo/`, `node_modules/` | Saidas/cache/dependencias geradas localmente. |

## 6) Checklist antes do push para gerar APK

1. `npm.cmd run typecheck`.
2. Confirmar `.env`/secrets no GitHub ou EAS.
3. Confirmar bucket de logo remoto: `branding/logo.png` (se usar branding dinamico).
4. Fazer push na `main`.
5. Baixar artifact `android-apk` no GitHub Actions.
