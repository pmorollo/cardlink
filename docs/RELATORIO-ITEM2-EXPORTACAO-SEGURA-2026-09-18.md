# CardLink — Relatório Item 2: Exportação Segura

**Data:** 18/09/2026

## Objetivo

Corrigir definitivamente o processo de geração de ZIP para impedir que pacotes de entrega ou backup incluam credenciais, banco local, dados pessoais, dependências e artefatos desnecessários.

## Correções aplicadas

1. `backend/scripts/make-zip.js` foi refeito com filtros explícitos de segurança.
2. `.env` e qualquer variante real `.env.*` são bloqueados; `.env.example` é preservado.
3. `backend/db/data.json`, bancos `.db`/`.sqlite`, chaves, certificados, logs, uploads locais e arquivos compactados são excluídos.
4. `node_modules`, `.git`, caches e pastas de IDE são excluídos.
5. Foi adicionada uma auditoria automática antes da compactação. Se um arquivo proibido estiver presente na área de exportação, o processo falha.
6. O caminho de saída passou a aceitar argumento e o script funciona em Windows e ambientes Unix.
7. `package.json` recebeu o comando `npm run export:zip`.

## Validação executada

O exportador foi executado contra uma cópia do projeto que continha propositalmente os arquivos locais existentes.

Resultado observado:

- `backend/.env`: **excluído**;
- `backend/db/data.json`: **excluído**;
- `node_modules`: **excluído**;
- `.env.example`: **mantido**;
- `backend/.env.example`: **mantido**;
- `package.json`: **mantido**;
- `backend/scripts/make-zip.js`: **mantido**.

O ZIP de teste foi criado com sucesso e inspecionado após a compactação.

## Regra operacional

A partir desta versão, pacotes CardLink para entrega, backup ou transferência devem ser gerados exclusivamente por:

```bash
npm run export:zip
```

Não usar compactação manual da pasta inteira quando houver `.env`, banco local ou dados de teste no diretório de trabalho.
