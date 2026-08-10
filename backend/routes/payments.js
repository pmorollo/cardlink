const express = require('express');
const { users } = require('../db/repository');

const router = express.Router();

// Eventos da Cakto (docs: docs.cakto.com.br) que ativam o plano PRO
const ACTIVATE_EVENTS = ['purchase_approved', 'subscription_created', 'subscription_renewed'];
// Eventos que cancelam/rebaixam o plano
const CANCEL_EVENTS = ['subscription_canceled', 'refund', 'chargeback'];

// Webhook da Cakto para ativação e cancelamento automático de planos
router.post('/cakto-webhook', async (req, res) => {
  try {
    const caktoSecret = process.env.CAKTO_SECRET;
    const payload = req.body || {};

    // Em produção o CAKTO_SECRET é obrigatório (fail closed)
    if (process.env.NODE_ENV === 'production' && !caktoSecret) {
      console.error('❌ CAKTO_SECRET não configurado em produção. Webhook recusado.');
      return res.status(503).json({ error: 'Webhook não configurado corretamente.' });
    }

    // A Cakto envia o campo `secret` no corpo do payload
    if (caktoSecret) {
      const provided = payload.secret || req.headers['x-cakto-secret'] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
      if (!provided || String(provided).trim() !== String(caktoSecret).trim()) {
        console.warn('⚠️ Tentativa de webhook não autorizada: Secret inválido ou ausente.');
        return res.status(401).json({ error: 'Secret de autenticação inválido ou ausente.' });
      }
    } else {
      console.warn('⚠️ AVISO: CAKTO_SECRET não está definida. O webhook da Cakto está vulnerável a requisições forjadas!');
    }

    console.log('📬 Webhook recebido da Cakto:', JSON.stringify(payload, null, 2));

    const data = payload.data || {};
    const event = String(payload.event || payload.type || '').toLowerCase();
    const status = String(payload.status || '').toLowerCase();

    // Identifica e-mail do comprador (formato real da Cakto: data.customerEmail)
    let buyerEmail = data.customerEmail || (data.customer && data.customer.email) || payload.email || (payload.customer && payload.customer.email);
    if (Array.isArray(buyerEmail)) buyerEmail = buyerEmail[0];

    // Identifica ID de referência externa opcional
    let externalId = payload.external_id || payload.custom_id || data.external_id || data.custom_id;
    if (data.metadata && data.metadata.userId) {
      externalId = externalId || data.metadata.userId;
    }

    if (!buyerEmail && !externalId) {
      return res.status(400).json({ error: 'Comprador não identificado na requisição' });
    }

    const isSuccess =
      ACTIVATE_EVENTS.includes(event) ||
      ['paid', 'approved', 'complete', 'success', 'concluido', 'pago'].some(s => status.includes(s));

    const isCancellation =
      CANCEL_EVENTS.includes(event) ||
      ['refund', 'cancel', 'chargeback', 'devolvido', 'cancelado'].some(s => status.includes(s));

    // Localiza o usuário correspondente no banco
    let user = null;
    if (externalId) {
      user = await users.findById(Number(externalId));
    }
    if (!user && buyerEmail) {
      user = await users.findByLogin(String(buyerEmail).trim().toLowerCase());
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
    res.json({ received: true, event });
  } catch (err) {
    console.error('Erro ao processar webhook da Cakto:', err);
    res.status(500).json({ error: 'Erro interno do servidor: ' + err.message });
  }
});

module.exports = router;
