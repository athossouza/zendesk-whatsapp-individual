# Validação na nova conta

Esta é uma lista de testes a executar; não é um relatório de homologação já realizada. A [auditoria](03-auditoria-v17.md) registra o que foi efetivamente conferido.

## Antes de enviar

1. Conclua os [pré-requisitos](01-pre-requisitos.md). Copie o [prompt completo](../prompts/01-app-whatsapp-individual.txt) para um novo app `top_bar` no App Builder.
2. Configure os quatro parâmetros; confira segredo seguro, scopes e hosts no manifesto. Não use a prévia com mock como prova de integração.
3. Verifique o diagnóstico dos objetos: campos, lookup `zen:user`, `agent_sender`, Name automático e permissões. Execute também como agente comum. Pendências devem ser visíveis sem invalidar as consultas Sunshine independentes.
4. Teste leitura real de remetentes, templates com paginação e busca de usuários. Confira estados de erro e lista vazia; não podem ser confundidos.
5. Confira telefones sem `+` no cadastro, múltiplos telefones, correção manual, troca de usuário e respostas antigas. Editar o telefone deve remover o vínculo com o usuário.
6. Confira templates de texto, mídia por URL, variáveis nomeadas e posicionais, botões e revisão. Um template incompatível deve aparecer com o motivo e envio bloqueado.
7. Publique quando decidir liberar o teste e recarregue o Agent Workspace: **Cmd+Shift+R no Mac**, **Ctrl+Shift+R no Windows/Linux**.

## Um envio controlado e autorizado

Use um número de teste sob seu controle e uma mensagem aprovada por você. Não execute disparos automaticamente durante a geração do app.

- [ ] Um clique em Confirmar produz apenas um POST Sunshine; clique duplo é bloqueado.
- [ ] Aceitação mostra `notificationId`, sem alegar entrega ou leitura.
- [ ] O registro aparece após o PATCH de upsert por External ID. O envio permanece aceito se o registro falhar.
- [ ] Existe um único registro com `external_id` **exatamente igual** ao identificador retornado. O campo customizado Notification ID é separado do External ID padrão.
- [ ] `phone_number` é o E.164 enviado; `agent_sender` é o agente logado no formato nome/e-mail.
- [ ] `user_id`/`user_name` aparecem apenas com destinatário selecionado ainda vinculado. Um envio manual não deve inventar vínculo nem apagar valores existentes sem necessidade.
- [ ] `template_id` referencia o registro do objeto de templates correto, não o ID Meta. Ausência/ambiguidade vira aviso.
- [ ] O payload do app não contém `notes`, `status`, `conversation_id`, `campaign_id` ou `name`.
- [ ] O serviço Notifications atualiza status ou Conversation ID no **mesmo registro**, preservando o contexto do app. Inspecione também depois de delivered/read, se esses eventos ocorrerem.
- [ ] O watcher mostra confirmação quando encontra o primeiro desses campos, ou aviso após até 90 s; ele só lê, não acompanha continuamente todos os eventos de entrega.
- [ ] Falha de upsert usa fallback; "Tentar registrar novamente" repete somente registro, nunca WhatsApp.
- [ ] "Novo envio"/desmontagem descartam callbacks antigos. O watcher no iframe não é um serviço permanente: fechar/recarregar encerra sua execução.

Teste falhas em ambiente isolado, com respostas simuladas: 401/403/404/422/429, rede, timeout do POST, erro de schema, template ambíguo, duplicidade, truncamento e expiração dos prazos. Identifique explicitamente esses testes como simulados. Não altere credenciais ou permissões de produção para provocar erros.

## Conferência somente leitura no contexto ZAF

Execute no console **do iframe deste app**, onde `window.zafClient` existe, ou adapte para o ambiente de teste ZAF. Substitua apenas o identificador; isso não envia mensagens nem altera registros:

```js
const notificationId = 'COLE_O_ID_RETORNADO';
const query = new URLSearchParams({ 'filter[external_ids]': notificationId, 'page[size]': '100' });
const result = await window.zafClient.request({
  url: '/api/v2/custom_objects/zendesk_labs_notifications_campaign_user/records?' + query,
  type: 'GET'
});
const records = (result.custom_object_records || []).filter(r => r.external_id === notificationId);
console.table(records.map(r => ({
  id: r.id,
  external_id: r.external_id,
  ...r.custom_object_fields
})));
```

