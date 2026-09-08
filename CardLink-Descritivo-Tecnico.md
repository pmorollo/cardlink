# CardLink — Descritivo Técnico, Operação e Manutenção

**Versão do documento:** 1.0  
**Data de referência:** 7 de setembro de 2026  
**Finalidade:** transferência técnica, acompanhamento do desenvolvimento, manutenção e continuidade operacional por desenvolvedores designados pelo proprietário.

---

## 1. Visão geral

O CardLink é uma aplicação SaaS de página profissional para pequenos negócios, profissionais liberais, autônomos e prestadores de serviços. O assinante administra o conteúdo pelo painel e publica uma página própria, acessível por URL exclusiva e QR Code.

O produto é comercialmente apresentado como **site profissional**, não apenas como cartão digital ou agregador de links. Sua mensagem central é:

> **Tudo o que seu cliente precisa ver antes de chamar você.**

A página pública pode reunir:

- nome, complemento comercial, logotipo e identificação do profissional;
- apresentação do negócio;
- serviços, produtos, tabela, cardápio, promoção ou catálogo;
- galeria de imagens;
- avaliações de clientes;
- WhatsApp, telefone, e-mail, endereço e redes sociais;
- formulário de contato;
- QR Code de acesso;
- ação para salvar contato em formato vCard;
- métricas de visualização, QR Codes e mensagens.

O CardLink organiza a presença comercial do usuário e facilita o contato. Ele não substitui o WhatsApp nem as redes sociais, não promete vendas garantidas e não deve ser comunicado apenas como “link na bio”.

## 2. Identificação dos ambientes

### 2.1 Produção

- **URL pública oficial:** `https://cardlink.digitalnexoapp.com/`
- **Página de um usuário:** `https://cardlink.digitalnexoapp.com/site/{slug}`
- **Hospedagem:** Railway
- **Repositório:** `https://github.com/pmorollo/cardlink`
- **Branch de produção:** `master`
- **Projeto Railway:** `4bce9876-2021-4c0c-bb0f-b1853b901991`
- **Serviço Railway CardLink:** `26c17ffb-06e7-4a0b-bc6c-570d1e0f04fa`
- **Comando de inicialização:** `node backend/server.js`

Endereços antigos da Railway podem continuar tecnicamente acessíveis, mas não devem ser divulgados como endereço comercial. O domínio oficial deve ser usado em materiais, QR Codes e suporte.

### 2.2 Desenvolvimento local

Requisitos:

- Node.js 18 ou superior;
- npm;
- PostgreSQL recomendado para homologação completa;
- arquivo de ambiente local não versionado.

Comandos básicos:

```bash
npm ci
npm start
```

A aplicação abre, por padrão, em `http://localhost:3000`.

Sem `DATABASE_URL`, o projeto pode usar armazenamento JSON local para desenvolvimento. Esse modo não deve ser tratado como configuração adequada de produção.

## 3. Arquitetura

O CardLink é um monólito web leve. O mesmo processo Node.js entrega a API, os arquivos estáticos do painel e as páginas públicas.

```mermaid
flowchart TD
    V[Visitante] --> WEB[Frontend estático]
    U[Assinante] --> WEB
    A[Administrador] --> WEB
    WEB --> API[Node.js + Express]
    API --> PG[(PostgreSQL)]
    API --> R2[Cloudflare R2 ou volume local]
    API --> MAIL[Resend ou SMTP]
    CAKTO[Cakto] -->|Webhook assinado| API
    API --> CAKTOAPI[API Cakto]
```

### 3.1 Stack principal

- **Backend:** Node.js, CommonJS e Express.
- **Frontend:** HTML, CSS e JavaScript sem framework.
- **Banco de produção:** PostgreSQL, acessado com `pg`.
- **Autenticação:** JWT e senhas com `bcryptjs`.
- **Uploads:** Multer; armazenamento em volume persistente ou Cloudflare R2 via API compatível com S3.
- **E-mail:** Resend por HTTPS, com SMTP opcional via Nodemailer.
- **Pagamentos:** Cakto, por checkout, webhook e API.
- **Hospedagem:** Railway com Nixpacks.
- **Testes:** executor nativo `node:test` e PostgreSQL temporário no GitHub Actions.

