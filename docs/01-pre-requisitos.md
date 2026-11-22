# Preparar outra instância

O [prompt principal](../prompts/01-app-whatsapp-individual.md) contém estes requisitos dentro do bloco que será copiado. Preparar a conta é uma etapa administrativa: o prompt não instala o Relay nem migra campos automaticamente.

## 1. Canal, App Builder e Relay

- App Builder disponível na conta; WhatsApp conectado ao Messaging/Sunshine Conversations, com templates aprovados.
- Objetos personalizados ativados. A documentação do Relay indica Suite Professional ou superior e instalação por administrador com permissões sobre objetos. Confira as condições atuais na [documentação oficial do Relay](https://support.zendesk.com/hc/en-us/articles/7051551958426-Installing-and-using-the-Relay-messaging-app).
- **Relay messaging app, do Zendesk Labs, instalado e configurado** para o Sunshine Conversations da nova instância. Abra o Relay e conclua sua configuração; apenas ver seu ícone ou seus objetos não comprova que o processamento assíncrono funciona.
- As configurações solicitadas pelo Relay pertencem ao próprio Relay. O WhatsApp Individual recebe os quatro parâmetros da seção 4; não recebe um Authorization pronto.

A V17 depende destes objetos, identificados por **key**, não apenas por nome de exibição:

| Key | Uso nesta solução |
|---|---|
| `zendesk_labs_notifications_campaign_user` | Registro do disparo; app grava contexto, serviço Notifications grava status/conversa |
| `zendesk_labs_notifications_template` | Registro de template existente usado no lookup |
| `zendesk_labs_notifications_campaign` | Campanhas do Relay, preservadas; este app não cria campanhas |

Essas keys foram confirmadas no código V17. A documentação pública do Relay não garante esse contrato interno para toda versão: confira os objetos que a instalação efetivamente disponibilizou. Não crie objetos vazios com os mesmos nomes para mascarar uma configuração incompleta.

## 2. Campos do objeto de disparos

Central de administração → Objetos e regras → Objetos personalizados → Objetos → objeto cuja key é `zendesk_labs_notifications_campaign_user` → Campos.

| Título esperado | Key de referência | Tipo esperado | Escrita pelo app |
|---|---|---|---|
| Notification ID | `notification_id` | Texto | Sim |
| Phone Number | `phone_number` | Texto | Sim, telefone efetivamente enviado |
| User Name | `user_name` | Texto | Só com usuário vinculado ao telefone |
| User ID | `user_id` | Lookup → Usuário (`zen:user`) | Só com usuário vinculado ao telefone |
| Campaign Template ID | `template_id` | Lookup → `zendesk_labs_notifications_template` | Só com registro inequívoco |
| Agente remetente | `agent_sender` | Texto (`text`) | Nome e e-mail do agente logado |
| Status | `status` | Manter o tipo do Relay | Não; serviço Notifications |
| Conversation ID | `conversation_id` | Manter o tipo do Relay | Não; serviço Notifications |
| Campaign ID | `campaign_id` | Manter o lookup do Relay | Não; preservar |
| Notes | `notes` | Manter o campo do Relay | Não; preservar |

Exceto `agent_sender`, a V17 descobre as **keys reais por título normalizado**, conferindo tipo e ambiguidade. Não basta um campo com key `user_id` e título `ID User`: o título esperado é `User ID`. Para os textos principais, a V17 também aceita `textarea`/`regexp`; `agent_sender` exige `text`.

### User ID como lookup

Se já for lookup com destino `zen:user` e título `User ID`, preserve. A V17 aceita texto/inteiro para compatibilidade, mas isso não cria a relação com o usuário que a nova instalação deve ter.

Se estiver como texto, planeje a migração antes de substituir: tipo e key não podem ser alterados, e excluir o campo elimina seus dados. Em uma conta nova sem registros, o administrador pode excluir o campo incompatível e criar o lookup com **título `User ID`, key `user_id`, destino Usuário**. Em conta com histórico, exporte os dados e revise dependências do Relay, relatórios e integrações antes de migrar e restaurar os valores. Não apague um campo existente como etapa automática do prompt. Consulte [campos de objetos](https://developer.zendesk.com/api-reference/custom-data/custom-objects/custom_object_fields/) e [gestão de objetos](https://support.zendesk.com/hc/en-us/articles/6084239129626-Managing-custom-objects).

### Agente remetente

Crie, se ainda não existir, **Agente remetente**, key **`agent_sender`**, tipo **Texto**. O valor é `Nome Completo (email@dominio)` obtido de `currentUser`; não é o destinatário nem o usuário dono do registro.

No histórico fornecido, Notifications apagava `notes` nas atualizações; a última mudança abandona Notes e os mecanismos de reaplicação. A V17 grava `agent_sender`. A preservação desse campo pelo serviço precisa ser conferida na nova conta.

### Name e campos obrigatórios

Confirme que o campo padrão **Name usa numeração automática**, pois o app não envia `name`. Pela API de campos, verifique `properties.autoincrement_enabled` no campo padrão correspondente. Verifique também campos adicionais obrigatórios: um requisito que o app não preenche pode causar HTTP 422. Não torne `campaign_id` ou `notes` obrigatórios para este fluxo.

## 3. Objeto de templates

Em `zendesk_labs_notifications_template`, confira os campos com títulos **Template** e **Channels**, com JSON legível em texto/textarea/regexp. O primeiro contém nome, idioma e componentes; o segundo permite identificar o canal por `integrationId`/`integration_id`.

Para o lookup, precisa existir **um registro compatível**, não apenas um template aprovado na Meta. O app compara nome e idioma; prefere correspondência explícita de canal e só usa candidato sem informação de canal quando inequívoco. Se houver ambiguidade ou lista incompleta, envia a mensagem e avisa que o template não foi vinculado. Não usa o ID Meta como ID do registro, nem cria templates/campanhas para resolver ausência.

## 4. Parâmetros e autenticação do WhatsApp Individual

| Parâmetro | Valor da própria instância |
|---|---|
| `scAppId` | App ID do Sunshine Conversations |
| `scKeyId` | ID da chave de API com escopo de aplicativo |
| `scKeySecret` | Segredo, em parâmetro seguro |
| `scRegion` | `US` ou `EU`, segundo o ambiente Sunshine da conta |

No manifesto gerado: `scKeySecret` com `secure: true` e `scopes: ["basic_auth_password"]` dentro desse parâmetro; `domainWhitelist` no topo com `api.smooch.io` e `api.eu-1.smooch.io`, sem protocolo. A região escolhe um único host. Não copie as omissões do manifesto do ZIP original como modelo.

O transporte usa `Basic {{basic_auth.token}}` e `{{setting.scKeySecret}}` pelo proxy ZAF; Support usa `/api/v2/...` com a sessão do agente. Não cole segredos no prompt nem gere Base64 no navegador. Veja [requisições e secure settings do ZAF](https://developer.zendesk.com/documentation/apps/app-developer-guide/making-api-requests-from-a-zendesk-app/).

## 5. Permissões e correlação

- Usuários/identidades e schemas/registros dos dois objetos: leitura.
- Registros de `campaign_user`: **criação e edição**. O [PATCH de upsert](https://developer.zendesk.com/api-reference/custom-data/custom-objects/custom_object_records/) também cria quando o External ID ainda não existe.
- Testar na sessão de um agente da operação; sucesso como administrador não prova acesso para agentes.
- Verificar em envio autorizado que app e Notifications usam **External ID = notificationId** e atualizam o mesmo registro. Status e Conversation ID devem vir do serviço. O app não instala webhooks nem altera roteamento para obter isso.

Sem esses testes, a integração está especificada e revisada, mas não homologada na nova instância. Continue pelo [roteiro de validação](02-validacao.md).


## 6. Particularidades do app de histórico

O [Disparos WhatsApp do Solicitante](../prompts/02-app-disparos-sidebar.txt) é outro app, em `ticket_sidebar`. A referência V3 não declara parâmetros de credenciais: suas consultas usam a sessão do agente. Basta acesso de leitura aos usuários/identidades, schemas e registros dos dois objetos; permissões de criação/edição são exigidas pelo app de envio, não pela sidebar.

Confira `phone_number`, `user_id`, `template_id`, `agent_sender`, `user_name` e `status` no objeto de disparos, e `template` no objeto de templates. O novo prompt pede verificação dos schemas e dos destinos de lookup; o ZIP V3 original usa keys fixas. O histórico mostra a definição textual do template com marcadores, não necessariamente a mensagem personalizada com os valores efetivamente enviados.

A análise do pacote e da conversa está na [auditoria da sidebar V3](05-auditoria-sidebar-v3.md).
