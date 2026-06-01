# Estrutura do Projeto - Cuidado Constante

Atualizado em: 2026-05-31

## 1) Visao geral

Este repositorio tem 3 blocos principais:

- App mobile React Native/Expo (`src/`, `App.tsx`, configs Expo/EAS).
- Backend Supabase (migrations SQL + Edge Functions em `supabase/`).
- Firmware/prototipos Arduino e guias em `arduino/`.
- Prototipo web legado de cadastro de coleira (`index.html`, `app.js`, etc.).

## 2) Raiz do repositorio

| Caminho | Responsabilidade |
|---|---|
| `.env` | Variaveis locais de ambiente; nao versionar valores reais. |
| `.env.example` | Modelo das variaveis necessarias para rodar o app. |
| `app.config.js` | Injeta Google Maps API key no config Android. |
| `app.json` | Config principal do Expo. |
| `App.tsx` | Entrada principal da UI React Native. |
| `babel.config.js` | Babel + alias `@` para `src/`. |
| `eas.json` | Perfis de build do EAS. |
| `eas.md` | Anotacao dos envs esperados no EAS. |
| `index.js` | Registro do app Expo (`registerRootComponent`). |
| `package.json` | Dependencias e scripts (`start`, `android`, `typecheck`, deploy Supabase). |
| `README.md` | Guia operacional do projeto. |
| `tsconfig.json` | Config TypeScript do app. |
| `index.html`, `app.js`, `register-collar.js`, `styles.css`, `test.js`, `validation.js` | Prototipo web legado. |

## 3) App mobile (`src/`)

### 3.1 Componentes

| Caminho | Responsabilidade |
|---|---|
| `src/components/ui/AppButton.tsx` | Botao padrao do app. |
| `src/components/ui/AppCard.tsx` | Container visual padrao. |
| `src/components/ui/AppInput.tsx` | Campo de texto padronizado. |
| `src/components/ui/AppLogo.tsx` | Logo remoto do bucket `branding/logo.png` com fallback local. |
| `src/components/ui/AppScreen.tsx` | Wrapper de tela com SafeArea. |

### 3.2 Telas

| Caminho | Responsabilidade |
|---|---|
| `src/screens/AuthScreen.tsx` | Login, cadastro e recuperacao de senha. |
| `src/screens/GpsScreen.tsx` | Mapa, posicao da coleira, usuario e rota. |
| `src/screens/BleScreen.tsx` | Scan/conexao BLE, RSSI e proximidade. |
| `src/screens/ConfigScreen.tsx` | Ajustes, atalhos de edicao, fila BLE e logout. |
| `src/screens/AddCollarScreen.tsx` | Ativacao de coleira por serial/codigo. |
| `src/screens/EditTutorScreen.tsx` | Edicao de perfil do tutor. |
| `src/screens/EditPetScreen.tsx` | Edicao do perfil do pet. |
| `src/screens/EditDeviceScreen.tsx` | Edicao da coleira e nome BLE configuravel. |
| `src/screens/ResetPasswordScreen.tsx` | Alteracao de senha. |
| `src/screens/DeleteAccountScreen.tsx` | Confirmacao e exclusao de conta. |

### 3.3 Navegacao, hooks, services e estado

| Caminho | Responsabilidade |
|---|---|
| `src/navigation/RootNavigator.tsx` | Fluxo Auth -> Tabs e telas auxiliares. |
| `src/navigation/SimpleStackNavigator.tsx` | Stack navigator customizado. |
| `src/hooks/useAuth.ts` | Sessao Supabase e recuperacao de senha. |
| `src/hooks/useBleTracking.ts` | Scan/conexao BLE, RSSI e envio para fila. |
| `src/hooks/useGpsTracking.ts` | Busca GPS, localizacao do usuario e rota. |
| `src/services/auth.ts` | Wrapper de auth. |
| `src/services/bleDeviceConfig.ts` | Escrita BLE do nome configuravel da coleira. |
| `src/services/branding.ts` | Branding remoto. |
| `src/services/device.ts` | Leitura/edicao de dados da coleira. |
| `src/services/edgeApi.ts` | Cliente de Edge Functions. |
| `src/services/profile.ts` | Leitura/edicao de tutor e pet. |
| `src/services/supabase.ts` | Cliente Supabase e persistencia de sessao. |
| `src/store/appStore.ts` | Coleira ativa, fila BLE offline e ajustes de rastreio. |
| `src/theme/tokens.ts` | Tokens visuais. |
| `src/types/` | Tipos de dominio e formularios. |
| `src/utils/` | Direcoes, geo e formatadores. |