### 3.2 Fluxo de requisição

1. O navegador carrega a SPA em `frontend/index.html` ou uma página pública por `/site/{slug}`.
2. O JavaScript chama a API sob `/api` usando JSON e, nas áreas privadas, token JWT.
3. As rotas chamam repositórios de dados e serviços externos.
4. Em produção, falha na conexão PostgreSQL encerra o processo; não deve ocorrer fallback silencioso para JSON.
5. O Express também entrega imagens e arquivos estáticos.

## 4. Estrutura do repositório

```text
cardlink/
├── .github/workflows/tests.yml      # CI de testes
├── backend/
│   ├── db/repository.js             # modelo, bootstrap SQL e repositórios
│   ├── middleware/                  # autenticação e autorização por papel
│   ├── routes/                      # endpoints HTTP
│   ├── services/cakto.js            # cliente e sincronização da Cakto
│   ├── utils/                       # e-mail, ativação e assinatura
│   ├── scripts/                     # tarefas administrativas
│   ├── test/                        # testes automatizados
│   └── server.js                    # composição e inicialização do servidor
├── frontend/
│   ├── index.html                   # landing, login, painel e editor
│   ├── app.js                       # lógica da SPA autenticada
│   ├── styles.css                   # estilos da landing e painel
│   ├── landing.html                 # estrutura da página pública do usuário
│   ├── landing.js                   # renderização dinâmica da página pública
│   ├── landing.css                  # temas e responsividade da página pública
│   ├── service-worker.js            # suporte PWA/cache
│   ├── manifest.json                # manifesto PWA
│   └── assets/                      # imagens e criativos
├── docs/                            # histórico, produto, testes e melhorias
├── package.json                     # dependências e scripts principais
├── railway.json                     # configuração de deploy
└── Procfile                         # inicialização compatível com PaaS
```

## 5. Componentes funcionais

### 5.1 Landing comercial

A rota `/` apresenta o produto, demonstrações, funcionalidades, oferta, perguntas frequentes, termos, política e acesso à conta. O estilo atual utiliza fundo verde-petróleo com detalhes dourados. Esta landing é diferente da página pública criada para cada assinante.

### 5.2 Área autenticada do assinante

O painel permite:

- editar dados do negócio e do profissional;
- cadastrar título e complemento comercial;
- enviar foto e logotipo;
- escrever a apresentação;
- cadastrar contatos e redes sociais;
- escolher tema visual;
- publicar serviços estruturados ou imagem de tabela/cardápio;
- gerenciar galeria e avaliações;
- copiar o link e visualizar o QR Code;
- acompanhar métricas e mensagens recebidas;
- receber mensagens administrativas;
- abrir chamados de suporte.

Seções opcionais devem desaparecer da página pública quando não contêm dados válidos. Esse comportamento precisa ser preservado em qualquer refatoração.

### 5.3 Página pública do usuário

A página é entregue por `landing.html` e preenchida por `landing.js` após consultar `GET /api/public/{slug}`.

Características atuais:

- hero jovem e dinâmico com título, complemento e logotipo;
- logotipo circular com animação decorativa respeitando o tema escolhido;
- foto do profissional exibida na seção Contatos;
- botão flutuante de WhatsApp, sem mensagem genérica pré-preenchida;
- botão “Salvar contato” localizado em Contatos;
- primeira seção ocupa a altura visível no celular;
- títulos redundantes removidos de Sobre, Destaque e Galeria;
- galeria em carrossel com reprodução automática e navegação por toque/teclado;
- formulário público de mensagem;
- rodapé e navegação gerados de acordo com as seções existentes.

### 5.4 Administração

