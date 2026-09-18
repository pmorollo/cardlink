# CardLink — Resumo Rápido

**Produto:** apresentação profissional em um único link para reunir o que o cliente precisa ver antes de entrar em contato.

**Mensagem central aprovada:**
> **Tudo o que seu cliente precisa ver antes de chamar você.**

**Público:** pequenos negócios, lojas, profissionais liberais, autônomos e prestadores de serviços que precisam organizar sua presença comercial e facilitar o contato com clientes.

**Oferta:**
- **Free:** R$ 0, página pública ativa e link compartilhável
- **Pro mensal:** R$ 12,90/mês
- **Pro anual:** R$ 99,00/ano (equivalente a R$ 8,25/mês)
- Upgrade Pro via **Cakto**

**Diferenciais comerciais:** serviços/produtos, fotos e portfólio, avaliações, localização, WhatsApp, redes sociais e link compartilhável no Free; QR Code integrado/rastreado, leads/mensagens, PDF e recursos premium no Pro.

**Mecanismo comercial:**
> Instagram · Facebook · QR Code → CardLink → WhatsApp

**Link oficial documentado:** `https://cardlink-production-abd2.up.railway.app/`

> Antes da abertura comercial, confirmar no Railway que este continua sendo o domínio ativo e que aponta para o commit atual da `master`.

---

Documento completo: ver `cardlink-apresentacao-marketing.md`.

Diretrizes atuais de produto e marketing: ver `DIRETRIZES-PRODUTO-MARKETING.md`.

Plano operacional de testes: ver `PLANO-TESTE-SEMANA-1.md`.

O **PLANO MESTRE DE OFERTAS E PUBLICIDADE** é uma referência geral/transversal. Suas premissas devem ser usadas na auditoria final de oferta e comercialização do CardLink, sem substituir o planejamento próprio deste projeto.

## Fluxo de acesso atual

- **Conta Free:** pode ser criada diretamente na landing page, sem cartão, com página pública e link ativos.
- **Conta Pro:** é uma conta Free promovida após pagamento confirmado pela Cakto, ou uma conta Pro criada a partir de uma compra iniciada antes do cadastro. Cancelamento do Pro rebaixa para Free sem derrubar a página.
- **Conta administrativa:** única, exclusiva da operação da plataforma, sem site público e sem assinatura.
- **Conta interna de teste:** criada sem cobrança, marcada como `internal_test`, excluída das métricas comerciais e ativada pelo próprio usuário por link recebido por e-mail.

Comandos de manutenção local:

- Criar/regularizar administrador exclusivo:
  `npm run admin:set -- email@exemplo.com SenhaCom8+ "Administrador"`
- Criar conta interna de teste e enviar ativação:
  `npm run test-user:create -- email@exemplo.com "Nome do teste"`

Nunca defina a senha do usuário de teste pelo comando: o usuário deve criá-la pelo fluxo de ativação.

## Regras de abertura comercial

Antes da distribuição pública:

1. confirmar a versão publicada e o domínio oficial;
2. concluir os testes reais pendentes do plano de homologação;
3. realizar uma compra real separada pela Cakto e validar compra → webhook → ativação;
4. somente na etapa imediatamente anterior à abertura pública, rotacionar o `CAKTO_SECRET` e validar novamente o webhook;
5. executar a auditoria final usando as premissas do Plano Mestre de Ofertas e Publicidade.
