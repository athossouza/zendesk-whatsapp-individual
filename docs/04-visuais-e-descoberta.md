# Visuais, privacidade e descoberta do projeto

## Capturas reais dos apps

As imagens do README foram capturadas em 21/11/2026, no Chrome da operação, a partir dos apps instalados no Zendesk. Foi aberta a interface do WhatsApp Individual e consultado o histórico já existente do solicitante. Não foram preenchidos campos, enviados WhatsApps, salvos tickets, alterados registros ou modificadas configurações do Zendesk.

- A tela do app superior foi recortada para excluir o ticket e o restante do workspace.
- A imagem do histórico combina dois recortes do mesmo painel, antes e depois de rolar a página, para mostrar cabeçalho, filtros e o cartão completo.
- Nome/e-mail do agente, telefone e nome do destinatário foram substituídos por áreas opacas nos pixels da imagem. Os dados não estão sob uma camada removível nos arquivos publicados.
- As capturas completas não tratadas não fazem parte do repositório. As imagens finais não incluem número do ticket, endereço da instância ou conversa com o cliente.
- O status Lido aparece porque já existia no registro consultado; a animação não simula envio nem mudança de status.

## Motion graphics e arquivos

A apresentação foi construída localmente com HyperFrames 0.9.79, em 1920 × 1080, com 24 fps e duração de 14 s. A composição usa três cenas: envio, histórico e prompts. Interface frontal, cores originais, tipografia Inter, transições curtas e sem áudio para uso no README.

| Arquivo | Uso |
|---|---|
| [Visão geral](assets/whatsapp-zendesk-visao-geral.png) | Capa estática dos dois apps |
| [Apresentação animada](assets/whatsapp-zendesk-demo.gif) | Loop incorporado no README |
| [Versão MP4](assets/whatsapp-zendesk-demo.mp4) | Download da animação em formato mais compacto |
| [App de envio](assets/whatsapp-individual-app-envio.png) | Captura sanitizada do app superior |
| [Histórico no ticket](assets/whatsapp-individual-historico-ticket.png) | Captura sanitizada do app complementar |

O GIF é uma apresentação de telas, não uma gravação de um fluxo de envio. A fonte editável da composição permanece no projeto local de produção; os arquivos de distribuição acima são os publicados neste repositório.

## Organização para Google e ferramentas de IA

O README apresenta o problema resolvido, os recursos de cada app, a configuração, as dependências e os limites. Foram usados título e subtítulos descritivos, texto alternativo nas imagens, nomes de arquivo legíveis, FAQ e links diretos para as fontes técnicas. O conteúdo principal também existe em texto, sem depender de ler a animação.

Essas escolhas seguem as orientações de [conteúdo acessível e descritivo do Google Search](https://developers.google.com/search/docs/essentials) e a [documentação de READMEs do GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes). A descrição e os [tópicos do repositório](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) ajudam a identificar o assunto no próprio GitHub.

O [llms.txt](../llms.txt) é um resumo factual adicional com um mapa dos documentos. Não é uma instrução obrigatória para crawlers nem garante que algum mecanismo de IA o use. Não foram adicionados blocos ocultos de palavras-chave, avaliações inventadas ou marcação estruturada incompatível com o README do GitHub.

A disponibilidade pública permite acesso por visitantes e crawlers. Indexação, frequência de rastreamento, posição no Google e inclusão em respostas de IA dependem de cada serviço; não foram comprovadas nem prometidas nesta entrega.