Existe uma conta administrativa exclusiva, sem assinatura e sem página pública. O administrador pode consultar usuários, métricas, estado das assinaturas, chamados e enviar mensagens aos usuários.

Privilégios administrativos são persistidos no banco. Eles nunca devem ser inferidos pelo endereço de e-mail.

### 5.5 PWA e tela inicial

O projeto possui manifesto e service worker. A ação de fixar na tela inicial deve apontar para a página pública do usuário, não para a landing comercial.

## 6. Modelo de acesso e assinatura

Não há cadastro gratuito público. A conta comercial nasce após pagamento aprovado.

```mermaid
sequenceDiagram
    participant C as Cliente
    participant K as Cakto
    participant API as CardLink
    participant E as E-mail
    C->>K: Conclui pagamento
    K->>API: purchase_approved assinado
    API->>API: Cria ou atualiza conta pendente
    API->>E: Envia link de ativação
    C->>API: Define senha e confirma e-mail
    API->>C: Libera painel e página pública
```

Estados conceituais:

- **ADMIN:** operação interna; sem assinatura e sem site público.
- **PENDING:** pagamento reconhecido, aguardando ativação.
- **ACTIVE:** assinatura válida e acesso liberado.
- **CANCELLED/INACTIVE:** acesso e página pública suspensos, sem exclusão automática imediata dos dados.
- **INTERNAL_TEST:** conta de teste interno, fora das métricas comerciais, ativada pelo próprio usuário.

Eventos de cancelamento, estorno ou chargeback podem suspender o acesso. O webhook é a fonte de verdade para ativação comercial; retorno do navegador não deve liberar acesso por si só.

## 7. Banco de dados

O bootstrap e os repositórios ficam em `backend/db/repository.js`. O arquivo cria tabelas ausentes e aplica adições compatíveis com versões anteriores.

### 7.1 Tabela `users`

Campos principais:

- identificação: `id`, `name`, `email`, `whatsapp`;
- autenticação: `password_hash`;
- autorização: `is_admin`;
- acesso: `plan`, `account_status`, `subscription_status`;
- origem e plano: `subscription_source`, `subscription_plan`, `subscription_amount`, `subscription_reference`;
- teste interno: `is_test_account`;
- ativação: `activation_token_hash`, `activation_expires`, `email_verified_at`;
- troca de e-mail: `pending_email`, `email_verification_token_hash`, `email_verification_expires`;
- recuperação: `reset_code`, `reset_expires`;
- rastreio: `subscription_updated_at`, `created_at`, `referred_by`.

### 7.2 Tabela `cards`

Cada registro representa a página profissional de um usuário.

- vínculo e URL: `user_id`, `slug`;
- identidade: `name`, `business`, `business_complement`, `title`;
- imagens: `photo_url`, `logo_url`;
- conteúdo: `description`, `message`;
- contatos: `phone`, `email`, `address`, `whatsapp`, `whatsapp_group`;
- redes: `instagram`, `facebook`, `linkedin`, `tiktok`, `youtube`, `twitter`;
- aparência: `theme`, `site_button_text`;
- vitrine: `services_mode`, `services_title`, `services_image_url`, `products`;
- conteúdo social: `gallery`, `testimonials`;
- métricas: `views_count`, `qr_scans_count`;
- auditoria: `created_at`, `updated_at`.

`products`, `gallery` e `testimonials` são armazenados em JSONB.

### 7.3 Demais tabelas

- `contacts`: mensagens enviadas por visitantes para um cartão.
- `support_tickets`: chamados abertos pelo assinante.
- `admin_messages`: comunicações do administrador aos usuários.

### 7.4 Relacionamentos e exclusão

`cards.user_id` referencia `users.id`. Contatos referenciam cartões; tickets e mensagens administrativas referenciam usuários. Há `ON DELETE CASCADE` nos vínculos principais. Qualquer exclusão deve exigir confirmação explícita e backup, pois pode eliminar dados associados.

