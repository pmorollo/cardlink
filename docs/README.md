# CardLink — Resumo Rápido

**Produto:** cartão de visita digital que vira um mini-site de vendas profissional, compartilhável por um único link.

**Público:** autônomos, prestadores de serviços, profissionais liberais e comércios locais.

**Oferta:**
- Mensal: **R$ 12,90/mês**
- Anual: **R$ 99,00/ano** (36% de economia)
- Pagamento via **Cakto** (Pix: 0% + R$ 2,49 · Cartão: 4,99% + R$ 2,49)

**Diferenciais:** link único, WhatsApp em 1 toque, todas as redes, vitrine de produtos, depoimentos, galeria, 6 temas premium, assistente de conteúdo com IA, QR code de balcão + métricas, ativação imediata após pagamento.

**Link oficial:** `https://cardlink-production-abd2.up.railway.app/`

---

Documento completo: ver `cardlink-apresentacao-marketing.md`.


**Diretrizes atuais de produto e marketing:** ver `DIRETRIZES-PRODUTO-MARKETING.md`.


## Fluxo de acesso atual

- **Conta de cliente:** nasce após pagamento confirmado pela Cakto e precisa ser ativada por link enviado ao e-mail do comprador.
- **Conta administrativa:** única, sem cartão e sem assinatura.
- **Contas internas de teste:** criadas manualmente e excluídas das métricas comerciais.

Comandos de manutenção local:

- `npm run admin:set -- email@exemplo.com SenhaCom8+ "Administrador"`
- `npm run test-user:create -- email@exemplo.com SenhaCom8+ "Nome do teste"`
