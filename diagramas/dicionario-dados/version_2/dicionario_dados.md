# Dicionario de dados - Cuidado Constante

Este dicionario descreve as tabelas utilizadas no banco de dados Supabase do projeto Cuidado Constante. O banco utiliza PostgreSQL, chaves primarias em UUID, relacionamentos por chaves estrangeiras e politicas RLS para controlar o acesso aos dados por tutor autenticado.

## Tabela: profiles

Finalidade: armazena os dados complementares do tutor autenticado e a coleira ativa selecionada no aplicativo.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK/FK | Sim | Referencia `auth.users(id)` com exclusao em cascata | Identificador do tutor no sistema. Usa o mesmo id do usuario autenticado no Supabase Auth. |
| full_name | text | - | Nao | - | Nome completo do tutor. |
| phone | text | - | Nao | - | Telefone informado pelo tutor. |
| active_collar | uuid | FK | Nao | Referencia `collars(id)` com `on delete set null` | Coleira atualmente selecionada como ativa no aplicativo. |
| updated_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora da ultima atualizacao do perfil. |

## Tabela: pets

Finalidade: armazena os animais cadastrados pelo tutor.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK | Sim | Valor padrao `gen_random_uuid()` | Identificador unico do pet. |
| owner_user_id | uuid | FK | Sim | Referencia `auth.users(id)` com exclusao em cascata | Tutor responsavel pelo pet. |
| name | text | - | Sim | `char_length(name) >= 1` | Nome do pet. |
| species | text | - | Nao | - | Especie do animal. |
| birth_date | date | - | Nao | - | Data de nascimento do pet. |
| color | text | - | Nao | - | Cor predominante do pet. |
| sex | text | - | Nao | No app, limitado a macho ou femea | Sexo do pet. |
| weight_kg | numeric(6,2) | - | Nao | - | Peso do pet em quilogramas. |
| size | text | - | Nao | - | Tamanho do pet. |
| microchip | text | - | Nao | - | Codigo de microchip, quando houver. |
| breed | text | - | Nao | - | Raca do pet. |
| notes | text | - | Nao | - | Observacoes adicionais sobre o pet. |
| created_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora de cadastro do pet. |

## Tabela: collars

Finalidade: armazena as coleiras cadastradas previamente pela administracao e vinculadas aos pets por meio de serial e codigo de ativacao.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK | Sim | Valor padrao `gen_random_uuid()` | Identificador unico da coleira. |
| pet_id | uuid | FK | Nao | Referencia `pets(id)` com exclusao em cascata | Pet ao qual a coleira esta vinculada. |
| serial | text | Unique | Sim | Valor unico | Codigo serial da coleira. |
| activation_code | text | - | Sim | Validado na ativacao da coleira | Codigo de ativacao previamente cadastrado pela administracao. |
| ble_service_uuid | text | - | Sim | - | UUID do servico Bluetooth usado para comunicacao BLE. |
| display_name | text | - | Nao | - | Nome de exibicao da coleira no aplicativo. |
| ble_device_name | text | - | Nao | - | Nome Bluetooth associado ao dispositivo. |
| last_seen | timestamptz | - | Nao | - | Data e hora do ultimo contato/evento recebido da coleira. |
| battery | numeric(5,2) | - | Nao | Deve estar entre 0 e 100 quando informado | Percentual de bateria informado pelo dispositivo. |
| created_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora de cadastro da coleira. |

## Tabela: gps_events

Finalidade: registra eventos de localizacao GPS enviados pela coleira ou pelo simulador.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK | Sim | Valor padrao `gen_random_uuid()` | Identificador unico do evento GPS. |
| collar_id | uuid | FK | Sim | Referencia `collars(id)` com exclusao em cascata | Coleira que enviou a localizacao. |
| lat | double precision | - | Sim | Deve estar entre -90 e 90 | Latitude da localizacao capturada. |
| lng | double precision | - | Sim | Deve estar entre -180 e 180 | Longitude da localizacao capturada. |
| battery | numeric(5,2) | - | Nao | Deve estar entre 0 e 100 quando informado | Bateria informada junto ao evento. |
| ts | timestamptz | - | Sim | - | Data e hora do evento informada pelo dispositivo/simulador. |
| created_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora em que o evento foi registrado no banco. |

