# Referência V17 preservada

`whatsappIndividual-V17.zip` é uma cópia exata do arquivo fornecido por Athos. Não foi recompilado nem modificado nesta revisão. SHA-256:

```text
fd52a30a996db23347feb3498bf6cc44376d9298fee95aa31648ddc00c556375
```

Contém `manifest.json`, `assets/index.html`, dois logos, o ícone top_bar e `translations/en.json`. O HTML inclui o bundle compilado, com marcadores `// vfs:` que permitem localizar os módulos. Não contém os arquivos JSX originais como projeto de desenvolvimento. A versão do manifesto é `1.0`; “V17” é a identificação do pacote/histórico fornecido.

É uma referência de comportamento, não um pacote corrigido para instalar sem revisão em outra conta. O manifesto tem `domainWhitelist: []` e omite `scopes`; o prompt atualizado descreve a configuração documentada para uma nova geração. O bundle ainda contém um resize inicial de 100% × 550 px antes do resize de 440 × 600 px.

O app de sidebar não está neste ZIP. A exportação de conversa original não foi incluída no repositório: a auditoria resume os requisitos sem republicar IDs de conta, URLs de anexos ou conteúdo interno de raciocínio do App Builder.

Veja [auditoria](../docs/03-auditoria-v17.md) e [validação](../docs/02-validacao.md).
