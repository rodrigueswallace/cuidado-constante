# Dicionário de dados - Cuidado Constante

## profiles

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK/FK auth.users | Sim | Identificador do tutor autenticado. |
| full_name | text | - | Não | Nome completo do tutor. |
| phone | text | - | Não | Telefone do tutor. |
| active_collar | uuid | FK collars.id | Não | Coleira ativa selecionada pelo usuário. |
| updated_at | timestamptz | - | Sim | Data da última atualização do perfil. |

## pets

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK | Sim | Identificador do pet. |
| owner_user_id | uuid | FK auth.users | Sim | Tutor proprietário do pet. |
| name | text | - | Sim | Nome do pet. |
| species | text | - | Não | Espécie do pet. |
| birth_date | date | - | Não | Data de nascimento. |
| color | text | - | Não | Cor predominante. |
| sex | text | - | Não | Sexo do pet. |
| weight_kg | numeric(6,2) | - | Não | Peso em quilogramas. |
| size | text | - | Não | Tamanho/altura informada. |
| microchip | text | - | Não | Código de microchip, se houver. |
| breed | text | - | Não | Raça. |
| notes | text | - | Não | Observações adicionais. |
| created_at | timestamptz | - | Sim | Data de criação. |

## collars

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK | Sim | Identificador da coleira. |
| pet_id | uuid | FK pets.id | Não | Pet vinculado à coleira. |
| serial | text | Unique | Sim | Serial pré-cadastrado pelo administrador. |
| activation_code | text | - | Sim | Código de ativação pré-cadastrado. |
| ble_service_uuid | text | - | Sim | UUID de serviço BLE usado no escaneamento. |
| display_name | text | - | Não | Nome de exibição da coleira no app. |
| ble_device_name | text | - | Não | Nome BLE registrado para consulta. |
| last_seen | timestamptz | - | Não | Última comunicação registrada. |
| battery | numeric(5,2) | - | Não | Percentual de bateria entre 0 e 100. |
| created_at | timestamptz | - | Sim | Data de cadastro da coleira. |

## gps_events

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK | Sim | Identificador do evento GPS. |
| collar_id | uuid | FK collars.id | Sim | Coleira que enviou o evento. |
| lat | double precision | - | Sim | Latitude entre -90 e 90. |
| lng | double precision | - | Sim | Longitude entre -180 e 180. |
| battery | numeric(5,2) | - | Não | Bateria informada pelo dispositivo. |
| ts | timestamptz | - | Sim | Data/hora do evento. |
| created_at | timestamptz | - | Sim | Data de gravação no banco. |

## ble_events

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK | Sim | Identificador do evento BLE. |
| collar_id | uuid | FK collars.id | Sim | Coleira associada ao evento. |
| rssi | integer | - | Sim | Intensidade do sinal BLE, entre -127 e 20. |
| battery | numeric(5,2) | - | Não | Bateria estimada/informada. |
| ts | timestamptz | - | Sim | Data/hora do evento. |
| created_at | timestamptz | - | Sim | Data de gravação no banco. |

## gps_update_requests

| Campo | Tipo | Chave | Obrigatório | Descrição |
|---|---|---|---|---|
| id | uuid | PK | Sim | Identificador do pedido de atualização. |
| collar_id | uuid | FK collars.id | Sim | Coleira alvo do pedido. |
| requested_by | uuid | FK auth.users | Sim | Usuário que solicitou atualização. |
| status | text | - | Sim | Estado: pending, processing, completed ou failed. |
| requested_at | timestamptz | - | Sim | Data da solicitação. |
| processing_at | timestamptz | - | Não | Data em que o dispositivo assumiu o pedido. |
| completed_at | timestamptz | - | Não | Data da conclusão do pedido. |
| gps_event_id | uuid | FK gps_events.id | Não | Evento GPS gerado pela resposta. |
| error | text | - | Não | Mensagem de erro quando o pedido falhar. |

## Regras e índices relevantes

- `collars.serial` é único.
- `gps_update_requests` possui índice único parcial para permitir apenas um pedido aberto por coleira quando o status for `pending` ou `processing`.
- `gps_events.lat` e `gps_events.lng` possuem validação de faixa geográfica.
- `ble_events.rssi` possui validação entre -127 e 20.
- Tabelas possuem Row Level Security para restringir acesso ao proprietário da coleira/pet.
