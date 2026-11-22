# Auditoria do Disparos WhatsApp do Solicitante — V3

Revisão em **21/11/2026, horário de São Paulo**, após Athos fornecer a referência que faltava na primeira auditoria. Base remota desta etapa: `9476b56a01a22afdf94874c85aee78ac0e6f5869`.

## Evidência agora disponível

- Exportação `ai-app-builder-conversation-2026-11-22T02_46_24.755Z.json`: 8 mensagens, incluindo pedido inicial, aprovação e duas rodadas de ajustes, datadas de 19/11/2026 em UTC.
- [Pacote V3 original](../reference/disparosWhatsappDoSolicitante-V3.zip): manifesto, HTML com bundle compilado, dois logos e tradução. SHA-256: `7336850d42363389824898235ec0b8da12a18ae1eb2248d372fd6feff216dd24`.
- Manifesto: `ticket_sidebar`, `flexible: true`, sem parâmetros de credenciais; versão interna `1.0`. “V3” identifica o pacote, não o campo version do manifesto.
- Capturas reais obtidas na etapa anterior, sem enviar mensagens ou editar dados do Zendesk. Elas mostram a instalação observada; não comprovam todas as condições de erro ou que ela é byte a byte igual ao ZIP.

A exportação foi tratada como histórico da especificação. Os pedidos antigos de criar/publicar e os conteúdos de raciocínio do App Builder não foram executados nem republicados. O ZIP foi preservado sem mudanças.

## Fluxo final confirmado no código

1. Lê solicitante, subdomínio da conta e fuso do agente via ZAF.
2. Obtém phone do usuário e identidades phone_number.
3. Gera candidatos brasileiros com/sem nono dígito e com/sem `+`.
4. Consulta registros pelo telefone e pelo `user_id`, usando POST de pesquisa; une por ID e ordena por data.
5. Resolve registros de template em lotes de 5, faz parse do JSON e extrai nome, BODY, HEADER e FOOTER textuais.
6. Exibe timeline, busca sem acentos, atalhos de período, datas recolhidas e paginação visual de 10.
7. Mostra Agente, Telefone, Destinatário e status traduzido em texto simples. Omite idioma, categoria e IDs de notificação/conversa.
8. Usa link absoluto para o registro; Ver detalhes fica restrito a cabeçalho/rodapé quando existem.

