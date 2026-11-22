# Prompt 2 — App "Disparos WhatsApp do Solicitante" (barra lateral do ticket)

> App complementar, **somente leitura**. Mostra no ticket o histórico de templates enviados ao solicitante.
> Este é um segundo app opcional, já previsto no repositório. Seu código não veio no ZIP V17; o prompt foi preservado e precisa de homologação própria. As variações de telefone abaixo são para busca de histórico e não devem ser copiadas para a normalização de envio do app principal.
> Copie **todo o bloco abaixo** e cole num **novo** app do App Builder.

---

```text
Crie um app de SIDEBAR DO TICKET (location: ticket_sidebar) chamado "Disparos WhatsApp do Solicitante", que lista os envios individuais de templates WhatsApp feitos para o solicitante do ticket. Os envios ficam no objeto personalizado zendesk_labs_notifications_campaign_user. O app é SOMENTE LEITURA: nunca cria, altera nem apaga registros. Interface em português do Brasil, React + Zendesk Garden, respeitando o tema claro/escuro do Zendesk (getColor/tokens do tema, nada de cores fixas). Em todo <Alert> do Garden, use um único elemento filho (<div>) para evitar o erro React.Children.only.

1) IDENTIFICAÇÃO DO SOLICITANTE
- Ler o solicitante via client.get('ticket.requester') (id, name, email).
- Coletar todos os telefones: campo phone do usuário (GET /api/v2/users/{id}) e identidades do tipo phone_number (GET /api/v2/users/{id}/identities). Ignorar vazios e remover duplicados.
- Ouvir 'ticket.requester.changed' para recarregar quando o solicitante mudar.

2) NORMALIZAÇÃO E VARIAÇÕES DO TELEFONE (utils/phone.js, funções puras)
No objeto, Phone Number está salvo como "+55DDDNUMERO" (ex.: +5551999998888 ou +555192563778). Para cada telefone do solicitante:
- Remover tudo que não é dígito; remover prefixo "00" e zero de tronco/operadora no início (0XX51…, 051…).
- Se tiver 10 ou 11 dígitos (DDD + número, sem país), prefixar 55.
- Regra do nono dígito (Brasil, 55 + 2 dígitos de DDD + assinante):
  - assinante com 9 dígitos começando com 9 (celular atual) → gerar também a variação SEM o 9 (o WhatsApp de contas antigas registra o número sem o 9);
  - assinante com 8 dígitos começando com 6, 7, 8 ou 9 (celular no formato antigo) → gerar também a variação COM o 9 na frente;
  - assinante com 8 dígitos começando com 2, 3, 4 ou 5 → fixo, não mexer.
- Outros países: só os dígitos, sem regra do 9.
- Para cada variação gerar "+55…" e "55…". Resultado: lista única de candidatos.
- Incluir exemplos de teste: "(51) 99999-8888", "5199998888", "+55 51 9999-8888" e "555199998888" devem gerar candidatos que incluem "+5551999998888" e "+555199998888".

3) BUSCA
- POST /api/v2/custom_objects/zendesk_labs_notifications_campaign_user/records/search com filtro $or de $eq em custom_object_fields.phone_number para cada candidato (dividir em lotes se necessário). Paginar com page[after] até trazer tudo (limite 500).
- Buscar também por custom_object_fields.user_id igual ao id do solicitante (o app de envio grava esse lookup), para cobrir telefones em outro formato.
- Juntar e deduplicar por id do registro.
- Solicitante sem telefone: buscar só por user_id e mostrar aviso discreto "Solicitante sem telefone cadastrado; mostrando envios vinculados ao usuário".
- Template: template_id é lookup para zendesk_labs_notifications_template. Buscar os registros (GET .../zendesk_labs_notifications_template/records/{id}, cache em memória por id). O campo "template" guarda um JSON da Meta, ex.: {"name":"vc_esta_ai","components":[{"type":"BODY","text":"Oi, {{1}}, você está ai?"}],"language":"pt_BR","category":"MARKETING",...}. Fazer JSON.parse com try/catch e extrair: name, texto do componente BODY e, se existirem, textos de HEADER e FOOTER. Se o parse falhar, usar o name do registro do template. NUNCA exibir JSON cru. Não exibir idioma nem categoria.
- Tratar HTTP 429 com espera e repetição (backoff).

4) DADOS DE CADA ENVIO
- Título: nome do template (semibold).
- Data/hora do envio (created_at, dd/mm/aaaa hh:mm no fuso do agente: currentUser.timeZone.ianaName, com fallback para o fuso do navegador) em texto pequeno secundário.
- Texto do BODY num bloco tipo balão de mensagem (fundo levemente acinzentado do tema, raio 8px, fonte 13px), preservando variáveis {{1}}, limitado a 3 linhas com "ver mais".
- Metadados em duas colunas (rótulo cinza à esquerda, valor à direita): Agente (agent_sender), Telefone (phone_number), Destinatário (user_name), Status (texto simples, sem badge/cor: sent = Enviado, delivered = Entregue, read = Lido, failed = Falhou; outro valor = texto original).
- NÃO exibir Conversation ID nem Notification ID.
- "Ver detalhes" somente quando o template tiver HEADER ou FOOTER (mostrar esses textos); caso contrário, não exibir.
- Link "Abrir registro" (pequeno, com ícone de link externo) usando URL ABSOLUTA: obter client.get('currentAccount.subdomain') e montar https://{subdomain}.zendesk.com/agent/custom-objects/zendesk_labs_notifications_campaign_user/records/{id}, com target="_blank" rel="noopener noreferrer". (URL relativa abre no domínio do iframe *.apps.zdusercontent.com e quebra.)

5) FILTROS (no front, sobre os registros carregados)
- Busca livre com ícone de lupa em primeiro lugar, sem diferenciar maiúsculas/acentos: agente remetente, nome e texto do template, status, nome do destinatário e telefone.
- Atalhos de período como grupo pequeno de chips/segmented: 7d, 30d, 90d, Tudo (selecionado destacado).
- Datas De/Até recolhidas num link "Período personalizado" que expande.
- "Limpar filtros" como link discreto que só aparece com filtro ativo. Contador "X de Y envios".

6) VISUAL (moderno e elegante, sem exagero)
- Cabeçalho compacto: "N envios · último há X dias" em texto secundário + ação "Atualizar".
- Lista em linha do tempo: linha vertical sutil à esquerda e um ponto pequeno por envio (tom suave conforme status, sem badge); agrupada por mês com cabeçalho em caixa alta pequena e cor secundária; mais recente primeiro.
- Card: fundo da superfície do tema, borda 1px sutil, raio 8px, padding 12px, sombra leve só no hover.
- Espaçamento consistente 8/12/16px, base 14px, sem excesso de ícones ou cores. Paginação no front de 10 em 10 com "Carregar mais".
- Estados: skeleton no formato dos cards ao carregar; vazio com ícone discreto e "Nenhum disparo encontrado para este solicitante"; erro com "Tentar novamente".
- client.invoke('resize') para caber o conteúdo.

7) REGRAS TÉCNICAS
- client.request para todas as chamadas (sem tokens no código), caminhos relativos da API.
- Separar em utils/phone.js, utils/api.js (busca, paginação, cache), utils/template.js (parse do JSON), utils/filters.js e componentes (lista, card, filtros, estados).
- mock.js com dados de exemplo para a prévia do App Builder.
Compile a versão e relate arquivos e decisões. Não publique.
```

---

## Depois que o App Builder terminar

Quando decidir publicar, recarregue a aba do ticket (**Cmd+Shift+R no Mac; Ctrl+Shift+R no Windows/Linux**) e abra um ticket cujo solicitante já recebeu um template pelo app WhatsApp Individual. Valide separadamente a correspondência de usuário e telefones, a paginação e as permissões.

