# CardLink — Modelo único gratuito (decisão de 13/10/2026)

**Status:** implementado no código em 20/10/2026
**Decisão do proprietário:** 13/10/2026

## Decisão

O CardLink passa a operar com **versão única gratuita, com todos os recursos liberados**:

- QR Code integrado/rastreado;
- formulário público de mensagens/leads e painel de contatos;
- catálogo/documento em PDF;
- galeria ampliada;
- todos os temas;
- demais recursos anteriormente identificados como PRO.

Não há trial, não há bloqueio funcional e **não há indução a assinatura na landing page ou em criativos**. O CTA público é criar conta gratuita e usar.

## Selo PRO

O plano `pro` permanece apenas como **selo visual**:

- oferta apresentada **somente dentro do painel**;
- benefício: **3 estrelinhas** de status no perfil;
- **nenhuma diferença funcional**;
- mensal R$ 12,90 / anual R$ 99,00, processados pela Cakto;
- cancelamento, estorno ou chargeback removem apenas o selo; a conta e todos os recursos continuam ativos.

## Implementação

### Backend

- `backend/utils/subscription.js`
  - `hasActiveCustomerAccess(user)` valida apenas `account_status === 'active'`;
  - novo `hasFullAccess(user)` libera todos os recursos para qualquer conta ativa;
  - `isProCustomer(user)` fica restrito a exibição de selo/métricas.
- `backend/middleware/roles.js`: `requirePro` passa a usar `hasFullAccess`.
- `backend/routes/cards.js`: estatísticas de contatos, galeria e temas sem limite por plano.
- `backend/routes/contacts.js`: página pública completa; formulário e painel de contatos para todos.
- `backend/routes/upload.js`: PDF liberado para todos.
- `backend/routes/ai.js`: mantido oculto/fora da oferta comercial (decisão de produto anterior); não integra o escopo público atual.

### Frontend

- Landing page sem preço, sem "Assinar Pro" e sem CTA de checkout; CTA mantido em "Criar Cartão"/cadastro gratuito.
- Modal "Recurso Exclusivo PRO" removido.
- Travas de galeria (4 fotos), temas, PDF, contatos e QR removidas.
- Painel sem banner de upgrade; menu do usuário exibe "Selo PRO (opcional)" apenas para quem ainda não tem o selo.
- Modal do selo reescrito para deixar explícito que todos os recursos já estão liberados.
- FAQ, manual e termos atualizados para o modelo único.

## Testes

Suíte local executada em 20/10/2026:

- `smoke.test.js`: 37/37
- `templates.test.js`: 5/5
- Total: **42/42**

Cobertura nova/ajustada:

- conta gratuita acessa QR, leads, contatos, PDF e galeria de 10 fotos;
- cancelamento do selo mantém todos os recursos ativos;
- upload de PDF aceito para conta gratuita.

## O que não muda

- Cakto permanece configurada; **não recadastrar** produto ou ofertas.
- Webhook continua sendo a fonte de verdade do selo.
- Contas pagas existentes mantêm `plan = 'pro'` (selo) até eventual cancelamento; não há migração ou cobrança nova.
- O Assistente de IA continua oculto e fora da oferta comercial.

## Rollback

Reverter o commit desta implementação restaura o modelo Free/Pro anterior. Como não há migração de dados destrutiva, o rollback é apenas de código.