Não há chamada de envio de WhatsApp nem escrita de registros no fluxo da sidebar. **POST `/records/search` é uma leitura**, diferente de POST `/records` de criação, conforme a [API oficial de registros](https://developer.zendesk.com/api-reference/custom-data/custom-objects/custom_object_records/).

## Comparação com a evolução da conversa

| Requisito | Situação da V3 |
|---|---|
| Retirar IDs e botões Copiar dos cards | Confirmado |
| Retirar badge de status e traduzir quatro valores conhecidos | Confirmado |
| Interpretar JSON do template, sem exibi-lo cru | Confirmado para objeto de topo com componentes textuais |
| Retirar idioma/categoria de todos os lugares | Confirmado |
| Link absoluto com subdomínio ZAF | Confirmado; depende de conseguir ler o subdomínio |
| Timeline com ponto, busca, filtros e datas recolhidas | Confirmado |
| Cabeçalho compacto e paginação de 10 | Confirmado |
| Contador X de Y solicitado inicialmente | Ausente: há resumo geral, mas não contador filtrado |

## Limitações encontradas e requisitos acrescentados ao prompt

| Tema | Código da V3 | Nova especificação |
|---|---|---|
| Troca do solicitante | Escuta `ticket.requester.changed` | Usar `ticket.requester.id.changed`, explicitamente documentado |
| Telefones internacionais | Remove o `+` antes de classificar; qualquer tamanho 10/11 pode receber 55 | Preservar o DDI explícito antes das heurísticas brasileiras |
| Múltiplos telefones no mesmo campo | Remove todos os não dígitos, podendo concatenar números | Separar por delimitadores explícitos |
| Falha em identidades | Promise.all rejeita toda a leitura e impede até a pesquisa por usuário | Tratar fontes separadamente e pesquisar por user_id apesar da falha |
| Paginação de identidades | Apenas uma página | Percorrer a paginação e sinalizar parcialidade |
| Campos personalizados | Keys fixas, sem conferir schema | Validar keys/títulos/tipos e destinos de lookup por leitura |
| Associação pelo telefone | Aceita registro encontrado sem comparar seu user_id | Descartar vínculo explícito com outro solicitante; manter telefone sem vínculo como compatibilidade documentada |
| Limite de 500 | Prioriza lotes de telefone, pode nem consultar user_id; sem aviso de corte | Priorizar vínculo por usuário, avisar resultados limitados e não alegar completude |
| Paginação da pesquisa | Sem proteção de cursor repetido/página vazia inconsistente | Interromper e mostrar parcialidade, sem loop indefinido |
| Status na busca | Busca apenas sent/delivered/read/failed, não o rótulo traduzido | Buscar também Enviado/Entregue/Lido/Falhou |
| Datas | Exibe no fuso do agente, mas filtra por datas no fuso do navegador | Usar o mesmo fuso e validar datas reais/invertidas |
| Erro técnico | Pode mostrar responseText/JSON completos | Mensagens curtas, sanitizadas e sem objeto bruto |
| Cache de templates | Falha é ocultada e cacheada como fallback; Atualizar não limpa cache | Explicitar falha, permitir recuperação e invalidar cache |
| Ver mais | Heurística de 150 caracteres ou mais de 3 quebras | Detectar overflow real após layout/redimensionamento |
| Altura do iframe | Resize no efeito do App; mudança local de filho pode não dispará-lo | ResizeObserver no conteúdo, com limpeza e proteção contra ciclo |
| Desmontagem | Remove listener, mas não invalida requestRef no cleanup | Invalidar também as respostas pendentes e timers |
| Alert de erro | Título, parágrafo e botão como filhos diretos | Filho único, conforme a prevenção adotada no app principal; renderização Garden ainda precisa de teste |

A [lista oficial de eventos de ticket](https://developer.zendesk.com/api-reference/apps/apps-support-api/ticket_sidebar/#ticket-change-events) inclui `ticket.requester.id.changed`; não lista `ticket.requester.changed`. Isso fundamenta a correção do prompt, sem afirmar que foi reproduzida uma falha do listener na conta. A [API de identidades](https://developer.zendesk.com/api-reference/ticketing/users/user_identities/) distingue `phone_number` de identidades de Messaging.

Seis limitações foram caracterizadas localmente: normalização internacional, busca pelo rótulo Lido, ausência de paginação de identidades, bloqueio após erro dessa fonte, falha de template cacheada e concatenação de múltiplos telefones. As demais observações resultam da leitura do código; não foram reproduzidas na interface instalada.

## Testes e limites

Execute na raiz, com Node.js 18+ e `unzip`:

```sh
node scripts/verificar-sidebar.mjs
```

O script lê trechos reais do bundle em VM com requisições substituídas, confere a integridade do ZIP e a correspondência entre `.md` e `.txt`. Verifica telefones, templates, filtros, datas, status, lotes, cursores, deduplicação, cache e retry; também registra explicitamente limitações existentes sem apresentá-las como correções já feitas.

Não executa React/Garden, não entra no Zendesk, não altera tickets e não envia mensagens. Os requisitos novos foram adicionados ao [prompt completo](../prompts/02-app-disparos-sidebar.txt), mas ainda precisam ser gerados e validados na conta. A versão instalada não foi alterada.

## Estado atual da documentação

A antiga ressalva “não recebemos o código da sidebar” foi resolvida. Agora há **duas referências completas**: V17 do envio e V3 do histórico. Os prompts consolidam as decisões finais e identificam suas melhorias sobre os pacotes originais.

O README passou a usar apenas composições gráficas estáticas, conforme o esclarecimento de Athos. GIF e MP4 foram retirados da versão atual do repositório; os commits anteriores continuam no histórico normal do Git.
