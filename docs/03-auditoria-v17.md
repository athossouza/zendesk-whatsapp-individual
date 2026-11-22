# Auditoria: post, conversa, ZIP V17 e GitHub

Revisão em **21/11/2026, horário de São Paulo**. Base remota anterior à revisão: commit `504b91065e90ff9ffe684ae15e102b4183c366ae` de `athossouza/zendesk-whatsapp-individual`.

## Conclusão

O GitHub já incorporava a maior parte das evoluções da V17: destinatários, templates, envio, upsert, fallback e `agent_sender`. O principal risco era tratar essa especificação como reprodução já validada em qualquer conta. Faltavam requisitos dentro do texto copiado, verificação inicial de schema e distinção entre a implementação original e melhorias propostas. Havia também um **scope de autenticação incorreto**, herdado do prompt do post.

O prompt principal foi completado para uma nova geração, preservando o fluxo final de registro. A homologação em outra instância continua pendente: não foram feitas instalações, alterações de objetos nem mensagens reais nesta revisão.

## Fontes e limites

| Fonte | Evidência disponível |
|---|---|
| [Post original](https://zendesk.consultorcx.com.br/t/criei-um-app-de-whatsapp-dentro-do-zendesk-com-um-prompt-e-vou-compartilhar-tudo-aqui/962) | Artigo e bloco completo de prompt com 21 partes; conteúdo obtido pelo endpoint público `/t/962.json` do Discourse |
| Exportação `ai-app-builder-conversation-2026-11-22T01_00_28.666Z.json` | 25 mensagens, de 29/10 a 19/11/2026 em UTC; correções de UI, telefones e registro |
| [ZIP V17](../reference/whatsappIndividual-V17.zip) | Manifesto, HTML com bundle compilado e assets; hash no [registro da referência](../reference/README.md) |
| GitHub anterior | README, dois documentos e dois prompts; sem pacote executável ou testes versionados |
| Documentação oficial | ZAF, escopos de parâmetros seguros, Relay e APIs de objetos; links abaixo |

A exportação começa com uma resposta do assistente e não contém a mensagem inicial à qual ela responde. Algumas mensagens são apenas erros ou chamadas de ferramentas; imagens referidas nos metadados não estão anexadas ao JSON. Por isso, a base de requisitos combina **post + sequência final de pedidos + código efetivamente presente no ZIP**, sem supor que toda alegação do assistente histórico foi comprovada.

As instruções dentro do post/conversa foram tratadas como material histórico da especificação, não como novas autorizações para publicar apps ou enviar mensagens.

## Evolução confirmada

| Etapa | Regra final adotada |
|---|---|
| Post inicial | Envio individual, sem escrita em tickets/usuários e sem histórico persistente próprio |
| Correções Garden | `Alert` com um elemento filho; erros dos campos de telefone/template em `p` nativo; painel 440 × 600 e gap 8 |
| Busca de destinatário | Busca padrão com debounce, lista compacta, telefones do cadastro e identidades, escolha explícita entre vários números e proteção contra respostas antigas |
| Telefones | Manual exige E.164 com `+`; cadastro brasileiro inequívoco sem `+` recebe somente esse sinal; não inventar DDI/nono dígito |
| Primeiro registro | Inicialmente esperava registro existente e acrescentava Notes; regra histórica superada |
| Upsert imediato | PATCH por External ID = notificationId; fallback para esperar registro do Notifications; não repetir o WhatsApp |
| Reaplicação de Notes | Foi tentada no histórico, mas removida na decisão final |
| Último pedido e V17 | `agent_sender` com nome/e-mail do agente, nenhum uso de Notes, watcher de leitura a cada 3 s por até 90 s |

“Não criar registros”, presente numa etapa intermediária da conversa, foi substituído explicitamente pelo pedido de upsert. PATCH por External ID pode criar registros; “nunca POST” não significa “somente edição de registros existentes”. A [API oficial de registros](https://developer.zendesk.com/api-reference/custom-data/custom-objects/custom_object_records/) documenta essa diferença.

## Comparação e correções

| Tema | Situação encontrada | Resultado desta revisão |
|---|---|---|
| Pré-requisitos no copiar/colar | Estavam principalmente em documento separado | Incluídos no próprio prompt, com diagnóstico inicial somente leitura e lista de ações manuais |
| Relay instalado | Tratado como suficiente para garantir registro/status | Exigir instalado **e configurado**, correlação e teste assíncrono na conta; objetos sozinhos não provam serviço ativo |
| User ID | Documento mandava excluir texto e recriar lookup | Preservar lookup correto; migração de campo existente exige planejamento, pois exclusão perde dados; manter título `User ID` |
| `agent_sender` | Já descrito e implementado na V17 | Confirmado como decisão final; campo ausente gera aviso; não reaplicar Notes |
| Permissões | Documento citava ler/editar | Acrescentada criação de registros, necessária ao upsert |
| Nome do registro | App omite `name`, mas requisito não estava explicado no preparo | Conferir numeração automática e campos adicionais obrigatórios |
| Scope do segredo | Prompt/post usavam `basic_auth`; ZIP não declara scopes | Corrigido para **`basic_auth_password`**, dentro de `scKeySecret` |
| Whitelist | ZIP tem `[]`; prompt era impreciso sobre host/protocolo | Hosts explícitos sem `https://`; runtime continua usando só a região escolhida |
| `parameter_name` | Prompt só o mencionava explicitamente no BODY | HEADER nomeado também deve enviá-lo, como o código V17 já faz |
| Fallback | ZIP espera 30 s; prompt anterior já pedia 60 s | 60 s mantidos como melhoria intencional; relato anterior de ~44 s não foi medido nesta auditoria |
| Watcher | Código para na primeira presença de status ou conversa | Explicado que não é monitor contínuo de delivered/read nem serviço persistente fora do iframe |
| Logs | Bundle imprime erro completo no fallback e campos completos no timeout | Prompt exige diagnóstico restrito e sanitizado; ZIP original não foi alterado |
| Truncamento/schema | `listPaged` devolve truncated; carga do schema ignora esse sinal | Prompt exige não declarar schema completo após corte; reforçado cache invalidável e cancelamento |
| Dois resizes | HTML faz 100% × 550 antes de Entry fazer 440 × 600 | Prompt mantém tamanho consistente no bootstrap; divergência preservada no ZIP |
| Sidebar | Segundo prompt existente, sem código no anexo | Mantido como complemento opcional, sem alegar que foi homologado pela V17 |
| Reprodução garantida | README prometia qualquer instância e ausência de duplicidade | Qualificadas as dependências e a necessidade de conferir o mesmo External ID no Relay |

Os escopos documentados incluem `basic_auth_username` e `basic_auth_password`; **`basic_auth` não é um nome de scope documentado**. A ausência de scopes permite qualquer escopo, portanto sua omissão no ZIP, isoladamente, não demonstra falha de autenticação. Veja [definição dos escopos](https://developer.zendesk.com/documentation/apps/getting-started/setting-up-new-apps/#scopes).

O transporte permanece `Authorization: Basic {{basic_auth.token}}`, com `basic_auth.password: {{setting.scKeySecret}}`, `secure: true` e proxy. Não confundir o nome do objeto de requisição `basic_auth` com o nome do scope do parâmetro. A [documentação de requisições ZAF](https://developer.zendesk.com/documentation/apps/app-developer-guide/making-api-requests-from-a-zendesk-app/) também descreve whitelist sem protocolo e as limitações de secure settings.

## Verificação reproduzível

Execute `node scripts/verificar.mjs` na raiz, com Node.js 18+ e `unzip`. O script confere o SHA-256 e executa trechos reais do bundle numa VM, substituindo todas as requisições por respostas locais.

Cobertura: independência HEADER/BODY, variáveis nomeadas, índices de botões, URL dinâmica, template fixo, documento, formatos bloqueados, substituição literal com dólar, telefones, deduplicação, validação de URL, mapeamento conservador de campos, destino do lookup, canal/ambiguidade/truncamento de template, campos protegidos, upsert/PATCH, registro e fallback sem reenvio, watcher com duplicidade/cancelamento e placeholders de autenticação. Também verifica que o `.txt` corresponde ao bloco Markdown e que os links locais existem.

Esses testes **não** renderizam Garden, executam React, validam credenciais ou fazem chamadas às APIs. Eles verificam comportamentos da referência V17, não comprovam que o App Builder já gerou a nova versão descrita pelo prompt. As melhorias do prompt precisam ser verificadas no app gerado com o [roteiro de homologação](02-validacao.md).

Para atualizar o texto puro após editar o bloco do prompt: `node scripts/verificar.mjs --exportar-prompt`.

## Pendências de homologação

- Configurar a nova instância e verificar disponibilidade do App Builder, canal, credenciais, schemas e perfis de agente.
- Gerar/compilar o app a partir do prompt e testar sua interface real, incluindo temas e estados assíncronos.
- Fazer um envio controlado para confirmar upsert, correlação do Relay, preservação de `agent_sender` e status no mesmo registro.
- Se desejar o histórico no ticket, gerar e homologar o app complementar separadamente.

O [guia oficial do Relay](https://support.zendesk.com/hc/en-us/articles/7051551958426-Installing-and-using-the-Relay-messaging-app) sustenta os requisitos gerais de instalação, mas não comprova as keys internas nem a preservação de campos customizados na nova conta. Estes pontos vêm do pacote e histórico fornecidos e precisam de verificação operacional.