## 8. API HTTP

Prefixo padrão: `/api`.

### 8.1 Autenticação — `/api/auth`

- `POST /register` — bloqueado no modelo comercial público atual.
- `POST /activate` — ativa conta e define senha a partir de token válido.
- `POST /login` — autentica e retorna token.
- `GET /me` — retorna usuário autenticado.
- `PUT /profile` — altera dados da conta.
- `POST /confirm-email-change` — confirma mudança de e-mail.
- `PUT /change-password` — troca a senha autenticada.
- `POST /forgot-password` — solicita código de recuperação.
- `POST /reset-password` — redefine a senha com código válido.

### 8.2 Cartões — `/api/cards`

- `GET /stats/summary` — resumo e métricas do usuário.
- `GET /` — lista cartões permitidos ao usuário.
- `POST /` — cria ou atualiza o cartão principal.
- `GET /:id` — consulta cartão do usuário.
- `PUT /:id` — atualiza cartão do usuário.
- `DELETE /:id` — exclui cartão e dados dependentes.

As rotas devem sempre validar propriedade do recurso; um cliente não pode acessar cartão de outro cliente.

### 8.3 Página pública e contatos

- `GET /api/public/:slug` — retorna dados públicos, respeitando assinatura ativa.
- `POST /api/public/:slug/contact` — registra mensagem de visitante e envia aviso.
- `GET /api/cards/:cardId/contacts` — lista contatos do cartão para o proprietário.
- `GET /site/:slug/qr` — contabiliza QR e redireciona à página pública.
- `GET /site/:slug/qr-whatsapp` — rota antiga mantida por compatibilidade.

### 8.4 Upload — `/api/upload`

- `POST /` — upload autenticado de uma imagem no campo multipart `photo`.

O endpoint valida extensão, MIME, tamanho, quantidade de arquivos e limites multipart. Formatos iniciais previstos: JPG, PNG e WebP. PDF permanece fora do escopo atual.

### 8.5 Pagamentos — `/api/payments`

- `GET /cakto-checkout-links` — retorna URLs de checkout disponíveis.
- `GET /cakto-kit-filhotes-status` — consulta operacional específica preservada no serviço atual.
- `POST /cakto-sync` — sincronização Cakto restrita ao administrador.
- `POST /cakto-webhook` — recebe eventos assinados da Cakto.

### 8.6 Administração, suporte e mensagens

As rotas são montadas em:

- `/api/admin` — métricas e operações administrativas;
- `/api/support` — chamados de assinantes;
- `/api/messages` — mensagens internas.

Consultar `backend/routes/admin.js` antes de alterar permissões ou formatos, pois o arquivo exporta três roteadores.

### 8.7 IA experimental

- `POST /api/ai/generate` — geração textual autenticada.

O código suporta NVIDIA e Gemini, mas o Assistente está oculto e fora da oferta comercial atual devido à indisponibilidade observada. Não reativar na interface sem projeto, provedor, custos, privacidade, limites e testes aprovados.

## 9. Integrações externas

### 9.1 Cakto

Responsabilidades:

- fornecer checkout mensal e anual;
- enviar webhook de eventos financeiros;
- permitir consulta/sincronização de catálogo;
- criar ou atualizar a conta após aprovação;
- suspender acesso em cancelamento, estorno ou chargeback.

Oferta atual documentada:

- mensal: **R$ 12,90/mês**;
- anual: **R$ 99,00/ano**.

Antes da abertura pública, executar uma compra real separada e validar o fluxo completo. A rotação do `CAKTO_SECRET` deve ocorrer imediatamente antes dessa homologação, atualizando Railway e Cakto em conjunto.

### 9.2 E-mail

O envio preferencial usa Resend por HTTPS. SMTP é alternativa. E-mails atendem ativação, recuperação, troca de e-mail, contatos e mensagens administrativas.

O endereço remetente deve estar verificado. Falhas de e-mail não podem expor chaves, senhas ou detalhes internos ao cliente.

