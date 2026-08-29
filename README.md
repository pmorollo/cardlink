# CardLink

Aplicação SaaS em Node.js/Express + PostgreSQL para criar e administrar uma apresentação profissional de negócios em um único link.

Mensagem comercial atual:

> **Tudo o que seu cliente precisa ver antes de chamar você.**

O CardLink reúne serviços, fotos, avaliações, localização, redes sociais e WhatsApp e pode ser compartilhado por link ou QR Code.

## Execução local

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Arquitetura atual

- `frontend/` — SPA estática da landing, autenticação, painel, editor e página pública.
- `backend/server.js` — servidor Express e rotas da API.
- `backend/db/repository.js` — acesso a dados; PostgreSQL é o armazenamento indicado para produção.
- `backend/routes/payments.js` — integração e eventos da Cakto.
- `backend/routes/upload.js` — uploads autenticados com validação de extensão + MIME e limites anti-DoS.
- `backend/utils/email.js` — e-mail transacional via Resend, com SMTP opcional.

## Modelo de acesso

- Não existe cadastro público gratuito antes da compra.
- A conta comercial nasce após evento de pagamento aprovado da Cakto.
- O comprador recebe um link de ativação, confirma o e-mail e define a própria senha.
- Existe somente uma conta administrativa, sem assinatura e sem site público.
- Contas internas de teste usam `subscription_source=internal_test`, não são vendas e também precisam ser ativadas pelo próprio usuário.
- Cancelamento/estorno/chargeback pode suspender o acesso do cliente e a página pública sem exigir exclusão imediata dos dados.

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

Na homologação de fechamento de agosto de 2026, a suite descobriu 28 testes: 27 aprovados e 1 integração PostgreSQL ignorada quando `TEST_PG_URL` não é informada.

Para executar também a integração destrutiva contra PostgreSQL, use **somente um banco exclusivo de teste**:

```bash
TEST_PG_URL=postgres://usuario:senha@127.0.0.1:5432/cardlink_test npm test
```

O workflow `.github/workflows/tests.yml` cria um PostgreSQL temporário e executa a suite completa em pull requests e por acionamento manual.

Coberturas relevantes incluem: cadastro público bloqueado, isolamento admin/cliente, ativação pós-pagamento, conta interna de teste, cancelamento, verificação e troca de e-mail, recuperação de senha, CORS, proteção de segredos, contatos, mensagens administrativas, métricas e QR Code.

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

## Segurança de uploads

O projeto usa Multer 2.3.0, valida extensão e MIME de imagens e limita tamanho, quantidade de arquivos, campos e profundidade de campos multipart.

## Assistente de conteúdo

O código experimental de IA foi preservado, mas o Assistente está oculto da versão comercial atual e não integra a oferta da versão inicial. A evolução de IA é tratada em `docs/SUBPROJETO-IA-PARA-SAAS.md`.

## Produção e abertura comercial

A `master` é a referência da versão corrente. Antes de abrir vendas ao público:

1. confirmar o domínio/deploy ativo no Railway e testar a landing publicada;
2. concluir os testes reais pendentes do plano de homologação;
3. realizar uma compra real separada pela Cakto e validar compra → webhook → e-mail → ativação;
4. imediatamente antes da abertura pública, rotacionar o `CAKTO_SECRET`, atualizar Railway e Cakto e validar novamente o webhook;
5. executar a auditoria final comercial conforme as premissas do **PLANO MESTRE DE OFERTAS E PUBLICIDADE**.

Mais detalhes: `docs/README.md`, `docs/DIRETRIZES-PRODUTO-MARKETING.md` e `docs/PLANO-TESTE-SEMANA-1.md`.
