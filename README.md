# Zendesk WhatsApp Individual — prompts para o App Builder

Prompts prontos para recriar, em qualquer instância Zendesk, a solução de **envio individual de templates WhatsApp** pelo agente, com registro do envio no objeto do Zendesk Labs Notifications e histórico no ticket.

| App | Location | O que faz | Prompt |
|---|---|---|---|
| **WhatsApp Individual** | Barra superior | Agente escolhe o WhatsApp remetente, o destinatário (busca no Zendesk ou telefone), um template aprovado, preenche as variáveis e envia pela Notification API do Sunshine Conversations. Registra o envio no objeto `zendesk_labs_notifications_campaign_user` na hora. | [`prompts/01-app-whatsapp-individual.md`](prompts/01-app-whatsapp-individual.md) |
| **Disparos WhatsApp do Solicitante** | Barra lateral do ticket | Lista, em linha do tempo, os templates enviados ao solicitante (busca por telefone com regra do nono dígito e por usuário), com filtros de período e busca livre. Somente leitura. | [`prompts/02-app-disparos-sidebar.md`](prompts/02-app-disparos-sidebar.md) |

## Como usar
1. **Prepare a instância:** [`docs/01-pre-requisitos.md`](docs/01-pre-requisitos.md) — app do Zendesk Labs Notifications, campo `User ID` como lookup, campo `agent_sender`, credenciais do Sunshine Conversations.
2. **Crie o app WhatsApp Individual:** cole o Prompt 1 num novo app do App Builder, preencha os parâmetros e publique.
3. **Crie o app da barra lateral:** cole o Prompt 2 num segundo app do App Builder e publique.
4. **Valide:** [`docs/02-validacao.md`](docs/02-validacao.md) — checklist de teste e problemas já resolvidos.

> Sempre recarregue a aba do Agent Workspace (**Ctrl+Shift+R**) depois de publicar uma versão nova.

## Arquitetura do registro
```
Agente ──envia──▶ Notification API (Sunshine) ──▶ WhatsApp
   │                     │ notificationId
   │                     ▼
   └─ App: PATCH records?external_id={notificationId}   (upsert imediato: user, telefone, template, agent_sender)
                         ▲
Zendesk Labs Notifications ─ upsert no MESMO registro ─ status, conversation_id (e zera notes)
                         │
App sidebar do ticket ◀── lê os registros pelo telefone/usuário do solicitante
```

## Decisões importantes
- **Upsert por External ID, nunca POST:** o app e o Notifications gravam o mesmo registro, sem duplicidade.
- **`notes` não é usado:** o Notifications sobrescreve esse campo a cada gravação. O agente remetente fica em `agent_sender`.
- **Telefone:** envio exige E.164 estrito; no histórico, a busca gera variações com e sem o nono dígito.
- **Sem reenvio automático:** falhas de registro nunca repetem a mensagem.

---
Athos Alves de Souza — Arquiteto Técnico Zendesk AI e CX — [consultor.cx](https://consultor.cx)