### 9.3 Armazenamento de imagens

Há dois modos:

1. volume persistente local, atualmente montado em `/app/backend/uploads`;
2. Cloudflare R2, usando cliente S3.

O volume local já foi validado após redeploy, mas não possui backup automático documentado. Para escala, múltiplas réplicas ou recuperação de desastre, R2 é o caminho preferível.

### 9.4 WhatsApp

O WhatsApp é o canal primário de contato do visitante e também o canal de suporte comercial. Na página pública, o botão flutuante abre o número do usuário sem mensagem genérica pré-preenchida. Mensagens específicas de interesse em um serviço podem continuar incluindo contexto do item.

## 10. Variáveis de ambiente

Nunca salvar valores reais no Git, em documentação compartilhada ou em tickets.

### 10.1 Obrigatórias em produção

```text
NODE_ENV=production
JWT_SECRET=<segredo longo e aleatório>
DATABASE_URL=<conexão PostgreSQL>
PUBLIC_APP_URL=https://cardlink.digitalnexoapp.com
CORS_ORIGIN=https://cardlink.digitalnexoapp.com
CAKTO_SECRET=<segredo do webhook>
```

`JWT_SECRET` ausente ou inseguro encerra o processo em produção.

### 10.2 Cakto

```text
CAKTO_CLIENT_ID=<cliente>
CAKTO_CLIENT_SECRET=<segredo>
CAKTO_MONTHLY_CHECKOUT_URL=<checkout mensal>
CAKTO_ANNUAL_CHECKOUT_URL=<checkout anual>
```

### 10.3 E-mail

```text
RESEND_API_KEY=<chave>
EMAIL_FROM=<remetente verificado>
```

Alternativa SMTP:

```text
SMTP_HOST=<servidor>
SMTP_PORT=587
SMTP_USER=<usuário>
SMTP_PASS=<senha>
SMTP_FROM=<remetente>
```

### 10.4 Cloudflare R2

```text
CLOUDFLARE_ACCOUNT_ID=<conta>
R2_ACCESS_KEY_ID=<chave>
R2_SECRET_ACCESS_KEY=<segredo>
R2_BUCKET=cardlink-uploads
```

### 10.5 IA experimental

```text
NVIDIA_API_KEY=<chave>
NVIDIA_MODEL=<modelo>
GEMINI_API_KEY=<chave>
GEMINI_MODEL=<modelo>
AI_TIMEOUT_MS=15000
AI_REQUESTS_PER_HOUR=30
```

Essas variáveis não são necessárias enquanto o recurso permanecer oculto.

## 11. Segurança

Controles presentes:

- hash de senha com bcrypt;
- autenticação JWT;
- middleware separado para administrador e cliente;
- propriedade dos cartões validada nas rotas;
- CORS com domínio canônico, Railway e desenvolvimento local;
- Helmet, com CSP atualmente desabilitada por causa dos scripts inline;
- limite JSON de 1 MB;
- rate limit de autenticação: 30 requisições por 15 minutos;
- rate limit geral: 200 requisições por minuto;
- validação e limites em uploads;
- tokens de ativação e confirmação armazenados como hash;
- webhook da Cakto validado com segredo;
- rotas de API inexistentes retornam JSON 404, sem cair na SPA.

### 11.1 Riscos técnicos conhecidos

- CSP está desabilitada; o frontend contém scripts e estilos inline.
- O armazenamento em volume local depende de uma réplica e não tem backup automático documentado.
- O bootstrap de esquema com `ALTER TABLE ... IF NOT EXISTS` é prático, mas não substitui migrações versionadas.
- Não há observabilidade estruturada, rastreamento distribuído ou serviço de erros documentado.
- A publicação direta em `master` aumenta o risco de regressão; o fluxo recomendado é branch + pull request + testes.
- Segredos devem ser rotacionados quando houver troca de equipe ou suspeita de exposição.

