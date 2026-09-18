# CardLink — Correções aplicadas (rodada de verificação) — 17/09/2026

Base: pacote `CardLink_Corrigido_Final_2026-09-17 (3)` + relatório de correções recebido nesta sessão.

## O que foi corrigido agora

### A. Vulnerabilidades de dependências (não tratadas na rodada anterior)
- `nodemailer` `9.0.5` → `^9.1.1` — resolve a vulnerabilidade de severidade **alta** (bypass de `disableFileAccess`/`disableUrlAccess`, bypass de allow-list IDN/Punycode, DoS quadrático no parser de endereço, bypass de validação de domínio de destinatário).
- `express` `4.18.2` → `^4.22.3` e `npm audit fix` para atualizar `qs`/`body-parser` transitivamente — resolve as 3 vulnerabilidades moderadas restantes.
- **Resultado:** `npm audit --omit=dev --audit-level=high` → **0 vulnerabilidades** (antes: 1 alta + 3 moderadas).

### B. Instabilidade real do test runner (a rodada anterior não resolveu, apesar de `--test-concurrency=1`)
Causa raiz identificada: o isolamento padrão do test runner nativo do Node (1 subprocesso por arquivo, comunicando com o processo principal por serialização estruturada) apresenta uma falha intermitente de deserialização especificamente no arquivo `backend/test/smoke.test.js` — reproduzida de forma determinística (3/3 execuções) antes desta correção.

**Correção aplicada:** criado `backend/scripts/run-tests.js`, que executa cada arquivo de teste em sua própria invocação de processo (isolamento real entre arquivos, preservado) com `--experimental-test-isolation=none` (isolamento interno do Node desativado dentro de cada execução, eliminando o subprocesso onde a falha de serialização ocorre). `package.json` → `"test"` agora chama esse script em vez do `node --test` direto.

**Validação:** `npm test` executado **5 vezes seguidas** neste ambiente (3 antes de consolidar a abordagem final + 2 depois da correção do item C) — resultado idêntico e estável em todas: **42 testes descobertos, 41 aprovados, 0 falhas, 1 ignorado** (PostgreSQL sem `TEST_PG_URL`, como já esperado), exit code 0.

Também ajustado `engines.node` de `>=18` para `>=20`, já que a flag `--experimental-test-isolation` usada no novo script exige uma versão mais recente do Node.

### C. Consistência do nome de arquivo de upload (pendência menor da rodada anterior)
O item 1 da rodada anterior corrigiu a geração de nome de arquivo (timestamp + UUID + extensão validada) apenas no caminho Cloudflare R2. O fallback de disco local (usado quando R2 não está configurado — ambiente de desenvolvimento) ainda gerava o nome com `Date.now() + Math.random()`, não a função seguraque foi criada.

**Correção aplicada em `backend/routes/upload.js`:** o `multer.diskStorage` local agora chama a mesma função `buildUploadFilename()` usada no caminho R2. Os dois caminhos de armazenamento geram nomes de arquivo da mesma forma.

## Verificações finais desta rodada
- Sintaxe de todos os arquivos `.js` do backend: OK (`node -c` em cada um).
- `npm test`: 42 testes, 41 aprovados, 0 falhas, 1 ignorado — estável em execuções repetidas.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `backend/.env`: preservado sem nenhuma alteração, exatamente como na rodada anterior (item 4 continua pendência deliberada — recomendação de rotacionar credenciais e remover o arquivo dos pacotes de distribuição continua válida).
- `node_modules`: removido do pacote final; reinstalável com `npm install`.

## Pendências que continuam abertas (fora do escopo desta rodada)
- **Item 4** (rotação de credenciais e remoção do `.env` dos pacotes) — decisão do proprietário, não executado.
- Node exigido em CI (`.github/workflows/tests.yml`) está fixado em 24; o `engines.node` do projeto agora pede `>=20` — vale confirmar que `>=20` é realmente o piso mínimo aceitável antes de divulgar isso como suportado, já que só foi validado neste ambiente em Node 22.
