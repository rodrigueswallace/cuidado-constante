# Estrutura do Projeto - Cuidado Constante

Atualizado em: 2026-02-28

## 1) Visao geral

Este repositorio tem 3 blocos principais:

- App mobile React Native/Expo (`src/`, `App.tsx`, configs Expo/EAS).
- Backend Supabase (migrations SQL + Edge Functions em `supabase/`).
- Protótipo web antigo de cadastro de coleira (`index.html`, `app.js`, etc.).

Tambem existem pastas geradas localmente (ex.: `node_modules/`, `.expo/`, `dist/`, `img-log/`) usadas para build, cache e testes.

## 2) Raiz do repositorio

| Caminho | Responsabilidade |
|---|---|
| `.env` | Variaveis locais de ambiente (nao deve ir para producao/publico). |
| `.env.example` | Modelo das variaveis necessarias para rodar o app. |
| `.eslintrc.json` | Configuracao antiga do ESLint (hoje o projeto nao usa `eslint.config.js`). |
| `.gitignore` | Arquivos/pastas ignorados no Git. |
| `.gitkeep` | Mantem pasta vazia versionada quando necessario. |
| `app.config.js` | Injeta chave Google Maps no config Android via env. |
| `app.json` | Config principal do Expo (nome, permissoes Android/iOS, plugins). |
| `App.tsx` | Entrada principal da UI React Native (NavigationContainer + RootNavigator). |
| `app.js` | Script do prototipo web antigo (tabs + validacao + mock de cadastro). |
| `babel.config.js` | Babel + alias `@` para `src/`. |
| `eas.json` | Perfis de build do EAS (`development`, `preview`, `production`). |
| `eas.md` | Backup/anotacao local de config EAS (conteudo em JSON). |
| `index.html` | Tela HTML do prototipo web antigo de cadastro de coleira. |
| `index.js` | Registro do app Expo (`registerRootComponent`). |
| `package.json` | Dependencias e scripts (`start`, `android`, `typecheck`, deploy Supabase). |
| `package-lock.json` | Lockfile do npm. |
| `README.md` | Guia operacional do projeto (Supabase, functions, fluxo de teste). |
| `register-collar.js` | Mock local do endpoint `register-collar` para prototipo web. |
| `styles.css` | Estilos do prototipo web antigo. |
| `test.js` | Testes Node simples do prototipo web (`validation` + `register-collar`). |
| `tsconfig.json` | Config TypeScript do app (alias `@/*`; exclui `supabase/functions/**`). |
| `validation.js` | Validacoes de serial/codigo para prototipo web antigo. |

## 3) CI/CD

| Caminho | Responsabilidade |
|---|---|
| `.github/workflows/android-local.yml` | Pipeline GitHub Actions para gerar APK (`eas build --local`) em push na `main` e upload de artifact. |

## 4) App mobile (`src/`)

### 4.1 `src/components/ui`

| Caminho | Responsabilidade |
|---|---|
| `src/components/ui/AppButton.tsx` | Botao padrao do app (primary/secondary, disabled, texto centralizado). |
| `src/components/ui/AppCard.tsx` | Container visual padrao em formato card. |
| `src/components/ui/AppInput.tsx` | Campo de texto padronizado com label. |
| `src/components/ui/AppLogo.tsx` | Logo da marca: tenta carregar logo remoto no Storage; fallback local `CC`. |
| `src/components/ui/AppScreen.tsx` | Wrapper de tela com SafeArea + padding opcional. |

### 4.2 `src/hooks`

| Caminho | Responsabilidade |
|---|---|
| `src/hooks/useAuth.ts` | Mantem sessao do Supabase em memoria e escuta mudancas de auth. |
| `src/hooks/useBleTracking.ts` | Scan/conexao BLE, permissoes Android, leitura de RSSI e envio para fila BLE. |
| `src/hooks/useGpsTracking.ts` | Busca eventos GPS, localizacao do usuario e recalculo de rota. |

### 4.3 `src/navigation`

| Caminho | Responsabilidade |
|---|---|
| `src/navigation/RootNavigator.tsx` | Fluxo principal (Auth -> Tabs -> AddCollar) com tabs GPS/BLE/Config. |
| `src/navigation/SimpleStackNavigator.tsx` | Implementacao leve de stack navigator customizado. |

### 4.4 `src/screens`

| Caminho | Responsabilidade |
|---|---|
| `src/screens/AddCollarScreen.tsx` | Cadastro/ativacao de coleira (serial + codigo + associacao de pet). |
| `src/screens/AuthScreen.tsx` | Login/cadastro de conta com Supabase Auth. |
| `src/screens/BleScreen.tsx` | Tela BLE: scan, lista ordenada, conexao e status de proximidade/sinal. |
| `src/screens/ConfigScreen.tsx` | Ajustes do app (GPS throttle, permissoes, branding, fila BLE, logout). |
| `src/screens/GpsScreen.tsx` | Mapa principal com marcador da coleira, usuario, rota e controles de refresh. |

### 4.5 `src/services`