## 12. Testes e qualidade

Comando padrão:

```bash
npm test
```

A suíte utiliza `node:test`. O teste PostgreSQL destrutivo só deve rodar contra banco exclusivo:

```bash
TEST_PG_URL=postgres://usuario:senha@127.0.0.1:5432/cardlink_test npm test
```

O GitHub Actions cria PostgreSQL 16 temporário em pull requests para `master` e por execução manual.

Cobertura documentada:

- bloqueio de cadastro público;
- login, ativação, recuperação e troca de e-mail;
- isolamento administrador/cliente;
- criação e atualização de cartão;
- contatos públicos;
- CORS e proteção de segredos;
- eventos Cakto, cancelamento e contas de teste;
- mensagens administrativas;
- métricas e QR Code;
- e-mail e integração PostgreSQL.

Antes de merge:

```bash
npm ci
npm test
npm audit --omit=dev --audit-level=high
```

Além da suíte, toda mudança visual deve ser testada manualmente em desktop e celular, incluindo viewport baixo, textos longos, ausência de imagem e seções vazias.

## 13. Deploy e versionamento

### 13.1 Fluxo recomendado

1. Atualizar a branch local a partir de `master`.
2. Criar branch curta para uma única finalidade.
3. Implementar e testar localmente.
4. Abrir pull request para `master`.
5. Aguardar a suíte automatizada.
6. Revisar diferença, segurança, banco e impacto visual.
7. Fazer merge aprovado.
8. Acompanhar o deployment no Railway.
9. Confirmar logs, status HTTP e versão pública.
10. Executar teste funcional mínimo em produção.

O Railway usa Nixpacks e política de reinício `ON_FAILURE`. O deploy deve acompanhar o commit corrente de `master`.

### 13.2 Teste mínimo pós-deploy

- abrir landing oficial;
- testar login e logout;
- abrir página pública existente;
- verificar imagens, WhatsApp, contatos e responsividade;
- salvar uma alteração não destrutiva e confirmar atualização pública;
- verificar logs sem erro de banco;
- quando a mudança envolver pagamento, testar o fluxo Cakto controlado;
- quando envolver e-mail, confirmar entrega real.

### 13.3 Cache do frontend

`landing.html` usa parâmetros de versão em `landing.css?v=N` e `landing.js?v=N`. Ao alterar esses arquivos, incrementar a versão para evitar cache antigo no navegador. Avaliar também o service worker quando mudanças não aparecerem após deploy.

## 14. Operações administrativas

Criar ou regularizar o administrador exclusivo:

```bash
npm run admin:set -- email@exemplo.com SenhaCom8+ "Administrador"
```

Criar conta interna de teste e enviar convite:

```bash
npm run test-user:create -- email@exemplo.com "Nome do teste"
```

A senha da conta de teste deve ser criada pelo próprio usuário no link de ativação. O administrador não deve defini-la manualmente.

### 14.1 Diagnóstico de indisponibilidade

1. Confirmar último deploy e commit no Railway.
2. Ler logs do serviço desde o início do processo.
3. Procurar primeiro por ausência de `JWT_SECRET`, falha PostgreSQL, porta, erro de dependência ou variável ausente.
4. Confirmar que `DATABASE_URL` aponta para o banco correto.
5. Verificar health do banco e conexões.
6. Não substituir produção por armazenamento JSON como solução emergencial.
7. Se o deploy anterior era estável, reverter por commit Git identificável.
8. Registrar causa, impacto, correção e prevenção.

### 14.2 Diagnóstico de imagem ausente

1. Consultar a URL gravada no cartão.
2. Verificar se o objeto existe em R2 ou no volume.
3. Confirmar montagem `/app/backend/uploads`.
4. Verificar MIME e resposta de `/uploads/{arquivo}`.
5. Não pedir novo upload antes de confirmar perda real.

### 14.3 Diagnóstico de webhook

