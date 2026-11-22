# Prompt 1 — App "WhatsApp Individual" (barra superior)

> Copie **todo o bloco abaixo** e cole na primeira mensagem de um novo app no **App Builder** do Zendesk (Central de administração → Aplicativos e integrações → Criador de aplicativos).
> Antes, conclua os pré-requisitos de [`docs/01-pre-requisitos.md`](../docs/01-pre-requisitos.md).
>
> Este prompt reproduz a **V17** publicada na conta SKA (revisada a partir do código final), somando o prompt original de criação e todos os ajustes feitos depois.

---

```text
Crie do zero um aplicativo Zendesk chamado "WhatsApp Individual", na localização Top Navigation / top_bar, usando o próprio App Builder.

Objetivo: o agente escolhe um WhatsApp remetente conectado à conta, informa um destinatário manualmente ou busca um usuário existente no Zendesk, seleciona um template aprovado, preenche os parâmetros, revisa e confirma UM envio individual pela Notification API do Sunshine Conversations. Depois do envio, o app registra o disparo no objeto personalizado do Zendesk Labs Notifications.

Implemente o aplicativo completo (não apenas interface ou dados simulados). Ao finalizar, informe o que foi verificado no código, o que foi testado na conta e o que depende de configuração ou de envio autorizado. Não publique e não envie mensagens durante a construção.

==================================================================
0) REGRAS DE CONSTRUÇÃO (obrigatórias)
==================================================================
- Português do Brasil com acentos, Zendesk Garden, temas claro e escuro.
- Módulos pequenos por responsabilidade: constants.js; utils/sunshine.js (transporte); utils/errors.js; utils/hooks.js; utils/template.js (análise, prévia, payload); utils/phone.js; utils/urls.js; utils/validation.js; utils/support.js (consultas Support); utils/enrich/* (registro no objeto); components/* (InitStatus, SenderSelect, RecipientSection, RecipientPhone, UserSearch, SelectedRecipient, TemplateSelect, TemplateFields, MessagePreview, ReviewStep, ResultPanel, EnrichmentStatus, ErrorNotice).
- Edite arquivos em SEQUÊNCIA. Nunca faça edits paralelos no mesmo arquivo; se um editFile não persistir, reescreva o arquivo inteiro.
- Todo <Alert> do Garden (e qualquer componente que use React.Children.only) deve ter UM ÚNICO elemento filho: envolva o conteúdo em <div>. Texto com valor dinâmico vai dentro de <span>. (Evita "React.Children.only expected to receive a single React element child".)
- Painel inicial 440 x 600 px, definido UMA vez em index.jsx com client.invoke('resize', { width: '440px', height: '600px' }). Não fazer outro resize no App.jsx. Rolagem vertical permitida, sem rolagem horizontal.
- mock.js para a prévia do App Builder: marque o cliente com __isMock; o app mostra "Prévia fora do Zendesk" e não simula conexão real.
- Registre na memória do App Builder as decisões de autenticação, hosts, paginação, tipos suportados e limitações (sem credenciais).

==================================================================
1) PARÂMETROS DA INSTALAÇÃO
==================================================================
- scAppId (texto, obrigatório): App ID do Sunshine Conversations.
- scKeyId (texto, obrigatório): Key ID da chave de API com escopo de APP.
- scKeySecret (texto, secure: true, obrigatório): segredo da chave.
- scRegion (texto, obrigatório, sem padrão): "US" ou "EU", validado no código (o App Builder não tem tipo lista). Corresponde ao ambiente Sunshine Conversations da conta; não deduzir por idioma, telefone, país ou subdomínio.
Não crie parâmetros redundantes (credencial Base64, JWT, Authorization pronto, Integration ID, catálogo de templates, token do Support). Nenhuma credencial, App ID ou subdomínio real no código, padrões ou mock.

==================================================================
2) CONTEXTO E INICIALIZAÇÃO (useAppConfig)
==================================================================
- Ler context.account.subdomain pelo ZAF (nunca window.location). Sem subdomínio → estado "context_error".
- Ler de metadata.settings SOMENTE scAppId, scKeyId e scRegion (nunca o segredo). Região em maiúsculas.
- Estados distintos: initializing, preview, context_error, config_incomplete (listar o que falta e se a região é inválida), ready. Botão "Tentar novamente".
- Nunca transformar erro de API em lista vazia.

==================================================================
3) TRANSPORTE SUNSHINE CONVERSATIONS (utils/sunshine.js) — exatamente assim
==================================================================
Hosts permitidos (tabela interna): US = https://api.smooch.io | EU = https://api.eu-1.smooch.io. Usar só o da região; nunca tentar vários hosts, nunca URL arbitrária, nunca /sc.

Função única scRequest(config, { path, method, query, body }):
  client.request({
    url: host + path + query,
    type: method || 'GET',
    headers: {
      Authorization: 'Basic {{basic_auth.token}}',
      'X-Zendesk-UA-Override': 'none',
      'X-Requested-With': ''
    },
    basic_auth: { username: config.keyId, password: '{{setting.scKeySecret}}' },
    secure: true, cors: false, crossDomain: true, autoRetry: false,
    dataType: 'json', timeout: 30000,
    // com body: contentType 'application/json' e data JSON.stringify(body)
  })
- O proxy ZAF gera o Base64 de keyId:secret fora do navegador. Nunca enviar "Basic keyId:secret" em texto, nunca btoa com o segredo, nunca copiar o segredo para estado, storage, logs ou erros.
- Manifest: scKeySecret secure. Tente declarar scopes ["basic_auth"] e domainWhitelist com o host da região; se o App Builder não permitir editar o manifest, avise. (Na V17 em produção o manifest ficou com domainWhitelist [] e sem scopes, e a autenticação funcionou; se aparecer "Invalid authorization header format", revise esses dois itens.)

==================================================================
4) REMETENTES (WhatsApp)
==================================================================
- GET /v2/apps/{appId}/integrations com page[size]=100 e paginação v2: parar se meta.hasMore === false; próximo cursor = meta.afterCursor ou page[after] extraído de links.next; parar em página vazia ou cursor repetido; máximo 50 páginas.
- Filtrar localmente type === "whatsapp" e deduplicar por id.
- Rótulo: "displayName (phoneNumber)"; sem número, "nome (ID últimos 6)". O ID fica só como valor interno. Select do Garden com opções nativas (não Combobox que mostre o ID).
- Uma integração → selecionar automaticamente. "Nenhuma integração WhatsApp encontrada" só após consulta bem-sucedida e lista vazia.

==================================================================
5) TEMPLATES APROVADOS
==================================================================
- GET /v1.1/apps/{appId}/integrations/{integrationId}/messageTemplates?status=APPROVED com paginação v1.1 por "after" (res.after ou res.meta.after). Continuar enquanto houver cursor novo; parar em página vazia, cursor igual ao anterior ou repetido; máximo 50 páginas. Não usar offset/total, não usar /templates.
- Conferir status APPROVED em cada item. language pode vir como string ou { code }. Deduplicar por id e por nome|idioma. Ordenar por nome e idioma.
- Mostrar nome e idioma; chave estável "nome|idioma".
- Botão "Atualizar lista de templates" + aviso: "Mudanças recentes podem demorar a aparecer: a API pode manter cache por cerca de duas horas."
- Ao trocar o remetente: invalidar consultas anteriores e limpar template, valores e prévia. Ao trocar o template: limpar valores e reconstruir campos. Respostas antigas são ignoradas (id de requisição).

==================================================================
6) ANÁLISE CENTRALIZADA DO TEMPLATE (analyzeTemplate em utils/template.js)
==================================================================
Uma única função usada por formulário, validação, prévia, revisão e payload. Retorna { key, name, language, namespace, supported, reasons[], header, bodyText, footer, buttons[], fields[], paramFormat }.
Todos os templates aprovados aparecem; os incompatíveis ficam visíveis com o motivo e envio bloqueado.

Componentes:
- Só HEADER, BODY, FOOTER e BUTTONS. Qualquer outro bloqueia: CAROUSEL, LIMITED_TIME_OFFER, CATALOG/MPM/PRODUCT ("Catálogo e mensagens multiproduto…") ou "Componente desconhecido". Componente duplicado bloqueia. BODY obrigatório e com texto.
- category AUTHENTICATION bloqueia (autenticação/OTP).
- HEADER TEXT: no máximo UMA variável. HEADER IMAGE/VIDEO/DOCUMENT: campo de URL HTTPS (+ nome de arquivo opcional para DOCUMENT). HEADER LOCATION ou formato desconhecido: bloqueia.
- FOOTER fixo; FOOTER com variável bloqueia.
- Botões: QUICK_REPLY (campo de payload obrigatório, máx. 256 caracteres); URL estática (sem campo); URL dinâmica somente com exatamente um {{1}} no endereço, mesmo sem url_type (campo "valor da URL"); PHONE_NUMBER fixo (exige número). FLOW, CATALOG, MPM, SPM, COPY_CODE, OTP e desconhecidos bloqueiam. Preservar o índice original de cada botão.

Variáveis (regex {{ nome }}):
- Marcadores malformados ({{ ou }} soltos) bloqueiam.
- Posicionais: só números, sequência obrigatória {{1}}, {{2}}… sem lacunas; ordenar numericamente.
- Nomeadas: /^[a-z][a-z0-9_]*$/.
- Mistura de formatos (dentro de uma seção ou entre HEADER e BODY) bloqueia. Se t.parameter_format existir e divergir do texto, bloqueia.
- HEADER e BODY são separados (chaves "header:1" e "body:1"); nunca reutilizar valor de um no outro.
- Exemplos da aprovação aparecem só como dica ("Exemplo da aprovação (apenas orientação): …"); nunca preencher automaticamente. O agente edita os valores, nunca o texto fixo.

==================================================================
7) PRÉVIA E PAYLOAD
==================================================================
Prévia (buildPreview):
- Converter textos do template para texto puro antes de exibir (previewPlainText): se houver tags/entidades HTML, interpretar via <template>, descartar script/style/iframe/img/video/svg etc., transformar blocos e <br> em quebras, <li> em "• ", normalizar espaços. Nunca injetar HTML.
- Substituição por função (valores com $ ficam literais); variável vazia mantém o marcador.
- Mídia: mostrar tipo, URL e nome do arquivo, sem carregar a mídia. URL dinâmica: substituir o {{1}} no endereço (não concatenar). Botão de telefone mostra o número.
- Identificar como representação do conteúdo, não aparência idêntica ao WhatsApp.

Payload (buildPayload) para POST /v1.1/apps/{appId}/notifications:
{
  destination: { integrationId, destinationId: telefoneE164 },
  author: { role: 'appMaker' },
  messageSchema: 'whatsapp',
  message: { type: 'template', template: {
    name, language: { policy: 'deterministic', code: idioma },
    namespace (só se o template tiver),
    components (só se houver parâmetros) } }
}
- header: parâmetros de texto, ou { type: 'image'|'video'|'document', <tipo>: { link, filename (só documento e se informado) } }.
- body: parâmetros { type: 'text', text } + parameter_name quando o formato for nomeado.
- quick_reply: { type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload }] }.
- URL dinâmica: { type: 'button', sub_type: 'url', index: String(i), parameters: [{ type: 'text', text: valor }] }.
- Não enviar componentes vazios (texto fixo, rodapé, botões estáticos). Nunca trocar o template por mensagem livre.

==================================================================
8) VALIDAÇÃO CENTRALIZADA (validateSend)
==================================================================
Uma única função usada nos campos, no botão "Revisar envio" e no envio. Bloqueia: configuração não pronta; remetentes carregando/erro/não escolhido; templates carregando/erro/não escolhido; template não suportado; campo obrigatório vazio; payload > 256; nome de arquivo > 240; URL inválida; telefone inválido.
URL de mídia (validateHttpsUrl): sem espaços, começa com https:// e tem host, parse com new URL, só https, sem usuário/senha, host com ponto, recusar localhost, IPv6 e IPv4 privados (0., 10., 127., 169.254., 192.168., 172.16–31.). Mensagem: "A URL precisa ser pública e acessível ao WhatsApp."

==================================================================
9) DESTINATÁRIO
===============================================================
UX:
- Dois botões: "Buscar no Zendesk" (padrão) e "Informar telefone".
- Busca: label fixo "Nome, e-mail ou telefone"; debounce 400 ms; mínimo 2 caracteres; Enter/"Buscar" consulta na hora sem consulta dupla; termo antigo é descartado ao mudar; "Mais resultados" não pode carregar página de outro termo.
- GET /api/v2/users/search.json?query="<termo sem aspas>" role:end-user&per_page=20&page=N (sessão do agente, caminho relativo). Conferir localmente role === "end-user" e !suspended. "Mais resultados" pelo next_page (sem total estimado).
- Lista semântica com botões nativos (não combobox ARIA incompleto), altura máx. 240 px com rolagem interna; nome em destaque, e-mail e telefone com quebra; "Selecionar" com nome acessível único; carregamento e erros logo abaixo do campo; sem IDs. Estados distintos: não buscado, carregando, nenhum resultado, erro, sem permissão, resultados.
- "Selecionar": mostra "Consultando telefones…" na linha; lê user.phone + GET /api/v2/users/{id}/identities.json?type[]=phone_number&page[size]=100 (paginando por links.next).
  - 1 telefone válido → preenche, recolhe a lista e mostra o cartão "Destinatário selecionado" (nome, e-mail, telefone) com "Trocar destinatário".
  - Vários → escolha compacta junto ao campo; nunca escolher sozinho.
  - Nenhum válido → cartão com o valor original e ação "Corrigir telefone" (copia para o campo manual e foca). Nunca apagar o telefone atual; nunca clique sem efeito.
  - Se identidades falharem mas user.phone for válido, permitir usá-lo com aviso.
- Editar o telefone manual desvincula o usuário. "Trocar destinatário" limpa seleção e telefone. Uma seleção que termina depois NÃO pode sobrescrever telefone editado (versão de edição capturada, conferida também ao aplicar a escolha entre vários números).
- O usuário só aparece (no cartão, na revisão e no registro) enquanto o telefone atual for exatamente o telefone dele.

Telefone (utils/phone.js):
- normalizePhone ESTRITO (entrada manual e envio): remove espaços, parênteses, hífen e ponto; exige /^\+[1-9]\d{7,14}$/. Mensagem: "Use o formato internacional, com +, código do país e DDD. Exemplo: +5511999999999." Validar formato não garante que o número tenha WhatsApp.
- normalizeZendeskPhone (só candidatos do cadastro): com + → normalizePhone; sem + → aceitar apenas 55 + DDD brasileiro válido (lista oficial de DDDs) + 8 ou 9 dígitos (total 12 ou 13); com 9 dígitos o local deve começar com 9; com 8 dígitos não pode começar com 0 ou 1; resultado = "+" + dígitos. Ex.: "55 (51) 98063-5211" → +5551980635211; "555192563778" → +555192563778; "55 (11) 48717600" → +551148717600.
- NUNCA acrescentar DDI, inserir/remover o nono dígito ou tirar zero ("051995445802" é rejeitado e oferece correção manual).
- Separar vários números só por vírgula, ponto e vírgula ou quebra de linha. Deduplicar pelo valor normalizado juntando as fontes ("Cadastro e identidade"). Não reinterpretar IDs de Messaging. Nunca alterar cadastros.

==================================================================
10) REVISÃO, ENVIO E RESULTADO
==================================================================
- Formulário: WhatsApp remetente → destinatário → template e idioma → campos → prévia → "Revisar envio".
- Revisão: remetente, telefone normalizado, usuário (se vinculado), nome técnico, idioma, conteúdo e parâmetros; botões "Voltar" e "Confirmar envio". Sem checkbox de consentimento.
- Envio: "Enviando…", trava síncrona (useRef) além do estado React, um envio por vez, autoRetry false, nunca repetir o POST.
- Aceito: "Solicitação de envio aceita. A entrega ao destinatário ainda não foi confirmada." + "Identificador da notificação" (notification._id || notification.id || res._id || res.id). Nunca dizer "entregue" ou "lido" sem confirmação.
- Inconclusivo (timeout, rede, 502/503/504): "Não foi possível confirmar o resultado. A solicitação pode ter sido processada. Verifique antes de tentar novamente."
- "Novo envio": mantém o remetente e limpa destinatário, usuário, busca, template, valores, prévia e resultado.

==================================================================
11) ERROS (utils/errors.js)
==================================================================
normalizeError(source 'sunshine'|'support', err) → { source, sourceLabel, kind, status, code, apiTitle, headline, message }, lendo errors[0] ou error do responseJSON (texto cortado em 160 caracteres).
kind: config | auth_header (texto contém "invalid authorization header format": problema na montagem/substituição do cabeçalho, NÃO necessariamente chave inválida) | auth (401: verificar App ID, Key ID, segredo, região e acesso) | forbidden (403) | not_found (404) | rate_limit (429) | timeout | network ("Falha de rede ou endpoint incompatível") | server (5xx) | client.
Mensagens próprias para Sunshine e para Support. "Detalhes técnicos" recolhível só com status, código e título sanitizados; nunca headers, segredos, configurações ou JSON.stringify do erro. Falha na busca de usuários não impede o telefone manual; falha de autenticação Sunshine bloqueia o envio.

==================================================================
12) REGISTRO DO ENVIO NO OBJETO zendesk_labs_notifications_campaign_user (utils/enrich/*)
==================================================================
Contexto: o app do Zendesk Labs Notifications grava um registro por envio usando o notificationId como External ID (upsert) e preenche status e conversation_id. Ele SOBRESCREVE o campo notes com vazio a cada gravação. Por isso o app NÃO usa notes e grava o agente no campo próprio agent_sender.
Todas as chamadas pela sessão do agente (client.request, caminhos relativos /api/v2, sem credenciais Sunshine). Falha de registro nunca invalida nem repete o envio.

12.1 Schema (schema.js): GET /api/v2/custom_objects/zendesk_labs_notifications_campaign_user/fields (page[size]=100, paginando por meta.has_more + links.next), ignorando inativos e "standard::". Cache por sessão, descartado em caso de falha. Mapear por título normalizado (sem acento, minúsculas) e, para agent_sender, também pela key:
  - notification_id ← "Notification ID" (texto)
  - phone_number ← "Phone Number" (texto)
  - user_id ← "User ID" (texto, inteiro OU lookup com relationship_target_type "zen:user")
  - user_name ← "User Name" (texto)
  - agent_sender ← key agent_sender ou título "Agente remetente" (texto)
  - template_id ← "Campaign Template ID" (lookup para "zen:custom_object:zendesk_labs_notifications_template")
  - status e conversation_id: opcionais, só leitura.
  Campo ausente, ambíguo ou de tipo incompatível gera aviso ("Campo "X" não encontrado no objeto.") e o resto segue.

12.2 Template (enrich/template.js): mapear no objeto zendesk_labs_notifications_template os campos "Template" (JSON da Meta) e "Channels"; paginar os registros (máx. 30 páginas); ler name e language do JSON (aceitar objeto, array ou { template: {...} }; language string ou { code }); comparar nome exato e idioma normalizado (minúsculas, "-"→"_"). Coletar recursivamente chaves integration_id/integrationId do JSON de Channels: registros que contêm o integrationId usado têm prioridade; sem informação de canal valem como alternativa. Vincular só se houver UM candidato e a lista não estiver truncada; senão, aviso explicando o motivo. Cache por nome|idioma|integração. Nunca usar o ID de template da Meta.

12.3 Campos que o app grava (somente estes):
  notification_id = notificationId; phone_number = telefone E.164 enviado; user_id (respeitando o tipo do campo) e user_name = só se houver usuário vinculado ao telefone enviado; template_id = registro resolvido; agent_sender = "Nome Completo (email@dominio)" do currentUser (se faltar nome ou e-mail, aviso e não preenche).
  NUNCA enviar notes, status, conversation_id, campaign_id nem name (o objeto usa numeração automática).

12.4 Fluxo (enrich/index.js e campaignUser.js):
  a) Capturar antes do envio um snapshot: telefone, usuário vinculado, remetente, template, idioma, integrationId, horário ISO e agente (client.get('currentUser'): id, name, email).
  b) Com o notificationId em mãos, IMEDIATAMENTE fazer UPSERT:
     PATCH /api/v2/custom_objects/zendesk_labs_notifications_campaign_user/records?external_id={encodeURIComponent(notificationId)}
     { custom_object_record: { external_id: notificationId, custom_object_fields: { ...campos 12.3 } } }
     Nunca POST. (O Notifications faz upsert no MESMO registro, então não há duplicidade.)
  c) Sucesso → "Detalhes registrados" na hora, com os avisos de campo/template.
  d) Em segundo plano, sem travar a tela: a cada 3 s por até 90 s, GET .../records?filter[external_ids]={notificationId}&page[size]=100, exigindo external_id idêntico:
     - 1 registro com status OU conversation_id preenchido → linha discreta "Notifications confirmou: status <status>" (sem status: "conversa registrada");
     - mais de 1 registro → aviso de duplicidade e parar;
     - 90 s sem atualização → "Notifications ainda não atualizou o registro" + console.log com notificationId, quantidade de registros, campos lidos, chaves usadas e último erro.
  e) Se o upsert falhar: console.log e FALLBACK — esperar o registro do Notifications com espera crescente 1, 2, 3, 4, 5, 5, 5, 5 s por até 60 s (exigir unicidade; 401/403/404/422 param na hora, rede/429/5xx tentam de novo) e fazer PATCH /records/{id} só com os campos que mudaram.
  f) Erros viram mensagens claras (401, 403, 404, 422, 429, 5xx, rede).
  g) UI: abaixo da confirmação, "Registrando detalhes…" → "Detalhes registrados" ou "Registro pendente" com "Tentar registrar novamente" (refaz SÓ o registro) ao lado de "Novo envio". Ao clicar "Novo envio", tudo que ainda estiver rodando deixa de atualizar a tela (isStale).

==================================================================
13) LIMITES
==================================================================
Não implemente: campanhas, CSV ou envio em massa; agendamento; servidor externo; webhooks; upload de arquivos; criação/edição de templates; criação ou alteração de usuários, identidades ou tickets; mudanças de roteamento. A única escrita do app é o registro do envio no objeto do Notifications (seção 12).

==================================================================
14) VERIFICAÇÃO ANTES DA ENTREGA
==================================================================
Verifique no código e na montagem do payload: HEADER e BODY com {{1}} e valores diferentes; variáveis nomeadas com parameter_name; índices de botões; URL dinâmica sem url_type; valores com $; template sem variáveis; campos vazios; URL HTTPS incompleta ou privada; componente desconhecido; OTP; template com HTML no texto; telefone inválido; respostas antigas ignoradas; clique duplo; timeout sem repetição; telefones "55 (51) 98063-5211", "555192563778", "55 (11) 48717600" e "051995445802".
Com a configuração de teste preenchida, valide na conta: autenticação pelo proxy, listagem de remetentes, paginação de templates, busca de usuários, escolha entre vários telefones, desvínculo ao editar o número, mídia e botões, prévia, revisão e dimensões do painel. Nada de dados fictícios como prova de integração. Envio real só com destinatário e mensagem autorizados.
Entregue: arquivos criados, decisões, o que não foi testado e o que eu preciso ajustar manualmente (parâmetros, manifest).
```

---

## Depois que o App Builder terminar

1. Em **Configurações** do app gerado, preencha `scAppId`, `scKeyId`, `scKeySecret` e `scRegion`.
2. Publique com **Atualizar (Republicar)** e recarregue a aba do Agent Workspace (**Ctrl+Shift+R**). Sem recarregar, o agente continua rodando o código antigo.
3. Faça um envio de teste para um número seu e confira o registro conforme [`docs/02-validacao.md`](../docs/02-validacao.md).
4. Se aparecer **"Problema no cabeçalho de autenticação"**, revise `scopes: ["basic_auth"]` e o `domainWhitelist` do manifest.

## Diferença intencional em relação à V17
- **Espera do fallback:** 60 s em vez de 30 s. Nos testes, o Notifications levou até ~44 s para criar o registro.