| Caminho | Responsabilidade |
|---|---|
| `src/services/auth.ts` | Wrapper simples de auth (signIn/signUp/signOut/getSession). |
| `src/services/branding.ts` | Config de branding remoto (`branding/logo.png`) e URL publica do logo. |
| `src/services/edgeApi.ts` | Cliente de Edge Functions (JWT refresh, logs, chamadas GPS/BLE/register/profile). |
| `src/services/supabase.ts` | Cria cliente Supabase, valida env e configura persistencia de sessao no AsyncStorage. |

### 4.6 `src/store`

| Caminho | Responsabilidade |
|---|---|
| `src/store/appStore.ts` | Estado global (coleira ativa, fila BLE offline, intervalos GPS, hydrate/flush). |

### 4.7 `src/theme`

| Caminho | Responsabilidade |
|---|---|
| `src/theme/tokens.ts` | Tokens visuais globais (cores, espacamentos, radius). |

### 4.8 `src/types`

| Caminho | Responsabilidade |
|---|---|
| `src/types/domain.ts` | Tipos de dominio (`GpsEvent`, `Collar`, `DirectionsRoute`). |

### 4.9 `src/utils`

| Caminho | Responsabilidade |
|---|---|
| `src/utils/directions.ts` | Cliente da Google Directions API + decode de polyline. |
| `src/utils/geo.ts` | Funcoes geograficas (haversine e estimativa de proximidade por RSSI). |

## 5) Backend Supabase (`supabase/`)

### 5.1 Config

| Caminho | Responsabilidade |
|---|---|
| `supabase/config.toml` | Config local das Edge Functions e `verify_jwt` por funcao. |

### 5.2 Edge Functions

| Caminho | Responsabilidade |
|---|---|
| `supabase/functions/_shared/cors.ts` | Headers CORS compartilhados. |
| `supabase/functions/_shared/supabase.ts` | Fabrica de clients Supabase (admin/service role e user/auth header). |
| `supabase/functions/get-latest-gps/index.ts` | Retorna ultimos eventos GPS da coleira (com auth de usuario). |
| `supabase/functions/ingest-ble/index.ts` | Ingestao de evento BLE autenticado e autorizado por dono da coleira. |
| `supabase/functions/ingest-gps/index.ts` | Ingestao GPS via assinatura HMAC do dispositivo + update de `last_seen`. |
| `supabase/functions/register-collar/index.ts` | Valida serial/codigo e vincula coleira ao pet do usuario. |

### 5.3 Migrations

| Caminho | Responsabilidade |
|---|---|
| `supabase/migrations/20260222130000_init_pet_tracking.sql` | Schema inicial (pets, collars, gps_events, ble_events, RLS e policies de leitura). |
| `supabase/migrations/20260225120000_add_collar_activation_and_unlinked_state.sql` | Ajusta `pet_id` nullable e adiciona/forca `activation_code`. |
| `supabase/migrations/20260226100000_allow_pet_creation_by_owner.sql` | Permite `insert` em `pets` por usuario autenticado com policy de ownership. |
| `supabase/migrations/20260226120000_create_profiles_active_collar.sql` | Cria tabela `profiles` com `active_collar` e policies de select/insert/update proprios. |

### 5.4 SQL auxiliar

| Caminho | Responsabilidade |
|---|---|
| `supabase/sql/schema.sql` | SQL consolidado para setup manual do banco (espelho das migrations principais). |
| `supabase/sql/seed_test_collars.sql` | Seed de coleiras de teste para fluxo de ativacao no app. |

## 6) Pastas locais/geradas (nao centrais para logica)

| Caminho | Responsabilidade |
|---|---|
| `.expo/` | Cache/metadados locais do Expo. |
| `dist/` | Saidas de build web/local quando geradas. |
| `img-log/` | Prints e evidencias visuais de testes manuais. |
| `inspect-android/` | Arquivos auxiliares de investigacao Android (logs, testes locais). |
| `node_modules/` | Dependencias instaladas localmente. |

## 7) Fluxo tecnico resumido

1. Usuario autentica na `AuthScreen`.
2. `RootNavigator` abre tabs e sincroniza coleira ativa (`profiles.active_collar`).
3. `GpsScreen` busca eventos via `get-latest-gps` e desenha mapa/rota.
4. `BleScreen` escaneia BLE, conecta e enfileira eventos para `ingest-ble`.
5. `appStore` persiste fila BLE offline e permite reenviar pela tela `Config`.
6. `register-collar` vincula coleira ao pet e atualiza contexto local.

## 8) Variaveis de ambiente usadas no app

| Variavel | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon para client mobile. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Rotas no `directions.ts` e config Google Maps Android. |
| `EXPO_PUBLIC_COLLAR_SHARED_SECRET` | Segredo usado no fluxo de testes/assinatura HMAC do dispositivo. |
| `EXPO_PUBLIC_BLE_SERVICE_UUID` | (Opcional) filtro de scan BLE por servico. |
| `EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX` | (Opcional) prioriza dispositivos por prefixo de nome na tela BLE. |

## 9) Observacoes importantes

- O repositorio contem app mobile atual + prototipo web legado.
- Arquivos do prototipo web (`index.html`, `app.js`, `register-collar.js`, etc.) nao fazem parte do runtime React Native.
- O bucket de branding esperado pelo app e `branding`, arquivo `logo.png`.