1. Conferir evento, status e horário na Cakto.
2. Conferir endpoint configurado e segredo em ambos os lados.
3. Verificar logs sem registrar o segredo.
4. Confirmar idempotência antes de reenviar evento.
5. Validar estado final do usuário e assinatura.
6. Nunca ativar manualmente uma venda sem evidência do pagamento.

## 15. Monitoramento recomendado

O projeto ainda necessita de monitoramento operacional formal. Recomenda-se acompanhar:

- disponibilidade HTTP da landing, API e página pública;
- reinícios e falhas de deployment no Railway;
- erros 5xx e latência por rota;
- conexões e armazenamento do PostgreSQL;
- espaço e integridade de uploads;
- falhas de e-mail;
- falhas e rejeições de webhook;
- contas em `PENDING` por tempo excessivo;
- divergências entre status Cakto e CardLink;
- volume de visualizações, QR scans e contatos;
- taxa de erro por navegador e dispositivo.

Alertas prioritários:

- aplicação indisponível;
- banco indisponível;
- falhas consecutivas no webhook;
- aumento anormal de respostas 401, 403, 429 ou 500;
- falha de envio de ativação;
- armazenamento próximo do limite.

## 16. Backup e recuperação

O backup deve cobrir, separadamente:

- repositório Git;
- PostgreSQL;
- imagens em volume ou R2;
- configuração segura das integrações;
- documentação operacional.

Requisitos mínimos:

- backup automático do PostgreSQL com teste periódico de restauração;
- cópia externa dos uploads enquanto permanecerem em volume local;
- política de retenção definida;
- credenciais de recuperação acessíveis somente ao proprietário e responsáveis autorizados;
- teste trimestral de restauração em ambiente isolado.

O volume Railway atual não possui backup automático documentado. Esta é uma pendência importante antes de ampliar a base de clientes.

## 17. Pendências técnicas e comerciais

### 17.1 Portões antes de mídia paga

1. Confirmar que Railway entrega o commit atual de `master` pelo domínio oficial.
2. Concluir teste real de contato em que o visitante informa somente WhatsApp.
3. Rotacionar `CAKTO_SECRET` imediatamente antes da abertura.
4. Executar compra real separada e validar checkout → webhook → conta pendente → e-mail → senha → login → publicação.
5. Configurar e validar mensuração do funil antes de investir em anúncios.

### 17.2 Backlog técnico recomendado

Prioridade alta:

- implantar backup automatizado do banco e dos uploads;
- adotar migrações SQL versionadas;
- adicionar health endpoint protegido de informações sensíveis;
- estruturar logs e alertas;
- eliminar scripts inline e habilitar CSP progressivamente;
- documentar rollback e responsáveis pela produção.

Prioridade média:

- homologação visual automatizada em viewports móveis;
- revisão do service worker e estratégia de cache;
- paginação de contatos, usuários e mensagens para escala;
- validação mais formal de objetos JSONB;
- auditoria de acessibilidade da página pública e painel;
- política de retenção e exclusão de dados conforme LGPD.

Evoluções de produto, somente após estabilidade:

- Plano Familiar/Multi com vários cartões;
- CardLink Comunidades;
- infraestrutura compartilhada com OrçaZap, mantendo produtos comercialmente independentes;
- IA 2.0 em subprojeto próprio;
- PDF em tabela/cardápio;
- recursos avançados de mensuração e divulgação.

## 18. Regras para futuros desenvolvedores

1. Preservar a definição do produto como site profissional.
2. Não criar cadastro gratuito sem decisão expressa do proprietário.
3. Não liberar acesso por retorno do checkout; usar webhook validado.
4. Não expor segredos em código, logs, commits, screenshots ou documentos.
5. Não alterar pagamento, banco, domínio e frontend no mesmo deployment sem necessidade.
6. Preservar URLs e QR Codes existentes.
7. Ocultar seções públicas opcionais quando vazias.
8. Testar sempre em celular e desktop.
9. Manter WhatsApp como meio direto de contato, sem mensagem genérica automática.
10. Não reativar o Assistente de IA sem aprovação e homologação específicas.
11. Trabalhar por branch e pull request; evitar commits diretos em produção.
12. Registrar toda migração, incidente, rollback e mudança de variável.
13. Não apagar dados de clientes para resolver suspensão de assinatura.
14. Testar restauração de backup, não apenas sua criação.
15. Consultar o proprietário antes de mudanças comerciais, preços ou escopo.

