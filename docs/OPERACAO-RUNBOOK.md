# CardLink — Runbook de produção

## 1. Antes de publicar

1. Configure todas as variáveis de `.env.example` no painel seguro da hospedagem; nunca envie um `.env` junto ao código.
2. Use `NODE_ENV=production`, PostgreSQL persistente, armazenamento R2 e HTTPS.
3. Gere um `JWT_SECRET` longo e exclusivo; configure o mesmo `CAKTO_SECRET` no CardLink e na Cakto.
4. Autorize `EMAIL_FROM` no provedor de e-mail.
5. Execute `npm ci`, `npm test`, `npm run security:check` e `npm run infra:check`.
6. Confirme que `/api/health/live` e `/api/health/ready` retornam HTTP 200.

## 2. Banco e migrações

- As migrações em `backend/db/migrations` são aplicadas automaticamente na inicialização.
- Use PostgreSQL em produção; o arquivo JSON é somente fallback de desenvolvimento.
- Antes de uma atualização, faça snapshot do banco.
- Depois da atualização, confira a tabela `webhook_events` e os campos `reset_code_hash` e `subscription_event_at`.

## 3. Backup e restauração

### Política mínima

- Backup diário automático do PostgreSQL.
- Retenção mínima sugerida: 30 diários, 12 mensais.
- Uma cópia em região/provedor diferente.
- Versionamento ou política equivalente no armazenamento de uploads.
- Teste de restauração trimestral e antes de mudanças de alto risco.

### Ensaio de restauração

1. Crie ambiente isolado e base vazia.
2. Restaure o backup mais recente.
3. Inicie a mesma versão da aplicação.
4. Teste login, página pública, contatos e histórico financeiro.
5. Compare contagens de usuários, páginas, contatos e webhooks.
6. Registre data, duração, responsável e divergências.

## 4. Homologação Cakto

Use compradores de teste distintos e registre ID, horário e resultado de cada caso:

- compra mensal aprovada;
- compra anual aprovada;
- renovação;
- webhook repetido;
- cancelamento;
- reembolso;
- chargeback;
- evento de cancelamento antigo depois de nova compra;
- produto diferente do CardLink;
- comprador já existente;
- comprador novo e ativação por e-mail.

Resultado esperado: somente eventos autenticados e do produto correto alteram a assinatura; duplicatas não repetem efeitos; eventos antigos são ignorados; encerramentos rebaixam para Free sem apagar a página.

## 5. E-mail

Teste em Gmail, Outlook e um domínio próprio:

- confirmação do cadastro Free;
- ativação após compra;
- recuperação de senha;
- confirmação de troca de e-mail;
- alerta no e-mail anterior;
- aviso de novo contato;
- mensagem administrativa.

Monitore rejeições, bloqueios, reclamações e taxa de entrega. Nunca registre códigos, tokens ou conteúdo sensível em um agregador público de logs.

## 6. Monitoramento e alertas

- Sondar `/api/health/live` a cada minuto.
- Sondar `/api/health/ready` a cada 2–5 minutos.
- Alertar para três falhas consecutivas, respostas 500, banco indisponível e fila de e-mails/webhooks com erro.
- Centralizar logs usando o `X-Request-Id` para investigação.
- Alertar para crescimento anormal de 401, 403, 429 e falhas de webhook.

## 7. Resposta a incidentes

1. Registrar horário, impacto e versão implantada.
2. Preservar logs e IDs das requisições afetadas.
3. Se houver risco financeiro, pausar aquisição e conferir eventos na Cakto antes de alterações manuais.
4. Se houver exposição de segredo, revogar e substituir imediatamente.
5. Se houver perda de dados, interromper escritas, criar snapshot e iniciar restauração isolada.
6. Comunicar clientes afetados conforme impacto e orientação jurídica.
7. Documentar causa, correção e prevenção após estabilizar.

## 8. Rotação de segredos

Rotacione imediatamente após suspeita de exposição e periodicamente conforme a política da empresa:

- `JWT_SECRET`: encerra sessões existentes; planeje comunicação.
- `CAKTO_SECRET`: altere de forma coordenada no CardLink e na Cakto.
- chaves de banco, e-mail, IA e R2: gere nova chave, atualize, teste e só então revogue a anterior.

## 9. Exclusão e LGPD

- O cliente pode excluir a conta em “Minha conta”.
- A exclusão exige senha atual e o texto `EXCLUIR`.
- Confirme que registros relacionais foram removidos.
- Configure limpeza dos objetos remotos do cliente no armazenamento e defina prazo de expiração de backups conforme política jurídica.
- Registre solicitações legais sem conservar dados pessoais além do necessário.

## 10. Publicação e reversão

- Publicar em janela acompanhada.
- Validar health checks, login, página pública e um upload após a publicação.
- Manter a versão anterior pronta para reversão.
- Não reverta o banco sem avaliar migrações já aplicadas; prefira corrigir para frente.
- Em falha crítica, reverter a aplicação, preservar o banco e pausar webhooks somente se houver plano de reprocessamento.
