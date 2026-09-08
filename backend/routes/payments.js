const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { users } = require('../db/repository');
const { sendEmail } = require('../utils/email');
const { createActivationToken, sendActivationEmail } = require('../utils/accountActivation');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { syncCaktoCatalog, getPublicCatalogState, getKitFilhotesStatus } = require('../services/cakto');

const router = express.Router();

const ACTIVATE_EVENTS = ['purchase_approved', 'subscription_renewed'];
const CANCEL_EVENTS = ['subscription_canceled', 'refund', 'chargeback'];

// Expõe somente links públicos de checkout e indicadores não sensíveis.
// As credenciais da Cakto nunca são enviadas ao navegador.
router.get('/cakto-checkout-links', (req, res) => {
  res.json(getPublicCatalogState());
});

// Auditoria somente leitura do produto digital hospedado na mesma conta Cakto.
// Expõe apenas configuração comercial pública; credenciais e dados de compradores
// permanecem exclusivamente no servidor.
router.get('/cakto-kit-filhotes-status', async (req, res) => {
  try {
    res.json(await getKitFilhotesStatus());
  } catch (error) {
    console.error(`Erro ao consultar Kit Filhotes na Cakto: ${error.message}`);
    res.status(502).json({ error: 'Não foi possível consultar o Kit Filhotes na Cakto.' });
  }
});

// Permite ao administrador repetir a sincronização sem reiniciar o serviço.
router.post('/cakto-sync', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const state = await syncCaktoCatalog({ createAnnual: true });
    res.json(state);
  } catch (error) {
    console.error(`Erro ao sincronizar catálogo Cakto: ${error.message}`);
    res.status(502).json({ error: 'Não foi possível sincronizar o catálogo da Cakto.' });
  }
});

function cleanEmail(value) {
  return String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase().substring(0, 200);
}

function cleanName(value, fallbackEmail) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ').substring(0, 100);
  if (raw) return raw;
  const local = String(fallbackEmail || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/\b\w/g, c => c.toUpperCase()).substring(0, 100) : 'Cliente CardLink';
}

function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
}

function extractPurchaseInfo(payload) {
  const data = payload.data || {};
  const customer = data.customer || payload.customer || {};
  const buyerEmail = cleanEmail(firstDefined(data.customerEmail, customer.email, payload.email));
  const buyerName = cleanName(firstDefined(data.customerName, customer.name, data.name, payload.name), buyerEmail);

  const rawPlan = String(firstDefined(
    data.metadata && data.metadata.plan,
    payload.metadata && payload.metadata.plan,
    data.plan,
    payload.plan,
    data.offerName,
    data.productName,
    payload.productName
  ) || '').toLowerCase();
  const subscriptionPlan = rawPlan.includes('anual') || rawPlan.includes('annual') ? 'annual'
    : rawPlan.includes('mensal') || rawPlan.includes('monthly') ? 'monthly'
      : 'unknown';

  const amountValue = firstDefined(data.amount, data.price, data.total, payload.amount, payload.price, payload.total);
  const subscriptionAmount = amountValue !== undefined && amountValue !== null ? String(amountValue).substring(0, 50) : null;
  const subscriptionReference = String(firstDefined(
    data.subscriptionId,
    data.purchaseId,
    data.orderId,
    data.id,
    payload.subscriptionId,
    payload.purchaseId,
    payload.orderId,
    payload.id
  ) || '').substring(0, 255) || null;

  let externalId = firstDefined(payload.external_id, payload.custom_id, data.external_id, data.custom_id);
  if (!externalId && data.metadata && data.metadata.userId) externalId = data.metadata.userId;

  return { buyerEmail, buyerName, subscriptionPlan, subscriptionAmount, subscriptionReference, externalId };
}