## 19. Checklist de entrada de um novo mantenedor

- [ ] Receber acesso individual ao GitHub e Railway.
- [ ] Receber somente os acessos necessários ao PostgreSQL, Cakto, Resend e R2.
- [ ] Configurar autenticação em dois fatores nas plataformas.
- [ ] Clonar o repositório e executar a suíte local.
- [ ] Compreender o modelo pago antes do cadastro.
- [ ] Ler `README.md`, este documento e os arquivos de `docs/` relevantes.
- [ ] Localizar variáveis sem copiar valores para arquivos inseguros.
- [ ] Identificar o domínio e o deployment correntes.
- [ ] Testar uma conta interna de teste.
- [ ] Conhecer o processo de rollback.
- [ ] Confirmar quem aprova merge e publicação.
- [ ] Registrar a primeira alteração por pull request pequeno.

## 20. Critérios de aceite para mudanças

Uma mudança só deve ser considerada concluída quando:

- atende ao comportamento solicitado;
- não mistura dados entre usuários;
- preserva usuários, links, QR Codes e uploads existentes;
- não cria texto ou avaliações fictícias na página pública;
- mantém seções vazias ocultas;
- funciona no desktop e no mobile;
- passa na suíte automatizada aplicável;
- não adiciona vulnerabilidade alta conhecida;
- foi publicada no commit esperado;
- passou pelo teste pós-deploy;
- teve documentação atualizada quando altera API, banco, ambiente ou operação.

## 21. Governança e atualização deste documento

Este documento deve ser atualizado sempre que houver:

- nova rota ou integração;
- alteração de esquema;
- nova variável de ambiente;
- mudança no fluxo de pagamento ou ativação;
- mudança de domínio, serviço ou armazenamento;
- novo papel de usuário;
- alteração relevante de segurança;
- novo procedimento de deploy, backup ou recuperação.

O responsável pela mudança técnica deve atualizar a documentação no mesmo pull request. Decisões comerciais e prioridades continuam sob aprovação do proprietário do CardLink.

---

## Anexo A — Referências internas

- `README.md` — visão técnica resumida e execução.
- `docs/README.md` — resumo de produto e operação.
- `docs/DIRETRIZES-PRODUTO-MARKETING.md` — posicionamento e limites comerciais.
- `docs/MELHORIAS-PREVISTAS.md` — evoluções e decisões registradas.
- `docs/PLANO-TESTE-SEMANA-1.md` — testes operacionais e portões.
- `docs/STATUS-CORRECOES-2026-08-15.md` — histórico de correções.
- `docs/SUBPROJETO-IA-PARA-SAAS.md` — IA separada da versão comercial.
- `backend/test/` — comportamento verificável e regressões.

## Anexo B — Glossário

- **Card:** registro técnico que representa a página pública de um usuário.
- **Slug:** parte única da URL pública do assinante.
- **PRO/ACTIVE:** cliente com acesso comercial válido.
- **PENDING:** conta criada após pagamento e ainda não ativada.
- **Internal test:** conta operacional sem venda, excluída das métricas comerciais.
- **QR scan:** abertura pela rota de QR; métrica separada de visualização.
- **Webhook:** notificação servidor a servidor usada como fonte de verdade do pagamento.
- **vCard:** arquivo `.vcf` gerado para salvar o contato no telefone.
- **R2:** armazenamento de objetos da Cloudflare compatível com S3.
- **PWA:** recursos que permitem instalar/abrir o site pela tela inicial.

