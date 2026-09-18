# CardLink — Item 3: Segredos e ambiente de produção

**Data:** 18/09/2026  
**Status do código:** concluído  
**Status da rotação externa:** pendente de acesso às contas Railway/NVIDIA

## 1. O que foi encontrado no pacote antigo

A auditoria do `backend/.env` que veio no ZIP anterior identificou, sem expor os valores:

- `JWT_SECRET` real, com 128 caracteres;
- `NVIDIA_API_KEY` real;
- `DATABASE_URL` em formato local/não PostgreSQL;
- `CORS_ORIGIN` local (`localhost`);
- `ADMIN_EMAILS` preenchido.

Não foi encontrada repetição literal do JWT, da chave NVIDIA ou do valor de `DATABASE_URL` em outros arquivos versionáveis do projeto.

### Consequência

Qualquer `JWT_SECRET` ou `NVIDIA_API_KEY` que tenha sido reutilizado em produção deve ser considerado exposto e substituído. O valor antigo não deve voltar a ser usado.

## 2. Proteções adicionadas ao projeto

Foi criado `backend/utils/env-security.js` com validação central de produção.

Em `NODE_ENV=production`, o CardLink agora impede a inicialização quando:

- `JWT_SECRET` está ausente, é placeholder ou tem menos de 64 caracteres;
- `DATABASE_URL` não aponta para PostgreSQL;
- `CAKTO_SECRET` está ausente/placeholder;
- `CORS_ORIGIN` contém `*` ou origem sem HTTPS;
- Cakto Client ID/Secret estão configurados apenas parcialmente;
- Cloudflare R2 está configurado parcialmente.

Serviços opcionais ausentes (e-mail, IA, Cakto API completa, R2 completo) geram avisos quando não são bloqueadores centrais.

## 3. Auditoria automática

Novo comando:

```bash
npm run security:check
```

Ele verifica que o projeto exportável não contenha:

- `.env` real;
- `backend/db/data.json`;
- chaves/certificados privados (`.pem`, `.key`, `.p12`, `.pfx`);
- e, em produção, valida as variáveis obrigatórias.

O comando `npm run export:zip` continua aplicando a filtragem segura criada no Item 2.

## 4. Rotação externa necessária

### Railway / produção

1. Gerar um **novo `JWT_SECRET`** longo e aleatório (mínimo 64 caracteres; recomendado 128).
2. Substituir `JWT_SECRET` nas Variables do serviço CardLink.
3. Garantir `DATABASE_URL` PostgreSQL válido do ambiente de produção.
4. Confirmar `PUBLIC_APP_URL=https://cardlink.digitalnexoapp.com`.
5. Confirmar `CORS_ORIGIN=https://cardlink.digitalnexoapp.com` (sem `*`).
6. Confirmar `CAKTO_SECRET` real e atual.
7. Se usados, confirmar `CAKTO_CLIENT_ID` + `CAKTO_CLIENT_SECRET` em conjunto.
8. Fazer novo deploy e executar `npm run infra:check` no ambiente.

**Efeito esperado da troca do JWT:** sessões/tokens antigos deixam de ser válidos e usuários precisarão autenticar novamente. Isso é desejável após exposição de segredo.

### NVIDIA

1. Revogar/excluir a chave NVIDIA antiga que apareceu no ZIP.
2. Criar uma nova chave.
3. Salvar a nova chave somente como variável segura (`NVIDIA_API_KEY`) no ambiente de produção, caso o fallback NVIDIA continue sendo utilizado.
4. Nunca gravar a chave nova em `.env` de pacote, documentação ou ZIP.

### Cakto, R2 e e-mail

O `.env` analisado não continha literalmente essas credenciais. Mesmo assim, antes da homologação final devem ser confirmadas apenas no ambiente seguro de produção. Se alguma delas tiver sido compartilhada por outro meio inseguro, deve ser rotacionada no respectivo provedor.

## 5. Arquivos removidos do pacote de trabalho

Foram removidos da árvore destinada à entrega:

- `backend/.env`;
- `backend/db/data.json`.

Os modelos `.env.example` permanecem e contêm somente placeholders.

## 6. Estado final do Item 3

**Código e empacotamento: concluídos.**  
**Rotação efetiva em serviços externos: requer acesso autorizado às contas Railway/NVIDIA.**

Após a rotação externa, executar:

```bash
npm run security:check
npm run infra:check
```

e então realizar novo deploy/homologação.
