const express = require('express');
const { users: userRepo, cards: cardRepo, contacts: contactRepo, supportTickets: ticketRepo, adminMessages: adminMessageRepo } = require('../db/repository');
const authMiddleware = require('../middleware/auth');
const { requireAdmin, requireCustomer } = require('../middleware/roles');
const { sendEmail } = require('../utils/email');

const adminRouter = express.Router();
const supportRouter = express.Router();
const messageRouter = express.Router();

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────

// 1. Stats route
adminRouter.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  const [users, cards, contacts] = await Promise.all([
    userRepo.all(),
    cardRepo.all(),
    contactRepo.all(),
  ]);

  const customers = users.filter(u => !u.is_admin);
  const commercialCustomers = customers.filter(u => !u.is_test_account);
  const internalTests = customers.filter(u => u.is_test_account);
  const customerIds = new Set(customers.map(u => u.id));
  const customerCards = cards.filter(c => customerIds.has(c.user_id));
  const customerCardIds = new Set(customerCards.map(c => c.id));
  const customerContacts = contacts.filter(c => customerCardIds.has(c.card_id));
  const totalUsers = commercialCustomers.length;
  const activeSubscriptions = commercialCustomers.filter(u => u.subscription_status === 'active' && u.plan === 'pro').length;
  const totalCards = customerCards.length;
  const totalContacts = customerContacts.length;
  const totalViews = customerCards.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalQrScans = customerCards.reduce((sum, c) => sum + (c.qr_scans_count || 0), 0);

  // Calculate referrals summary
  const referralStats = {};
  customers.forEach(u => {
    if (u.referred_by) {
      const ref = u.referred_by;
      if (!referralStats[ref]) {
        referralStats[ref] = { total: 0, pro: 0 };
      }
      referralStats[ref].total++;
      if (u.plan === 'pro') {
        referralStats[ref].pro++;
      }
    }
  });

  res.json({
    totalUsers,
    totalCards,
    totalContacts,
    totalViews,
    totalQrScans,
    activeSubscriptions,
    internalTests: internalTests.length,
    referralStats
  });
});

// 2. Users list route
adminRouter.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  const users = await userRepo.all();
  const cards = await cardRepo.all();

  const list = users.filter(u => !u.is_admin).map(u => {
    const card = cards.find(c => c.user_id === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      plan: u.plan || 'inactive',
      account_status: u.account_status,
      subscription_status: u.subscription_status,
      subscription_source: u.subscription_source,
      subscription_plan: u.subscription_plan,
      subscription_amount: u.subscription_amount,
      subscription_reference: u.subscription_reference,
      subscription_updated_at: u.subscription_updated_at,
      is_test_account: u.is_test_account || false,
      is_admin: u.is_admin || false,
      referred_by: u.referred_by || null,
      created_at: u.created_at,
      card: card ? { slug: card.slug, views_count: card.views_count || 0 } : null
    };
  });

  res.json(list);
});

// 3. User plan toggle route (Upgrade/Downgrade)
adminRouter.post('/users/:id/plan', authMiddleware, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { plan } = req.body;

  if (!['inactive', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Plano inválido' });
  }

  const user = await userRepo.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  if (user.is_admin) {
    return res.status(400).json({ error: 'A conta administrativa não possui plano de assinatura.' });
  }
  if (!user.is_test_account || user.subscription_source !== 'internal_test') {
    return res.status(409).json({
      error: 'cakto_managed_subscription',
      message: 'Assinaturas comerciais são geridas pela Cakto e não podem ser alteradas manualmente no painel.'
    });
  }

  const active = plan === 'pro';
  const updatedUser = await userRepo.update(userId, {
    plan,
    account_status: active ? 'active' : 'inactive',
    subscription_status: active ? 'active' : 'inactive',
    subscription_updated_at: new Date().toISOString()
  });
  res.json({ message: `Conta interna de teste atualizada para ${plan}`, user: { id: updatedUser.id, plan: updatedUser.plan } });
});

// 4. Send a platform message to one customer
adminRouter.post('/users/:id/message', authMiddleware, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const subject = String(req.body?.subject || 'Mensagem do CardLink').trim().substring(0, 120);
  const message = String(req.body?.message || '').trim().substring(0, 3000);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Usuário inválido' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  const user = await userRepo.findById(userId);
  if (!user || user.is_admin) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const adminMessage = await adminMessageRepo.insert({ user_id: userId, subject, message });

  // E-mail é apenas uma notificação complementar; a mensagem oficial fica no painel.
  if (user.email) {
    sendEmail({
      to: user.email,
      subject: `CardLink — ${subject}`,
      text: `${message}\n\nAcesse sua conta CardLink para visualizar esta mensagem.`,
      html: `<p>${message.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g, '<br>')}</p><p style="font-size:12px;color:#64748b;">Acesse sua conta CardLink para visualizar esta mensagem.</p>`
    }).catch(err => console.error('Falha ao enviar notificação de mensagem administrativa:', err.message));
  }

  res.json({ message: 'Mensagem enviada ao usuário', adminMessage });
});

// 5. Support Tickets list route for Admin
adminRouter.get('/support', authMiddleware, requireAdmin, async (req, res) => {
  const tickets = await ticketRepo.all();
  const users = await userRepo.all();

  const list = tickets.map(t => {
    const user = users.find(u => u.id === t.user_id);
    return {
      id: t.id,
      user_id: t.user_id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      created_at: t.created_at,
      user: user ? { name: user.name, email: user.email, whatsapp: user.whatsapp } : null
    };
  });

  res.json(list);
});

// ─── SUPPORT ROUTES ────────────────────────────────────────────────────

// Send Support ticket (Client Dashboard)
supportRouter.post('/', authMiddleware, requireCustomer, async (req, res) => {
  const { subject, message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  const ticket = await ticketRepo.insert({
    user_id: req.userId,
    subject: subject || 'Dúvida geral',
    message,
    status: 'open'
  });

  res.json({ message: 'Chamado de suporte enviado com sucesso', ticket });
});

// ─── PLATFORM MESSAGE ROUTES (Customer) ───────────────────────────────
messageRouter.get('/', authMiddleware, requireCustomer, async (req, res) => {
  const messages = await adminMessageRepo.findByUserId(req.userId);
  res.json(messages);
});

messageRouter.post('/:id/read', authMiddleware, requireCustomer, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Mensagem inválida' });
  const updated = await adminMessageRepo.markRead(id, req.userId);
  if (!updated) return res.status(404).json({ error: 'Mensagem não encontrada' });
  res.json({ message: 'Mensagem marcada como lida', adminMessage: updated });
});

module.exports = { adminRouter, supportRouter, messageRouter };
