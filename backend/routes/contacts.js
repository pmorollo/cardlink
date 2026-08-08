const express = require('express');
const { cards: cardRepo, contacts: contactRepo } = require('../db/repository');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/public/:slug', async (req, res) => {
  const card = await cardRepo.findBySlug(req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  await cardRepo.update(card.id, { views_count: (card.views_count || 0) + 1 });

  // Only expose fields needed for public display — never expose user_id or internals
  const { user_id, views_count, created_at, updated_at, ...publicCard } = card;
  res.json(publicCard);
});

router.post('/public/:slug/contact', async (req, res) => {
  const card = await cardRepo.findBySlug(req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const name    = (req.body.name    || '').trim().substring(0, 100);
  const email   = (req.body.email   || '').trim().substring(0, 200);
  const phone   = (req.body.phone   || '').trim().substring(0, 30);
  const message = (req.body.message || '').trim().substring(0, 1000);

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  // Basic anti-spam: reject if name looks like HTML/script injection
  if (/<[^>]*>/.test(name) || /<[^>]*>/.test(message)) {
    return res.status(400).json({ error: 'Conteúdo inválido' });
  }

  await contactRepo.insert({
    card_id: card.id,
    name,
    email: email || null,
    phone: phone || null,
    message: message || null
  });

  res.status(201).json({ message: 'Contato enviado com sucesso!' });
});

router.get('/cards/:cardId/contacts', authMiddleware, async (req, res) => {
  const cardId = Number(req.params.cardId);
  const card = await cardRepo.findByIdAndUser(cardId, req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const contacts = await contactRepo.findByCardId(card.id);
  contacts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(contacts);
});

module.exports = router;
