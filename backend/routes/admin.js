const express = require('express');
const { users: userRepo, cards: cardRepo, contacts: contactRepo, supportTickets: ticketRepo } = require('../db/repository');
const authMiddleware = require('../middleware/auth');

const adminRouter = express.Router();
const supportRouter = express.Router();

// Admin validation middleware
async function adminMiddleware(req, res, next) {
  try {
    const user = await userRepo.findById(req.userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário da plataforma' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────

// 1. Stats route
adminRouter.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  const [users, cards, contacts] = await Promise.all([
    userRepo.all(),
    cardRepo.all(),
    contactRepo.all(),
  ]);

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
adminRouter.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  const users = await userRepo.all();
  const cards = await cardRepo.all();

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
adminRouter.post('/users/:id/plan', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { plan } = req.body;

  if (!['free', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Plano inválido' });
  }

  const user = await userRepo.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const updatedUser = await userRepo.update(userId, { plan });
  res.json({ message: `Plano do usuário atualizado para ${plan}`, user: { id: updatedUser.id, plan: updatedUser.plan } });
});

// 4. Support Tickets list route for Admin
adminRouter.get('/support', authMiddleware, adminMiddleware, async (req, res) => {
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
supportRouter.post('/', authMiddleware, async (req, res) => {
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

module.exports = { adminRouter, supportRouter };
