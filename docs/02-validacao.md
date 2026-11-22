# Validação e solução de problemas

## Checklist de teste (envio real para um número seu)
1. Publicar a versão e **recarregar a aba do Agent Workspace (Ctrl+Shift+R)**.
2. Fazer um envio pelo app WhatsApp Individual.
3. Conferir no objeto *Zendesk Labs Campaign User*:
   - [ ] Existe **um único** registro com External ID = notificationId
   - [ ] Registro criado poucos segundos após o envio (upsert do app)
   - [ ] `status` e `conversation_id` preenchidos pelo Notifications (~10 s depois)
   - [ ] `user_id`, `user_name`, `phone_number`, `template_id`, `agent_sender` preenchidos
   - [ ] `agent_sender` continua preenchido depois que o status chega a `delivered` e `read`
4. No ticket do solicitante, o app "Disparos WhatsApp do Solicitante" mostra o envio e o link "Abrir registro" abre o registro.

Para conferir pela API (console do navegador numa aba logada do Zendesk):
```js
const r = await fetch('/api/v2/custom_objects/zendesk_labs_notifications_campaign_user/records?page%5Bsize%5D=5').then(r => r.json());
r.custom_object_records.map(x => ({ n: x.name, criado: x.created_at, atualizado: x.updated_at, ext: x.external_id, ...x.custom_object_fields }));
```

## Problemas já resolvidos (histórico)

| Sintoma | Causa | Solução |
|---|---|---|
| `React.Children.only expected to receive a single React element child` | `Alert` do Garden com vários filhos diretos | Envolver o conteúdo de todo `Alert` num único `<div>` |
| Busca de usuários descarta quase todos os telefones | `normalizePhone` exigia `+` | Regra conservadora só para candidatos do cadastro (55 + DDD + 8/9 dígitos, só adiciona o `+`) |
| "Campo 'User ID' não encontrado no objeto" | Campo lookup recriado com título "ID User" | Título exatamente `User ID` |
| Registro aparecia só ~30–45 s após o envio | O app só esperava o registro criado pelo Notifications (assíncrono) | Upsert imediato por External ID logo após o envio |
| Teste "não mudou nada" | Aba do Agent Workspace aberta com o código antigo | Recarregar com Ctrl+Shift+R após publicar |
| `notes` ficava vazio | O Notifications sobrescreve `notes` com null em cada gravação | Parar de usar `notes`; gravar o agente em `agent_sender` |
| "Abrir registro" abria `*.apps.zdusercontent.com/...` | URL relativa dentro do iframe do app | URL absoluta com `currentAccount.subdomain` |
| Template aparecia como JSON cru | Campo `template` guarda o JSON da Meta | `JSON.parse` e exibir `name` + texto do BODY |
