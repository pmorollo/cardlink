# CardLink

Aplicação SaaS em Node.js/Express + PostgreSQL para criar e administrar uma apresentação profissional de negócios em um único link.

Mensagem comercial atual:

> **Tudo o que seu cliente precisa ver antes de chamar você.**

O CardLink reúne serviços, fotos, avaliações, localização, redes sociais e WhatsApp e pode ser compartilhado por link ou QR Code.

## Dependências

Há apenas um `package.json` canônico na raiz. Não instale dependências separadamente dentro de `backend/`.

## Execução local

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Arquitetura atual

- `frontend/` — SPA estática dividida em módulos de aplicação/CSS, além da página pública.
- `backend/server.js` — servidor Express e rotas da API.
- `backend/db/repository.js` — acesso a dados; PostgreSQL é o armazenamento de produção.
- `backend/db/migrations/` — esquema PostgreSQL versionado e aplicado automaticamente no bootstrap.
- `backend/routes/payments.js` — integração e eventos da Cakto.
- `backend/routes/upload.js` — uploads autenticados com validação de extensão + MIME e limites anti-DoS.
- `backend/utils/email.js` — e-mail transacional via Resend, com SMTP opcional.

## Modelo de acesso

- Existe cadastro público gratuito.
- O plano **Free** permite criar, editar, publicar e compartilhar a página pública do CardLink.
- O plano **Pro** adiciona recursos premium, incluindo QR integrado/rastreado, leads/mensagens, PDF e limites ampliados.
- A Cakto é a fonte de verdade para ativação e manutenção dos privilégios Pro.
- Cancelamento/estorno/chargeback do Pro rebaixa a conta para **Free**; a página pública e o link permanecem ativos.
- Existe uma conta administrativa separada, sem assinatura e sem site público.
- Contas internas de teste usam `subscription_source=internal_test` e não são contabilizadas como vendas.

## Manutenção administrativa

Criar ou regularizar o administrador exclusivo:

```bash
npm run admin:set -- email@exemplo.com SenhaCom8+ "Administrador"
```

Criar conta interna de teste e enviar o convite de ativação:

```bash
npm run test-user:create -- email@exemplo.com "Nome do teste"
```

A senha da conta de teste **não** deve ser definida pelo administrador; o usuário a cria pelo link recebido por e-mail.

## Testes

Suite padrão:

```bash
npm test
```

Na homologação de 18 de setembro de 2026, a suíte local executou **35 testes automatizados com 100% de aprovação**. A integração PostgreSQL destrutiva continua devendo usar banco exclusivo de teste quando aplicável.

Para executar também a integração destrutiva contra PostgreSQL, use **somente um banco exclusivo de teste**:

```bash
TEST_PG_URL=postgres://usuario:senha@127.0.0.1:5432/cardlink_test npm test
```

O workflow `.github/workflows/tests.yml` cria um PostgreSQL temporário e executa a suite completa em pull requests e por acionamento manual.

Coberturas relevantes incluem: cadastro Free, isolamento admin/cliente, upgrade e downgrade Free/Pro, conta interna de teste, cancelamento, verificação e troca de e-mail, recuperação de senha, CORS, proteção de segredos, contatos/leads Pro, mensagens administrativas, métricas e QR Code.

Auditoria de dependências usada no fechamento:

```bash
npm audit --omit=dev --audit-level=high
```

## Variáveis importantes de produção

Nunca salve segredos no repositório.

```bash
NODE_ENV=production
JWT_SECRET=<segredo longo e aleatório>
DATABASE_URL=<postgresql de produção>
CORS_ORIGIN=<origens autorizadas>
PUBLIC_APP_URL=<url pública oficial>

CAKTO_SECRET=<segredo do webhook>

RESEND_API_KEY=<chave Resend>
EMAIL_FROM=<remetente verificado>
```

Uploads podem usar armazenamento persistente local ou Cloudflare R2. Para R2:

```bash
CLOUDFLARE_ACCOUNT_ID=<id>
R2_ACCESS_KEY_ID=<chave>
R2_SECRET_ACCESS_KEY=<segredo>
R2_BUCKET=<bucket>
```

O `JWT_SECRET` é obrigatório em produção. `PUBLIC_APP_URL`/`APP_URL` define a base usada nos links de ativação enviados por e-mail.

## Sessão e segurança

O navegador autentica por cookie de sessão `HttpOnly`, `SameSite=Lax` e `Secure` em produção. O suporte a `Authorization: Bearer` é mantido para clientes de API e testes, mas o frontend não persiste JWT em `localStorage`.

A CSP está ativa. Scripts inline foram removidos; atributos legados de evento ainda são tolerados temporariamente para compatibilidade e devem ser eliminados gradualmente.

## Segurança de uploads

O projeto usa Multer 2.3.0, valida extensão e MIME de imagens e limita tamanho, quantidade de arquivos, campos e profundidade de campos multipart.

## Assistente de conteúdo

O código experimental de IA foi preservado, mas o Assistente está oculto da versão comercial atual e não integra a oferta da versão inicial. A evolução de IA é tratada em `docs/SUBPROJETO-IA-PARA-SAAS.md`.

## Produção e abertura comercial

A `master` é a referência da versão corrente. Em **18/09/2026**, o serviço de produção foi homologado tecnicamente no Railway com deploy `SUCCESS`, landing e health respondendo 200, PostgreSQL ativo e Cakto sincronizada.

Antes de abrir mídia paga:

1. concluir um teste funcional real de cadastro Free → edição → publicação → link público;
2. validar upgrade Pro com compra controlada na Cakto;
3. confirmar webhook → privilégios Pro e depois downgrade Pro → Free sem derrubar a página;
4. validar QR, leads/mensagens e PDF no Pro;
5. manter monitoramento do volume persistente de uploads enquanto R2 não estiver configurado.

Mais detalhes: `docs/README.md`, `docs/DIRETRIZES-PRODUTO-MARKETING.md` e `docs/PLANO-TESTE-SEMANA-1.md`.

## Segurança de ambiente

Antes de publicar ou gerar um pacote de entrega, execute:

```bash
npm run security:check
npm run export:zip
```

Em `NODE_ENV=production`, o servidor recusa inicialização quando `JWT_SECRET`, `DATABASE_URL` PostgreSQL ou `CAKTO_SECRET` estão ausentes/inseguros. Credenciais reais devem existir apenas nas variáveis do provedor de hospedagem (ex.: Railway), nunca em `.env` distribuído.
