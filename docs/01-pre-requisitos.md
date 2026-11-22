# Pré-requisitos na nova instância Zendesk

Faça estes passos **antes** de colar os prompts no App Builder.

## 1. Messaging + WhatsApp
- Canal **WhatsApp** conectado em Messaging, com templates **aprovados** pela Meta.
- O WhatsApp aparece como integração no app do **Sunshine Conversations** da conta.

## 2. App do Zendesk Labs Notifications (Relay)
Instale o app de notificações do Zendesk Labs (o "Relay App"). Ele cria três objetos personalizados:

| Objeto | Uso |
|---|---|
| `zendesk_labs_notifications_campaign_user` | Um registro por envio (é onde o nosso app grava) |
| `zendesk_labs_notifications_template` | Templates (campo `template` com o JSON da Meta e `channels` com integrationIds) |
| `zendesk_labs_notifications_campaign` | Campanhas (não usamos) |

O serviço do Notifications cria/atualiza o registro de `campaign_user` usando o **notificationId como External ID** (via upsert) e grava `status` e `conversation_id`. Ele também **sobrescreve `notes` com vazio** a cada gravação.

## 3. Ajustes no objeto `zendesk_labs_notifications_campaign_user`
Central de administração → Objetos e regras → Objetos personalizados → *Zendesk Labs Campaign User* → Campos.

### 3.1 Recriar o campo User ID como lookup
O campo original **User ID** é do tipo texto. Para ligar o envio ao usuário do Zendesk:
1. Exclua o campo **User ID** (texto).
2. Crie um campo novo do tipo **Pesquisa (lookup)** → destino **Usuário**:
   - **Título: exatamente `User ID`** (o app procura por esse título; "ID User" não funciona)
   - **Chave: `user_id`**

> Erro que acontece se o título estiver diferente: *"Campo 'User ID' não encontrado no objeto"*. Basta renomear o título para `User ID`.

### 3.2 Criar o campo Agente remetente
Crie um campo do tipo **Texto**:
- **Título:** `Agente remetente`
- **Chave:** `agent_sender`

Guarda "Nome Completo (email@dominio)" de quem disparou. Fica num campo próprio porque o Notifications apaga `notes` a cada gravação e não conhece `agent_sender`, então não o apaga.

### Campos finais esperados

| Título | Chave | Tipo | Quem grava |
|---|---|---|---|
| User Name | `user_name` | Texto | App |
| Phone Number | `phone_number` | Texto | App / Notifications |
| Notes | `notes` | Texto | (não usar) |
| Notification ID | `notification_id` | Texto | App / Notifications |
| Campaign ID | `campaign_id` | Lookup → campaign | Notifications |
| Campaign Template ID | `template_id` | Lookup → template | App |
| Status | `status` | Texto | Notifications |
| Conversation ID | `conversation_id` | Texto | Notifications |
| User ID | `user_id` | Lookup → Usuário | App |
| Agente remetente | `agent_sender` | Texto | App |

## 4. Credenciais do Sunshine Conversations
Central de administração → Aplicativos e integrações → API de conversas:
- **App ID** → parâmetro `scAppId`
- Crie uma **chave de API com escopo de app** → `scKeyId` e `scKeySecret`
- **Região** da conta → `scRegion` = `US` (api.smooch.io) ou `EU` (api.eu-1.smooch.io)

## 5. Permissões
Os agentes que usam os apps precisam de permissão para ler e editar registros do objeto `zendesk_labs_notifications_campaign_user` e ler `zendesk_labs_notifications_template`.