async function notifyAdminOfSale(user) {
  try {
    const allUsers = await users.all();
    const admin = allUsers.find(u => u.is_admin);
    if (!admin || !admin.email) return;

    await sendEmail({
      to: admin.email,
      subject: 'Nova assinatura aprovada no CardLink',
      text: `Nova assinatura aprovada: ${user.name} (${user.email}). Plano: ${user.subscription_plan || 'não identificado'}. Valor: ${user.subscription_amount || 'não informado'}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;padding:20px;">
          <h2 style="color:#7c3aed;">Nova assinatura CardLink</h2>
          <p><strong>Cliente:</strong> ${escapeHtml(user.name)}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Plano:</strong> ${escapeHtml(user.subscription_plan || 'não identificado')}</p>
          <p><strong>Valor:</strong> ${escapeHtml(user.subscription_amount || 'não informado')}</p>
          <p>A assinatura já foi registrada no painel administrativo.</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Falha ao notificar administrador sobre nova assinatura:', err.message);
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

router.post('/cakto-webhook', async (req, res) => {
  try {
    const caktoSecret = process.env.CAKTO_SECRET;
    const payload = req.body || {};

    if (process.env.NODE_ENV === 'production' && !caktoSecret) {
      console.error('❌ CAKTO_SECRET não configurado em produção. Webhook recusado.');
      return res.status(503).json({ error: 'Webhook não configurado corretamente.' });
    }

    if (caktoSecret) {
      const provided = payload.secret || req.headers['x-cakto-secret'] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
      if (!provided || String(provided).trim() !== String(caktoSecret).trim()) {
        console.warn('⚠️ Tentativa de webhook não autorizada: Secret inválido ou ausente.');
        return res.status(401).json({ error: 'Secret de autenticação inválido ou ausente.' });
      }
    } else {
      console.warn('⚠️ AVISO: CAKTO_SECRET não está definida. Webhook permitido apenas para desenvolvimento local.');
    }

    const data = payload.data || {};
    const event = String(payload.event || payload.type || '').toLowerCase();
    const status = String(payload.status || data.status || '').toLowerCase();
    console.log(`📬 Webhook Cakto autenticado: evento=${event || 'desconhecido'}`);

    const purchase = extractPurchaseInfo(payload);
    if (!purchase.buyerEmail && !purchase.externalId) {
      return res.status(400).json({ error: 'Comprador não identificado na requisição' });
    }

    // Eventos explícitos da Cakto têm precedência sobre textos genéricos de status.
    // 'subscription_created' apenas indica que a assinatura foi criada; não prova pagamento aprovado.
    const isSuccess = ACTIVATE_EVENTS.includes(event) ||
      (!event && ['paid', 'approved', 'complete', 'success', 'concluido', 'pago'].some(s => status.includes(s)));
    const isCancellation = CANCEL_EVENTS.includes(event) ||
      (!event && ['refund', 'cancel', 'chargeback', 'devolvido', 'cancelado'].some(s => status.includes(s)));

    let user = null;
    if (purchase.externalId && /^\d+$/.test(String(purchase.externalId))) {
      user = await users.findById(Number(purchase.externalId));
    }
    if (!user && purchase.buyerEmail) user = await users.findByEmail(purchase.buyerEmail);

    if (user && user.is_admin) {
      console.warn(`⚠️ Webhook Cakto ignorado para conta administrativa userId=${user.id}.`);
      return res.json({ received: true, ignored: 'administrative_account' });
    }
    if (user && user.is_test_account) {
      console.warn(`⚠️ Webhook Cakto ignorado para conta interna de teste userId=${user.id}.`);
      return res.json({ received: true, ignored: 'internal_test_account' });
    }

    if (isSuccess) {
      const now = new Date().toISOString();
      let activationToken = null;
      let activationSent = false;

      if (!user) {
        const activation = createActivationToken();
        const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        user = await users.insert({
          name: purchase.buyerName,
          email: purchase.buyerEmail,
          whatsapp: null,
          password_hash: placeholderPassword,
          is_admin: false,
          plan: 'pro',
          account_status: 'pending_activation',
          subscription_status: 'active',
          subscription_source: 'cakto',
          subscription_plan: purchase.subscriptionPlan,
          subscription_amount: purchase.subscriptionAmount,
          subscription_reference: purchase.subscriptionReference,
          is_test_account: false,
          activation_token_hash: activation.tokenHash,
          activation_expires: activation.expiresAt,
          subscription_updated_at: now,
          referred_by: null
        });
        activationToken = activation.token;
        await sendActivationEmail({ req, user, token: activation.token });
        activationSent = true;
        console.log(`🎉 Cakto: nova conta paga criada para userId=${user.id}; aguardando ativação.`);
      } else {
        const needsActivation = user.account_status === 'pending_activation' || !!user.activation_token_hash;
        const updates = {
          plan: 'pro',
          subscription_status: 'active',
          subscription_source: 'cakto',
          subscription_plan: purchase.subscriptionPlan !== 'unknown' ? purchase.subscriptionPlan : user.subscription_plan,
          subscription_amount: purchase.subscriptionAmount || user.subscription_amount,
          subscription_reference: purchase.subscriptionReference || user.subscription_reference,
          subscription_updated_at: now,
          account_status: needsActivation ? 'pending_activation' : 'active'
        };

        if (needsActivation) {
          const activation = createActivationToken();
          updates.activation_token_hash = activation.tokenHash;
          updates.activation_expires = activation.expiresAt;
          activationToken = activation.token;
        }

        user = await users.update(user.id, updates);
        if (needsActivation && activationToken) {
          await sendActivationEmail({ req, user, token: activationToken });
          activationSent = true;
        }
        console.log(`🎉 Cakto: assinatura ativa para userId=${user.id}.`);
      }

      await notifyAdminOfSale(user);
      const response = {
        success: true,
        user: user.email,
        plan: 'pro',
        account_status: user.account_status,
        activation_sent: activationSent
      };
      if (process.env.NODE_ENV === 'test' && activationToken) response.activation_token = activationToken;
      return res.json(response);
    }

    if (isCancellation) {
      if (!user) {
        console.warn('⚠️ Cakto: cancelamento recebido para usuário ainda não localizado.');
        return res.json({ received: true, ignored: 'user_not_found' });
      }
      user = await users.update(user.id, {
        plan: 'inactive',
        account_status: 'inactive',
        subscription_status: 'cancelled',
        subscription_source: user.subscription_source || 'cakto',
        subscription_updated_at: new Date().toISOString()
      });
      console.log(`🔴 Cakto: assinatura desativada para userId=${user.id}.`);
      return res.json({ success: true, user: user.email, plan: 'inactive', subscription_status: 'cancelled' });
    }

    return res.json({ received: true, event });
  } catch (err) {
    console.error('Erro ao processar webhook da Cakto:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
