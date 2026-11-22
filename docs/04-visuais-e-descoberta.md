# Composições gráficas estáticas e descoberta do projeto

## Nome e formato dos visuais

Os prints são apresentados como **composições gráficas de produto**, também chamadas de **product showcases estáticos**: telas reais enquadradas com tipografia, sombras, hierarquia e contexto. O README não incorpora GIF ou vídeo.

| Arquivo | Uso |
|---|---|
| [Visão geral](assets/whatsapp-zendesk-visao-geral.png) | Capa estática dos dois apps |
| [App de envio — composição](assets/whatsapp-individual-envio-showcase.png) | Apresentação do WhatsApp Individual |
| [Histórico — composição](assets/whatsapp-individual-historico-showcase.png) | Apresentação do Disparos WhatsApp do Solicitante |
| [App de envio — captura](assets/whatsapp-individual-app-envio.png) | Tela sanitizada para leitura em detalhe |
| [Histórico — captura](assets/whatsapp-individual-historico-ticket.png) | Tela sanitizada para leitura em detalhe |

As composições reaproveitam os layouts estáticos já aprovados, com pixels originais da interface, sem inclinação, correção de cores ou recriação de controles. A produção anterior havia incluído animação; após o esclarecimento do formato desejado, GIF e MP4 foram removidos da versão atual. Isso não reescreve os commits anteriores.

## Origem e privacidade

As capturas foram obtidas em 21/11/2026 no Chrome da operação. Foi aberta a interface do WhatsApp Individual e consultado o histórico existente do solicitante. Não foram preenchidos campos, enviados WhatsApps, salvos tickets, alterados registros ou modificadas configurações do Zendesk.

A imagem do histórico combina dois recortes do mesmo painel em diferentes posições de rolagem. Nome/e-mail do agente, telefone e nome do destinatário foram removidos dos pixels antes da composição; não há uma camada removível com os dados por baixo. Capturas completas não tratadas não são publicadas. Os visuais não incluem número do ticket, endereço da instância ou conversa com o contato.

O status Lido já estava presente no registro consultado. A imagem não comprova um novo envio nem que toda instância terá o mesmo resultado. Confira as auditorias da [V17](03-auditoria-v17.md) e da [sidebar V3](05-auditoria-sidebar-v3.md).

## Organização para Google e ferramentas de IA

O README mantém benefícios, recursos, dependências, instalação, FAQ e limites em texto acessível, com títulos descritivos, nomes de arquivos legíveis, texto alternativo e links para os prompts e auditorias. A descrição e os tópicos identificam o assunto no GitHub.

Essas escolhas são coerentes com as orientações de [conteúdo descritivo do Google Search](https://developers.google.com/search/docs/essentials) e com os [READMEs do GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes). O [llms.txt](../llms.txt) é um mapa factual adicional, sem garantir uso por crawlers ou mecanismos de IA.

O repositório é público. Indexação, frequência de rastreamento, posição no Google e inclusão em respostas de IA dependem de cada serviço e não foram comprovadas nem prometidas.
