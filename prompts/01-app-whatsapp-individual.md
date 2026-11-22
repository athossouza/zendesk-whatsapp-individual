# Prompt 1 — App "WhatsApp Individual" (barra superior)

> Copie **todo o bloco abaixo** e cole na primeira mensagem de um novo app no **App Builder** do Zendesk (Central de administração → Aplicativos e integrações → Criador de aplicativos).
> Antes, conclua os pré-requisitos de [`docs/01-pre-requisitos.md`](../docs/01-pre-requisitos.md).

---

```text
Crie um app Zendesk Support chamado "WhatsApp Individual", na location top_bar (barra superior), para o agente enviar UM template aprovado de WhatsApp para UM destinatário, usando a Notification API do Sunshine Conversations, e registrar o envio no objeto personalizado do Zendesk Labs Notifications. Interface em português do Brasil, React + Zendesk Garden, tema claro/escuro do Zendesk.

=====================================================================
0) REGRAS GERAIS DE CONSTRUÇÃO (obrigatórias)
=====================================================================
- Arquivos pequenos e por responsabilidade (utils/*, utils/enrich/*, components/*). Edite arquivos em SEQUÊNCIA, nunca vários edits paralelos no mesmo arquivo; se um editFile não persistir, reescreva o arquivo inteiro.
- Zendesk Garden: TODO <Alert> (e qualquer componente que use React.Children.only) deve ter UM ÚNICO elemento filho — envolva o conteúdo em um <div>. Textos com valor dinâmico vão dentro de <span>. Isso evita o erro "React.Children.only expected to receive a single React element child".
- Painel inicial de 440 x 600 px (definir em index.jsx; top bar exige pixels). Não fazer outro resize no App.jsx.
- mock.js para a prévia do App Builder: detectar que está fora do Zendesk e mostrar o alerta "Prévia fora do Zendesk"; o mock nunca simula conexão real e as requisições ao Sunshine devem rejeitar.
- Não publique e não envie mensagens durante a construção. Compile a versão e relate o que foi feito.

=====================================================================
1) PARÂMETROS DO APP (manifest parameters)
=====================================================================
- scAppId (texto, obrigatório): App ID do Sunshine Conversations.
- scKeyId (texto, obrigatório): ID da chave de API com escopo de APP (da mesma conta do scAppId).
- scKeySecret (texto, SEGURO / secure: true, obrigatório): segredo da chave.
- scRegion (texto, obrigatório, sem padrão): "US" ou "EU" (validar no código, já que não há tipo lista). US = api.smooch.io | EU = api.eu-1.smooch.io.
- Manifest: scopes ["basic_auth"] e domainWhitelist apenas com o host da região. Se você (App Builder) não conseguir editar o manifest, avise claramente o que eu preciso ajustar manualmente.
- Se faltar parâmetro, mostrar o alerta "Configuração incompleta" listando o que falta e o botão "Tentar novamente".

=====================================================================
2) AUTENTICAÇÃO E CHAMADAS AO SUNSHINE CONVERSATIONS
=====================================================================
- Todas as chamadas via client.request com secure: true, cors: false, autoRetry: false, header Authorization "Basic {{basic_auth.token}}" com basic_auth.username = scKeyId e basic_auth.password = "{{setting.scKeySecret}}". O segredo nunca é lido, copiado, logado ou exibido.
- Host vem SOMENTE da tabela US/EU conforme scRegion. Nunca usar /sc nem outro host como alternativa.
- Remetentes: listar integrações do tipo WhatsApp do app (API v2 de integrations, com paginação por cursor; proteger contra cursor repetido e página vazia). Se não houver, alerta "Nenhuma integração WhatsApp encontrada".
- Templates: listar os message templates da integração escolhida (API v1.1, paginada; mesmas proteções) e mostrar SOMENTE status APPROVED. Se não houver, alerta "Nenhum template aprovado encontrado".
- Envio: Notification API (POST /v1.1/apps/{appId}/notifications) com destination { integrationId, destinationId = telefone E.164 }, author role appMaker e mensagem do tipo template WhatsApp (name, language policy deterministic + code, components). Montar o payload na ORDEM esperada pela API; variáveis nomeadas incluem parameter_name; substituição de variáveis por função (o caractere $ fica literal). Confirme os formatos na documentação antes de codar.
- Erros normalizados em { source, kind, status, code, title, message } com mensagens em PT-BR: network, auth ("Problema no cabeçalho de autenticação" ≠ "Chave rejeitada"), forbidden (403), not_found (404), rate_limit (429), server (5xx), client. isInconclusive() = network/timeout/0/502/503/504: nesses casos dizer "Não foi possível confirmar o resultado. A solicitação pode ter sido processada. Verifique antes de tentar novamente." — NUNCA repetir o envio automaticamente.

=====================================================================
3) FLUXO DE TELA
=====================================================================
Passo 1 – Remetente (WhatsApp) → Passo 2 – Destinatário → Passo 3 – Template + variáveis + prévia → Revisão → Envio → Resultado.
- Respostas antigas de requisições são ignoradas (versão/sequência por requisição).
- Botão de envio com trava síncrona (clique duplo não envia duas vezes). Nenhuma repetição automática.

TEMPLATES SUPORTADOS
- Bloquear (com alerta "Template não suportado nesta versão" e lista do motivo): carrossel, localização, Flows, catálogo, ofertas, autenticação/OTP, COPY_CODE e qualquer tipo desconhecido.
- Suportar: corpo com variáveis posicionais ({{1}}) e nomeadas ({{nome}}), header de texto/mídia e botões suportados. Campos obrigatórios por variável usando Field + Field.Message nativo do Garden. Prévia da mensagem com as variáveis aplicadas.

=====================================================================
4) DESTINATÁRIO (UX e telefone)
=====================================================================
- Dois botões acessíveis: "Buscar no Zendesk" (padrão) e "Informar telefone".
- Busca: campo com label fixo "Nome, e-mail ou telefone", debounce 400 ms, mínimo 2 caracteres; Enter/"Buscar" consulta na hora sem consulta duplicada; respostas antigas descartadas assim que o termo muda; termo com + codificado corretamente. Buscar apenas usuários finais.
- Lista semântica (não combobox ARIA incompleto) com botões nativos, altura máx. 240 px com rolagem interna, 5–6 itens visíveis; nome em destaque, e-mail e telefone com quebra; botão "Selecionar" com nome acessível único; "Mais resultados" preservado; carregamento e erros logo abaixo do campo (nunca depois da lista); sem IDs exibidos.
- Ao clicar "Selecionar": mostrar "Consultando telefones…" na linha; coletar user.phone + identidades do tipo phone_number (GET /api/v2/users/{id}/identities).
  - 1 telefone válido: preenche, recolhe resultados e mostra o cartão "Destinatário selecionado" (nome, e-mail, telefone normalizado) com "Trocar destinatário".
  - Vários: escolha compacta junto ao campo; nunca escolher sozinho.
  - Nenhum válido: cartão com o valor original + ação "Corrigir telefone" (copia o original para o campo manual e foca). Nunca apagar o telefone atual por causa de um resultado inválido. Nunca um clique sem efeito visível.
  - Editar o telefone manual remove o vínculo com o usuário; "Trocar destinatário" limpa seleção e telefone e volta à busca.
  - Proteção de concorrência: se o agente trocar termo, modo ou editar o telefone durante a consulta, a seleção antiga não pode sobrescrever nada (inclusive applyChoice verifica a versão de edição capturada).
- NORMALIZAÇÃO (utils/phone.js):
  - normalizePhone ESTRITO (exige + e E.164 válido) para entrada manual e para o envio.
  - Somente para candidatos vindos do cadastro Zendesk: aceitar número com DDI explícito sem +, adicionando SÓ o sinal, com regra conservadora para Brasil: 55 + DDD válido + 8 ou 9 dígitos (12 ou 13 dígitos). Ex.: "55 (51) 98063-5211" → +5551980635211; "555192563778" → +555192563778; "55 (11) 48717600" → +551148717600.
  - NÃO acrescentar DDI, NÃO inserir/remover o nono dígito, NÃO retirar zero (ex.: "051995445802" é rejeitado, mantém o valor original e oferece correção manual).
  - Separar vários números só por vírgula, ponto e vírgula ou quebra de linha (nunca por espaços). Deduplicar pelo valor normalizado juntando as fontes ("Cadastro e identidade"). Não reinterpretar IDs de Messaging.

=====================================================================
5) REGISTRO DO ENVIO NO OBJETO PERSONALIZADO (pós-envio)
=====================================================================
Objeto: zendesk_labs_notifications_campaign_user (criado pelo app Zendesk Labs Notifications). Use só a sessão do agente via client.request com caminhos RELATIVOS da API do Support (sem credenciais do Sunshine).

5.1 Descoberta de schema (utils/enrich/schema.js)
- GET /api/v2/custom_objects/zendesk_labs_notifications_campaign_user/fields (paginado), cache na sessão (não cachear falha).
- Mapear por KEY e, como alternativa, por título normalizado, exigindo tipo compatível:
  - notification_id (text) | phone_number (text) | user_name (text)
  - user_id: aceitar text, integer OU lookup com relationship_target_type "zen:user" (título "User ID")
  - template_id: lookup para "zen:custom_object:zendesk_labs_notifications_template" (título "Campaign Template ID")
  - agent_sender (text, título "Agente remetente")
  - status e conversation_id: apenas leitura (pertencem ao Notifications)
- Campo ausente, duplicado ou de tipo incompatível: aviso discreto e seguir com os demais. Nunca bloquear.

5.2 Resolução do template (utils/enrich/template.js)
- Percorrer as páginas de registros de zendesk_labs_notifications_template. O campo "template" guarda o JSON da Meta (name, language, components…) e o campo "channels" lista integrationIds.
- Candidato = mesmo name + language (ignorar diferença "-"/"_" e maiúsculas); se o JSON de Channels tiver integrationId, priorizar o da integração usada. Só vincular candidato ÚNICO e inequívoco; nunca usar o ID de template da Meta. Sem candidato único: aviso e seguir.

5.3 Campos que o APP grava (e só estes)
- notification_id = notificationId retornado
- phone_number = telefone E.164 efetivamente enviado
- user_id e user_name = SOMENTE se houver usuário selecionado e o telefone enviado ainda corresponder ao validado (envio manual não toca nesses campos)
- template_id = registro de template resolvido (se inequívoco)
- agent_sender = "Nome Completo (email@dominio)" do agente logado (currentUser.name e currentUser.email)
- NUNCA enviar: notes, status, conversation_id, campaign_id, name (o objeto usa numeração automática).
  Motivo: o serviço do Notifications grava esses campos e SOBRESCREVE notes com null a cada gravação. Por isso o agente remetente fica em campo próprio (agent_sender), que o Notifications não conhece e portanto não apaga.

5.4 Fluxo (utils/enrich/index.js + campaignUser.js)
a) Capturar um snapshot do contexto ANTES do envio (telefone, usuário, remetente, template, idioma, integrationId, horário ISO, agente).
b) Assim que a Notification API aceitar e devolver o notificationId, fazer IMEDIATAMENTE um UPSERT:
   PATCH /api/v2/custom_objects/zendesk_labs_notifications_campaign_user/records?external_id={encodeURIComponent(notificationId)}
   body { custom_object_record: { external_id: notificationId, custom_object_fields: { ...campos do 5.3 } } }
   Nunca usar POST de criação. (O Notifications também usa o notificationId como External ID e faz upsert no MESMO registro — por isso não há duplicidade.)
c) Upsert 200/201 → mostrar "Detalhes registrados" NA HORA (com avisos de campo/template não vinculado, se houver).
d) Em segundo plano, sem travar a tela: consultar GET .../records?filter[external_ids]={notificationId} a cada 3 s por até 90 s (exigir external_id exatamente igual):
   - status OU conversation_id preenchido → linha discreta "Notifications confirmou: status X" (traduzir sent/delivered/read/failed; se só houver conversation_id: "conversa registrada").
   - Mais de um registro com o mesmo external_id → aviso de duplicidade e parar.
   - 90 s sem atualização → "Notifications ainda não atualizou o registro" + console.log com notificationId, quantidade de registros, campos lidos e último erro.
e) FALLBACK se o upsert falhar: logar no console e esperar o registro criado pelo Notifications (backoff 1,2,3,4,5,5,5… s, até 60 s), exigir unicidade e fazer PATCH /records/{id} com os campos do 5.3.
f) Erros 403/404/422 viram avisos claros; rede/429/5xx são tentados de novo dentro do prazo. Falha de registro NUNCA invalida nem repete o envio.
g) UI pós-envio: manter "Solicitação de envio aceita. A entrega ao destinatário ainda não foi confirmada." + "Identificador da notificação"; abaixo "Registrando detalhes…" → "Detalhes registrados" ou "Registro pendente" com botão "Tentar registrar novamente" (refaz SÓ o registro, nunca chama o envio) ao lado de "Novo envio". Ao clicar "Novo envio", atualizações de estado antigas são descartadas (isStale).

=====================================================================
6) ENTREGA
=====================================================================
Compile a versão e me informe: arquivos criados/alterados, decisões tomadas, o que não foi testado e o que eu preciso ajustar manualmente (manifest/scopes/domainWhitelist/parâmetros). Não publique e não envie mensagens.
```

---

## Depois que o App Builder terminar

1. Em **Configurações** do app gerado, preencha `scAppId`, `scKeyId`, `scKeySecret` e `scRegion`.
2. Confirme no manifest `scopes: ["basic_auth"]` e o `domainWhitelist` só com o host da sua região.
3. Publique com **Atualizar (Republicar)** e recarregue a aba do Agent Workspace (**Ctrl+Shift+R**) — sem recarregar, o agente continua rodando o código antigo.
4. Faça um envio de teste para um número seu e confira o registro conforme [`docs/02-validacao.md`](../docs/02-validacao.md).
