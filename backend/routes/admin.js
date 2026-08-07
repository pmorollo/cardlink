const express = require('express');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const adminRouter = express.Router();
const supportRouter = express.Router();

// Admin validation middleware
function adminMiddleware(req, res, next) {
  const user = query('users').findById(req.userId);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito ao proprietário da plataforma' });
  }
  next();
}

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────

// 1. Stats route
adminRouter.get('/stats', authMiddleware, adminMiddleware, (req, res) => {
  const users = query('users').get();
  const cards = query('cards').get();
  const contacts = query('contacts').get();

  const totalUsers = users.length;
  const totalCards = cards.length;
  const totalContacts = contacts.length;
  const totalViews = cards.reduce((sum, c) => sum + (c.views_count || 0), 0);

  res.json({
    totalUsers,
    totalCards,
    totalContacts,
    totalViews
  });
});

// 2. Users list route
adminRouter.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = query('users').get();
  const cards = query('cards').get();

  const list = users.map(u => {
    const card = cards.find(c => c.user_id === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      plan: u.plan || 'free',
      is_admin: u.is_admin || false,
      created_at: u.created_at,
      card: card ? { slug: card.slug, views_count: card.views_count || 0 } : null
    };
  });

  res.json(list);
});

// 3. User plan toggle route (Upgrade/Downgrade)
adminRouter.post('/users/:id/plan', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { plan } = req.body;

  if (!['free', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Plano inválido' });
  }

  const user = query('users').findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const updatedUser = query('users').update(userId, { plan });
  res.json({ message: `Plano do usuário atualizado para ${plan}`, user: { id: updatedUser.id, plan: updatedUser.plan } });
});

// 4. Support Tickets list route for Admin
adminRouter.get('/support', authMiddleware, adminMiddleware, (req, res) => {
  const tickets = query('support_tickets').get();
  const users = query('users').get();

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
supportRouter.post('/', authMiddleware, (req, res) => {
  const { subject, message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  const ticket = query('support_tickets').insert({
    user_id: req.userId,
    subject: subject || 'Dúvida geral',
    message,
    status: 'open'
  });

  res.json({ message: 'Chamado de suporte enviado com sucesso', ticket });
});

module.exports = { adminRouter, supportRouter };