Essa inspeção contém dados de usuários e agentes; não a publique como log de diagnóstico. Se a resposta indicar outra página, percorra-a antes de concluir unicidade.

## Sintomas e ações

| Sintoma | Conferir |
|---|---|
| `React.Children.only` | `Alert` com filho único; mensagens dinâmicas em `span`; erros dos inputs em `p` nativo |
| Telefone cadastrado é rejeitado | Só adicionar `+` se já houver DDI brasileiro inequívoco; formato local exige correção manual |
| Campo User ID ausente | Título `User ID`, campo ativo e único; lookup com destino `zen:user` |
| HTTP 403 no registro | Leitura de schema e permissões de criar/editar registros para o agente |
| HTTP 422 no upsert | Name automático, campos obrigatórios adicionais, tipos e destinos dos lookups |
| Cabeçalho inválido / HTTP 401 Sunshine | Proxy, scopes no parâmetro seguro, whitelist sem protocolo, App ID/Key ID/segredo/região da mesma conta |
| Detalhes registrados, status vazio | Verificar Relay e correlação por External ID; o upsert do app não comprova que Notifications está ativo |
| `notes` vazio | Esperado no histórico da referência; este app usa `agent_sender` e não reaplica Notes |
| `template_id` vazio | Registro existente no Relay com JSON legível, nome/idioma/canal e correspondência única |
| Interface não mudou | Recarregar Agent Workspace após publicar |

O app de histórico na sidebar é opcional e tem [prompt separado](../prompts/02-app-disparos-sidebar.md). Seu código e a conversa estão disponíveis no pacote V3; consulte a [auditoria da sidebar](05-auditoria-sidebar-v3.md) e valide a nova geração separadamente.


## Validação específica da sidebar V3 e da nova geração

A [referência V3](../reference/disparosWhatsappDoSolicitante-V3.zip) foi analisada; as melhorias do [novo prompt](../prompts/02-app-disparos-sidebar.txt) ainda precisam ser implementadas pelo App Builder e verificadas:

- [ ] Identifica o solicitante do ticket sem solicitar credenciais Sunshine; consultas usam a sessão do agente.
- [ ] Lê `phone_number` das identidades com paginação e consulta registros por `user_id` mesmo se uma fonte de telefone falhar.
- [ ] Não mostra registros vinculados explicitamente a outro usuário apenas por coincidência de telefone; avisa sobre resultados parciais e o limite global.
- [ ] Nome e BODY do template vêm do JSON, preservando marcadores; HEADER/FOOTER aparecem só em Ver detalhes. Não mostra idioma, categoria ou IDs de notificação/conversa.
- [ ] Exibe status em português e encontra `read` ao buscar por “Lido”. Filtros de data usam o fuso da exibição e rejeitam intervalo inválido.
- [ ] Contador X de Y, paginação de 10, ver mais por overflow e resize funcionam sem cortar o card, inclusive ao expandir conteúdo.
- [ ] Abrir registro leva à instância correta em nova aba; subdomínio ausente não gera link relativo ao iframe.
- [ ] Atualizar invalida caches; falha temporária de template pode se recuperar. Troca de solicitante e desmontagem invalidam respostas anteriores.
- [ ] A rede contém apenas GETs e POSTs de `/records/search`; não há criação, atualização, exclusão ou envio de WhatsApp.

Use um ticket já existente e os registros disponíveis para a verificação de leitura. Não altere o solicitante de um ticket nem crie/envie dados só para reproduzir um cenário; condições de troca, erro e concorrência devem ser simuladas nos testes isolados.

Verificações locais da referência:

```sh
node scripts/verificar-sidebar.mjs
```

O resultado distingue **20 cenários de comportamento** de **6 limitações confirmadas**. Uma limitação caracterizada não significa que foi corrigida no ZIP ou no app instalado; veja a [auditoria](05-auditoria-sidebar-v3.md).
