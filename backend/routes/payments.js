const express = require('express');
const { users } = require('../db/repository');

const router = express.Router();

// Webhook da Cakto para ativação e cancelamento automático de planos
router.post('/cakto-webhook', async (req, res) => {
  try {
    const caktoSecret = process.env.CAKTO_SECRET;
    if (caktoSecret) {
      const clientToken = req.query.token || req.headers['x-cakto-token'] || req.headers['authorization'];
      if (!clientToken || clientToken.replace('Bearer ', '').trim() !== caktoSecret.trim()) {
        console.warn('⚠️ Tentativa de webhook não autorizada: Token inválido ou ausente.');
        return res.status(401).json({ error: 'Token de autenticação inválido ou ausente.' });
      }
    } else {
      console.warn('⚠️ AVISO: A variável de ambiente CAKTO_SECRET não está definida. O webhook da Cakto está vulnerável a requisições forjadas!');
    }

    const payload = req.body;
    console.log('📬 Webhook recebido da Cakto:', JSON.stringify(payload, null, 2));

    // Identifica e-mail do cliente
    let buyerEmail = payload.email || (payload.customer && payload.customer.email);
    if (payload.data && payload.data.customer) {
      buyerEmail = buyerEmail || payload.data.customer.email;
    }
    
    // Identifica ID de referência externa opcional
    let externalId = payload.external_id || payload.custom_id || payload.reference_id;
    if (payload.metadata && payload.metadata.userId) {
      externalId = externalId || payload.metadata.userId;
    }

    if (!buyerEmail && !externalId) {
      return res.status(400).json({ error: 'Comprador não identificado na requisição' });
    }

    // Identifica o status do pagamento
    // Tipicamente: 'paid', 'approved', 'completed', 'payment.paid', 'subscription.active'
    let status = (payload.status || payload.event || '').toLowerCase();
    if (payload.data && payload.data.status) {
      status = status || payload.data.status.toLowerCase();
    }

    const isSuccess = 
      status.includes('paid') || 
      status.includes('approved') || 
      status.includes('success') || 
      status.includes('complete') || 
      status.includes('active') ||
      status === 'concluido' ||
      status === 'pago';

    const isCancellation = 
      status.includes('refund') || 
      status.includes('cancel') || 
      status.includes('chargeback') || 
      status === 'devolvido' ||
      status === 'cancelado';

    // Localiza o usuário correspondente no banco
    let user = null;
    if (externalId) {
      user = await users.findById(Number(externalId));
    }
    if (!user && buyerEmail) {
      user = await users.findByLogin(buyerEmail.trim().toLowerCase());
    }

    if (!user) {
      console.warn(`⚠️ Usuário não localizado para o e-mail: ${buyerEmail} / ID: ${externalId}`);
      // Retorna 200 para evitar que a Cakto fique reenviando em loop caso o usuário tenha digitado e-mail diferente
      return res.json({ received: true, error: 'Usuário não cadastrado' });
    }

    if (isSuccess) {
      console.log(`🎉 Ativando plano PRO para o usuário: ${user.name} (${user.email})`);
      await users.update(user.id, { plan: 'pro' });
      return res.json({ success: true, user: user.email, plan: 'pro' });
    }

    if (isCancellation) {
      console.log(`🔴 Cancelando plano PRO para o usuário: ${user.name} (${user.email})`);
      // O dono (admin) não deve ser rebaixado a free se receber reembolso em testes
      const isOwner = user.is_admin;
      await users.update(user.id, { plan: isOwner ? 'pro' : 'free' });
      return res.json({ success: true, user: user.email, plan: isOwner ? 'pro' : 'free' });
    }

    // Status neutros (como carrinho abandonado ou boleto gerado)
    res.json({ received: true, status });
  } catch (err) {
    console.error('Erro ao processar webhook da Cakto:', err);
    res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
  }
});

module.exports = router;
