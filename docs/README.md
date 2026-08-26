# CardLink — Resumo Rápido

**Produto:** o site profissional para colocar o seu negócio na internet em poucos minutos.

**Público:** pequenos negócios, lojas, profissionais liberais, autônomos e prestadores de serviços que precisam divulgar sua atividade na web.

**Oferta:**
- Mensal: **R$ 12,90/mês**
- Anual: **R$ 99,00/ano** (36% de economia)
- Pagamento via **Cakto** (Pix: 0% + R$ 2,49 · Cartão: 4,99% + R$ 2,49)

**Diferenciais:** publicação rápida, edição pelo próprio cliente, serviços/produtos, WhatsApp em 1 toque, redes sociais, depoimentos, galeria, temas, assistente de conteúdo com IA, link compartilhável e QR Code + métricas.

**Link oficial:** `https://cardlink-production-abd2.up.railway.app/`

---

Documento completo: ver `cardlink-apresentacao-marketing.md`.


**Diretrizes atuais de produto e marketing:** ver `DIRETRIZES-PRODUTO-MARKETING.md`.


## Fluxo de acesso atual

- **Conta de cliente:** nasce após pagamento confirmado pela Cakto e precisa ser ativada por link enviado ao e-mail do comprador.
- **Conta administrativa:** única, sem site publicado e sem assinatura.
- **Contas internas de teste:** criadas manualmente e excluídas das métricas comerciais.

Comandos de manutenção local:

- `npm run admin:set -- email@exemplo.com SenhaCom8+ "Administrador"`
- `npm run test-user:create -- email@exemplo.com SenhaCom8+ "Nome do teste"`
