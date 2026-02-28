# Quick Structure - Build/APK

Atualizado em: 2026-02-28

## 1) Arquivos criticos para gerar APK

| Caminho | Papel no build |
|---|---|
| `package.json` | Scripts/dependencias do app. |
| `app.json` | Config Expo (nome app, permissoes Android/iOS). |
| `app.config.js` | Injeta Google Maps API key no Android. |
| `eas.json` | Perfil de build (`preview` gera APK). |
| `index.js` | Entry point do Expo (`registerRootComponent`). |
| `App.tsx` | Inicializa navegacao e telas. |
| `babel.config.js` | Alias `@` usado nos imports do `src/`. |
| `tsconfig.json` | Config TypeScript do app. |
| `.github/workflows/android-local.yml` | Pipeline GitHub Actions que gera e publica artifact APK. |

## 2) Pastas do app (runtime mobile)

| Caminho | Responsabilidade |
|---|---|
| `src/screens/` | Telas (Auth, GPS, BLE, Config, AddCollar). |
| `src/navigation/` | Fluxo de navegacao e tabs principais. |
| `src/hooks/` | Regras de rastreamento GPS/BLE e sessao auth. |
| `src/services/` | Cliente Supabase + Edge Functions + branding remoto. |
| `src/store/` | Estado global (coleira ativa, fila BLE, ajustes de rastreio). |
| `src/components/ui/` | Componentes visuais reutilizaveis. |
| `src/utils/` | Funcoes geo e direcoes. |
| `src/theme/` | Tokens visuais (cores/spacing/radius). |
| `src/types/` | Tipos de dominio. |

## 3) Backend Supabase (necessario para app funcionar)

| Caminho | Responsabilidade |
|---|---|
| `supabase/config.toml` | `verify_jwt` de cada Edge Function. |
| `supabase/functions/` | Endpoints `ingest-gps`, `ingest-ble`, `get-latest-gps`, `register-collar`. |
| `supabase/migrations/` | Estrutura do banco e policies. |
| `supabase/sql/schema.sql` | Setup manual do banco (espelho consolidado). |
| `supabase/sql/seed_test_collars.sql` | Seed de coleiras de teste. |

## 4) Variaveis minimas para build

| Variavel | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon para auth/chamadas mobile. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa/rotas Google. |
| `EXPO_PUBLIC_COLLAR_SHARED_SECRET` | Assinatura HMAC do fluxo ingest-gps. |

Variaveis opcionais BLE:
- `EXPO_PUBLIC_BLE_SERVICE_UUID`
- `EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX`

## 5) O que nao impacta runtime mobile direto

| Caminho | Observacao |
|---|---|
| `index.html`, `app.js`, `styles.css`, `register-collar.js`, `validation.js`, `test.js` | Protótipo web legado (nao entra no app React Native). |
| `img-log/` | Prints de teste/manual QA. |
| `inspect-android/` | Arquivos de debug local. |
| `dist/` | Saidas geradas localmente. |
| `.expo/` | Cache local do Expo. |
| `node_modules/` | Dependencias locais (gerado). |

## 6) Checklist antes do push para gerar APK

1. `npm.cmd run typecheck`.
2. Confirmar `.env`/secrets no GitHub.
3. Confirmar bucket de logo remoto: `branding/logo.png` (se usar branding dinamico).
4. Fazer push na `main`.
5. Baixar artifact `android-apk` no GitHub Actions.