## 4) Backend Supabase (`supabase/`)

### 4.1 Config e functions

| Caminho | Responsabilidade |
|---|---|
| `supabase/config.toml` | Config local das Edge Functions e `verify_jwt`. |
| `supabase/functions/_shared/cors.ts` | Headers CORS compartilhados. |
| `supabase/functions/_shared/supabase.ts` | Clients Supabase admin/user. |
| `supabase/functions/ingest-gps/index.ts` | Ingestao GPS via HMAC do dispositivo. |
| `supabase/functions/ingest-ble/index.ts` | Ingestao BLE autenticada pelo app. |
| `supabase/functions/get-latest-gps/index.ts` | Retorna ultimos eventos GPS autorizados. |
| `supabase/functions/register-collar/index.ts` | Vincula coleira ao pet por serial/codigo. |
| `supabase/functions/delete-account/index.ts` | Exclui dados e conta do usuario logado. |

### 4.2 Migrations

| Caminho | Responsabilidade |
|---|---|
| `20260222130000_init_pet_tracking.sql` | Schema inicial, eventos, RLS e policies de leitura. |
| `20260225120000_add_collar_activation_and_unlinked_state.sql` | `pet_id` nullable e `activation_code`. |
| `20260226100000_allow_pet_creation_by_owner.sql` | Insert de pets pelo dono. |
| `20260226120000_create_profiles_active_collar.sql` | `profiles.active_collar` e policies. |
| `20260527210000_expand_signup_onboarding.sql` | Campos de tutor/pet e trigger de onboarding. |
| `20260531193000_allow_pet_updates_by_owner.sql` | Update de pets pelo dono. |
| `20260531213000_add_collar_settings_and_update_policy.sql` | Nome da coleira/nome BLE e update de collars. |

### 4.3 SQL auxiliar

| Caminho | Responsabilidade |
|---|---|
| `supabase/sql/schema.sql` | SQL consolidado para setup manual. |
| `supabase/sql/seed_test_collars.sql` | Seed de coleiras de teste. |

## 5) Arduino (`arduino/`)

| Caminho | Responsabilidade |
|---|---|
| `arduino/esp32_ble_rename/` | Projeto/experimento Arduino para BLE rename. |
| `arduino/guias/` | Guias de firmware, contrato IoT e integracao Arduino/Supabase. |

## 6) Variaveis de ambiente

| Variavel | Uso |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon para client mobile. |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Rotas e Google Maps Android. |
| `EXPO_PUBLIC_BLE_SERVICE_UUID` | Opcional: filtro de scan BLE. |
| `EXPO_PUBLIC_BLE_DEVICE_NAME_PREFIX` | Opcional: prioridade por prefixo de nome BLE. |
| `EXPO_PUBLIC_BLE_CONFIG_SERVICE_UUID` | Opcional: servico BLE para configurar nome. |
| `EXPO_PUBLIC_BLE_DEVICE_NAME_CHARACTERISTIC_UUID` | Opcional: characteristic BLE para gravar nome. |

`COLLAR_SHARED_SECRET` e secret de Edge Function/firmware para HMAC GPS. Nao deve ser `EXPO_PUBLIC_*`.

## 7) Fluxo tecnico resumido

1. Usuario autentica na `AuthScreen`.
2. Trigger de onboarding cria `profiles` e opcionalmente `pets`.
3. `RootNavigator` abre tabs e sincroniza `profiles.active_collar`.
4. `register-collar` vincula a coleira ao pet.
5. `GpsScreen` busca eventos via `get-latest-gps`.
6. `BleScreen` escaneia/conecta e envia eventos para `ingest-ble`.
7. `EditDeviceScreen` pode atualizar dados da coleira e gravar nome BLE no dispositivo.
8. `delete-account` remove dados do usuario e exclui a conta.
