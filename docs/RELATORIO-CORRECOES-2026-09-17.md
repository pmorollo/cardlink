# CardLink — Relatório de correções 2026-09-17

Base: pacote limpo recebido nesta sessão.

## Resultado geral

Foram tratados os itens 1, 2, 3 e 5 a 17 da auditoria. O item 4 foi mantido **sem alteração por decisão do proprietário** e permanece como pendência explícita.

### 1. Upload Cloudflare R2 — CORRIGIDO
- O nome do arquivo agora é criado antes do `PutObjectCommand` com timestamp + UUID + extensão validada.
- O mesmo nome é usado de forma consistente na URL retornada.
- Teste automatizado valida o formato seguro do nome.
- Observação: o caminho R2 real não foi acionado nesta sessão porque não foi usado um bucket de teste externo; a falha de variável inexistente foi eliminada no código.

### 2. PDF do Plano Pro — CORRIGIDO
- A regra passou de `req.user` para `req.currentUser`, que é o usuário efetivamente carregado pelo middleware.
- Testes confirmam: Free recebe 403; Pro aceita PDF.
- No armazenamento local, PDF recusado de Free é apagado imediatamente para não deixar arquivo órfão.

### 3. Página pública / contato / QR somente Pro — CORRIGIDO
- As verificações públicas agora usam `isProCustomer`.
- `/api/public/:slug`, formulário de contato, QR e `/site/:slug` respeitam a regra Pro.
- Testes cobrem Free bloqueado e Pro liberado.

### 4. `.env` e credenciais — PENDENTE, NÃO ALTERADO
- Por decisão expressa do proprietário, este item não foi executado nesta rodada.
- O arquivo `backend/.env` foi preservado exatamente como recebido.
- O hash do arquivo foi conferido antes e depois da intervenção e permaneceu idêntico.
- Pendência futura: retirar o `.env` dos pacotes de distribuição e rotacionar as credenciais contidas nele.

### 5. Dependências duplicadas — CORRIGIDO
- `package.json` e `package-lock.json` do backend foram removidos.
- A raiz passou a ser a única fonte de dependências e scripts.
- Railway já inicia por `node backend/server.js`, portanto a estrutura permanece compatível.

### 6. CSP — CORRIGIDO COM COMPATIBILIDADE
- Content Security Policy voltou a ficar ativa no Helmet.
- Os blocos `<script>` embutidos do `index.html` foram removidos e transferidos para `bootstrap.js`.
- `script-src` aceita somente a própria origem.
- Atributos legados `onclick` ainda são tolerados por `script-src-attr 'unsafe-inline'` para evitar regressão visual/funcional; podem ser eliminados gradualmente em modernização futura.

### 7. CORS — CORRIGIDO
- Produção aceita a origem oficial e origens explicitamente cadastradas em `CORS_ORIGIN`.
- `*`, `localhost` genérico e qualquer `.railway.app` deixaram de ser liberações amplas de produção.
- Localhost/127.0.0.1 continuam permitidos apenas fora de produção.

### 8. JWT no localStorage — CORRIGIDO
- O frontend deixou de persistir JWT em `localStorage`.
- Sessão web usa cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- `Authorization: Bearer` foi preservado somente como compatibilidade para API/testes.
- Foi criada rota de logout que limpa o cookie de sessão.

### 9. Recuperação de senha — CORRIGIDO
- Limite específico para rotas de recuperação.
- Código é invalidado após 5 tentativas incorretas.
- Tentativas são zeradas quando um novo código é emitido, expira ou é usado com sucesso.
- Campo `reset_attempts` foi incluído na migração do banco.

### 10. HTML de e-mails de contato — CORRIGIDO
- Nome do proprietário, nome do visitante, telefone, e-mail e mensagem são escapados antes da montagem do HTML.

### 11. Webhook — CORRIGIDO
- Segredo não é mais aceito pelo corpo JSON.
- Validação usa cabeçalho `x-cakto-secret` ou Bearer.
- Comparação do segredo usa `crypto.timingSafeEqual`.
- Teste confirma que segredo apenas no corpo recebe 401.

### 12. Esquema do banco — CORRIGIDO DE FORMA CONSERVADORA
- DDL foi retirado de `repository.js`.
- Criado `backend/db/migrations/` com migrações SQL versionadas e tabela `schema_migrations`.
- PostgreSQL é o caminho de produção; o JSON local foi preservado como fallback de desenvolvimento/teste para não quebrar a operação local existente.
- A integração PostgreSQL automatizada ficou ignorada nesta sessão porque `TEST_PG_URL` não foi fornecida; a sintaxe JavaScript e o runner de migrações foram validados.

### 13. Frontend monolítico — CORRIGIDO
- `app.js` foi dividido em: `app-core`, `app-auth`, `app-dashboard`, `app-builder`, `app-extras` e `app-assistant`.
- `styles.css` foi dividido em quatro folhas: base, builder, dashboard e public.
- A ordem de carregamento foi preservada para manter o comportamento existente.

### 14. Service Worker / offline — CORRIGIDO
- O Service Worker deixou de apagar todo o cache a cada ativação.
- Existe precache do shell principal e atualização controlada por versão.
- Requisições de API permanecem network-first e retornam 503 claro quando offline.
- Navegação principal possui fallback para o shell cacheado.

### 15. Testes — AMPLIADOS
Foram adicionados testes para:
- CSP ativa e ausência de scripts embutidos;
- sessão HttpOnly e ausência de JWT no localStorage;
- regra Free x Pro da página pública;
- upload PDF Free x Pro;
- geração segura do nome do upload;
- invalidação do código de recuperação;
- webhook sem segredo no corpo;
- endpoint de saúde.

Resultado final: **42 testes descobertos; 41 aprovados; 0 falhas; 1 ignorado (PostgreSQL externo sem `TEST_PG_URL`)**.

### 16. Logs e monitoramento — CORRIGIDO
- Erros globais passam a ser registrados em JSON estruturado com timestamp, request ID, método, caminho, status e mensagem.
- Cada resposta recebe `X-Request-Id`.
- Criado `GET /api/health` para monitoramento básico de disponibilidade e uptime.

### 17. Acessibilidade e SEO — MELHORADO
- `/site/:slug` gera `title`, description, Open Graph e canonical por cliente no servidor.
- Página pública recebe marcação semântica básica `ProfessionalService`.
- Textos alternativos de imagens foram aprimorados onde havia contexto do cliente.
- Elemento de marca clicável recebeu papel/descrição acessível.

## Verificações finais

- Sintaxe de todos os arquivos JavaScript: OK.
- Suite Node: 41 aprovados, 0 falhas, 1 PostgreSQL ignorado por ausência de banco de teste externo.
- `npm test` foi configurado com `--test-concurrency=1` para executar os arquivos sequencialmente e evitar instabilidade do test runner do Node 22 observada em execução paralela.
- `backend/.env`: preservado e não alterado, conforme solicitado.
- `node_modules`: removido novamente do pacote final; reinstalável com `npm install`/`npm ci`.
- Dependências: um único `package.json`/`package-lock.json` na raiz.

## Pendência deliberada

O único item deliberadamente não executado foi o **item 4**. Antes de distribuir o projeto a terceiros ou considerá-lo higienizado para produção, recomenda-se retirar `backend/.env` do pacote e rotacionar todas as credenciais que já tenham sido compartilhadas.
