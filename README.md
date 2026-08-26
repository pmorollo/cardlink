# CardLink

Aplicação SaaS para criação de sites profissionais rápidos para pequenos negócios e prestadores de serviços, com backend em Node/Express e frontend estático.

## Como executar localmente

1. Instale dependências:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```
2. Inicie o servidor:
   ```bash
   npm start
   ```
3. Abra no navegador:
   ```
   http://localhost:3000
   ```

## Como compartilhar o aplicativo

- O produto público principal é o site profissional: `http://localhost:3000/site/<slug>`.
- A rota compacta legada continua disponível em `http://localhost:3000/#card/<slug>` apenas como visualização complementar; ela não define o posicionamento comercial.
- Para outras pessoas acessarem, é necessário hospedar o app em um servidor público ou usar um túnel como `ngrok`.

## Melhorias incluídas

- `/` serve o frontend e `/api` serve a API backend.
- Compartilhamento e QR Code direcionam para o site profissional completo.
- Ação principal pelo WhatsApp e opção secundária para salvar o contato no celular (`.vcf`).
- O login abre uma visão geral; o menu da conta reúne Configurações, Contatos, Minha conta e Sair.
- As configurações públicas são separadas dos dados de login e organizadas por Perfil, Contato, Serviços, Imagens, Avaliações, Redes e Aparência.
- A IA é exclusiva da área autenticada, com o nome Assistente de conteúdo, e pede confirmação antes de aplicar sugestões.
- Não existe atendente de IA na página pública; o atendimento do visitante acontece pelo WhatsApp.
- Seções sem conteúdo real ficam ocultas para visitantes, evitando produtos, imagens ou depoimentos demonstrativos.
- Copiar link para área de transferência com fallback.
- Suporte a `navigator.share` em dispositivos compatíveis.

## Testes

```bash
# Suite principal (armazenamento local JSON) — 7 testes + 1 skip do PG
cd backend
npm test

# Teste de integração contra PostgreSQL real
# (crie o banco antes: CREATE DATABASE cardlink_test;)
DATABASE_URL=postgres://postgres@localhost:5433/cardlink_test node --test --test-concurrency=1 backend/test/pg.integration.test.js

# Suite principal rodando contra PostgreSQL (dados compartilhados entre testes;
# o banco deve estar limpo antes da execução)
DATABASE_URL=postgres://postgres@localhost:5433/cardlink_test node --test --test-concurrency=1 backend/test/smoke.test.js
```

Cobertura da suite principal: SPA servida, não exposição de `backend/.env`, CORS bloqueando origens estranhas, escalada de admin por e-mail, e o fluxo completo de recuperação de senha (com bloqueio de reuso/invalidação do código).

O teste de integração (`pg.integration.test.js`) valida contra o PostgreSQL real: registro de admin e usuário comum, criação/atualização/exclusão de cartão, slug único, página pública (sem expor `user_id`/`views_count`), envio de contato público com anti-spam, listagem de contatos, stats, controle de acesso de admin, troca de plano e chamados de suporte. As tabelas são truncadas a cada execução.

## Arquitetura de banco

- `backend/db/repository.js` — repositório tipado e assíncrono (`users`, `cards`, `contacts`, `supportTickets`). Quando `DATABASE_URL` é um PostgreSQL válido, todas as operações vão para o banco (esquema criado automaticamente na inicialização). Se o PostgreSQL estiver indisponível, cai automaticamente no armazenamento local (memória/JSON) sem quebrar a API.
- `backend/db/database.js` — camada de compatibilidade que exporta `query()` legado e o objeto `db` (usado pelos testes).
- `backend/db/data.json` — armazenamento local de desenvolvimento.
- Os novos endpoints/rotas devem usar `repository.*` (async/await) em vez do `query()` legado.

## Deploy sugerido

1. Use um serviço como Heroku, Render, Railway, Vercel (com backend separado) ou DigitalOcean App Platform.
2. O backend já roda em Node com `npm start`.
3. O `Procfile` está pronto para Heroku e o `Dockerfile` permite deploy containerizado.

### Checklist obrigatório de produção

Gere variáveis de ambiente fortes e NUNCA as deixe em repositórios:

```bash
# Segredo do JWT — OBRIGATÓRIO (servidor não sobe em produção sem ele)
JWT_SECRET=<gerar valor aleatório longo, ex: openssl rand -hex 64>
NODE_ENV=production

# E-mails autorizados como administradores (separados por vírgula)
ADMIN_EMAILS=seu-email@dominio.com

# CORS: liste os domínios do seu frontend (por padrão não aceita nada além de localhost)
CORS_ORIGIN=https://seu-dominio.com

# Banco de dados (opcional — sem ele o app usa backend/db/data.json local)
DATABASE_URL=postgres://usuario:senha@host:5432/db
```

Pontos de atenção:

- **Recuperação de senha:** atualmente o código é gerado e registrado no **console do servidor** (retornado na API somente em desenvolvimento). Para produção, configure um serviço de e-mail (SMTP) para entregar o código ao usuário e remova o `console.log`.
- **Uploads:** em produção é recomendado configurar o Cloudflare R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`) — caso contrário as imagens vão para `backend/uploads/` (volátil em deploy efêmero).
- **HTTPS**: habilite no serviço de hosting.

## Docker

1. Construa a imagem:
   ```bash
   docker build -t cardlink .
   ```
2. Rode o container:
   ```bash
   docker run -p 3000:3000 --env-file .env cardlink
   ```

## Observação

- O app usa `backend/db/data.json` como banco local quando `DATABASE_URL` não é um PostgreSQL. Para produção com múltiplas instâncias, prefira PostgreSQL.
- Os uploads de imagem são salvos em `backend/uploads`.
- Em aplicações multi-instância o armazenamento local (JSON/uploads) deve ser substituído por serviços compartilhados.