## Tabela: ble_events

Finalidade: registra eventos de proximidade Bluetooth coletados pelo aplicativo durante o monitoramento BLE.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK | Sim | Valor padrao `gen_random_uuid()` | Identificador unico do evento BLE. |
| collar_id | uuid | FK | Sim | Referencia `collars(id)` com exclusao em cascata | Coleira relacionada ao evento BLE. |
| rssi | integer | - | Sim | Deve estar entre -127 e 20 | Intensidade do sinal Bluetooth recebido. |
| battery | numeric(5,2) | - | Nao | Deve estar entre 0 e 100 quando informado | Bateria informada junto ao evento, quando disponivel. |
| ts | timestamptz | - | Sim | - | Data e hora do evento. |
| created_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora em que o evento foi registrado no banco. |

## Tabela: gps_update_requests

Finalidade: controla pedidos de atualizacao de GPS feitos pelo aplicativo e consumidos pelo dispositivo ou simulador.

| Campo | Tipo | Chave | Obrigatorio | Regra/relacao | Descricao |
|---|---|---|---|---|---|
| id | uuid | PK | Sim | Valor padrao `gen_random_uuid()` | Identificador unico do pedido de atualizacao. |
| collar_id | uuid | FK | Sim | Referencia `collars(id)` com exclusao em cascata | Coleira para a qual a atualizacao foi solicitada. |
| requested_by | uuid | FK | Sim | Referencia `auth.users(id)` com exclusao em cascata | Tutor que solicitou a atualizacao da posicao. |
| status | text | - | Sim | Valores permitidos: `pending`, `processing`, `completed`, `failed`; padrao `pending` | Estado atual do pedido. |
| requested_at | timestamptz | - | Sim | Valor padrao `now()` | Data e hora em que o pedido foi criado. |
| processing_at | timestamptz | - | Nao | - | Data e hora em que o dispositivo/simulador iniciou o atendimento do pedido. |
| completed_at | timestamptz | - | Nao | - | Data e hora em que o pedido foi concluido. |
| gps_event_id | uuid | FK | Nao | Referencia `gps_events(id)` com `on delete set null` | Evento GPS gerado em resposta ao pedido. |
| error | text | - | Nao | - | Mensagem de erro quando o pedido falha. |

## Indices principais

| Indice | Tabela | Finalidade |
|---|---|---|
| idx_pets_owner | pets | Acelerar consultas de pets por tutor. |
| idx_collars_pet | collars | Acelerar consultas de coleiras por pet. |
| idx_collars_serial_activation | collars | Acelerar validacao de serial e codigo de ativacao. |
| idx_collars_last_seen | collars | Acelerar ordenacao por ultimo contato. |
| idx_gps_events_collar_ts | gps_events | Acelerar busca dos eventos GPS mais recentes por coleira. |
| idx_ble_events_collar_ts | ble_events | Acelerar busca dos eventos BLE mais recentes por coleira. |
| idx_gps_update_requests_collar_status | gps_update_requests | Acelerar busca de pedidos por coleira e status. |
| idx_gps_update_requests_one_open | gps_update_requests | Impedir mais de um pedido aberto por coleira. |
| idx_profiles_active_collar | profiles | Acelerar consultas pela coleira ativa do perfil. |

## Regras de seguranca e acesso

O banco utiliza RLS em todas as tabelas publicas do projeto. As regras principais sao:

- cada tutor autenticado so pode consultar e alterar os proprios dados;
- cada tutor so acessa pets vinculados ao seu usuario;
- cada tutor so acessa coleiras vinculadas aos seus pets;
- eventos GPS e BLE so podem ser consultados pelo dono da coleira;
- pedidos de atualizacao GPS so podem ser consultados pelo dono da coleira;
- o app nao insere diretamente eventos GPS/BLE nem pedidos de GPS; essas operacoes sao feitas por Edge Functions;
- a ativacao de coleira depende de serial e codigo previamente cadastrados.

