# CardLink — Pacote de transferência

Este pacote contém o código-fonte completo do CardLink na versão de referência de 7 de setembro de 2026, incluindo frontend, backend, testes, documentação, imagens, criativos e arquivos de configuração versionados.

Comece por:

1. `CardLink-Descritivo-Tecnico.md`
2. `README.md`
3. `docs/README.md`
4. `docs/PLANO-TESTE-SEMANA-1.md`

## Segurança

Credenciais, segredos, arquivos `.env`, metadados internos do Git e dados privados de produção não integram este ZIP. As variáveis necessárias estão documentadas sem seus valores.

## Dados de produção

O banco PostgreSQL, os uploads privados armazenados no volume da Railway e eventuais objetos do Cloudflare R2 precisam ser exportados por procedimento separado, com autorização e proteção adequadas. Eles não fazem parte do repositório de código.

## Instalação inicial

```bash
npm ci
npm test
npm start
```

Não use o armazenamento JSON local como substituto do PostgreSQL em produção.

## Exportação segura do projeto

Para gerar um pacote de entrega/backup sem credenciais e sem dados locais, use:

```bash
npm run export:zip
```

O exportador `backend/scripts/make-zip.js` bloqueia automaticamente, entre outros:

- `.env` e variantes reais de ambiente (preserva somente `.env.example`);
- `backend/db/data.json`, SQLite e bancos locais;
- `node_modules`, `.git`, caches e pastas de IDE;
- chaves/certificados (`.pem`, `.key`, `.p12`, `.pfx`, etc.);
- uploads locais, logs e arquivos compactados anteriores.

Antes de gerar o ZIP, o script executa uma auditoria do diretório temporário. Se detectar um arquivo proibido, a exportação é interrompida em vez de criar um pacote inseguro.
