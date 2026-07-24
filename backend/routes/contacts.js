const express = require('express');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/public/:slug', (req, res) => {
  const card = query('cards').findOne(c => c.slug === req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  query('cards').update(card.id, { views_count: (card.views_count || 0) + 1 });

  res.json(card);
});

router.post('/public/:slug/contact', (req, res) => {
  const card = query('cards').findOne(c => c.slug === req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const { name, email, phone, message } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  query('contacts').insert({
    card_id: card.id,
    name,
    email: email || null,
    phone: phone || null,
    message: message || null
  });

  res.status(201).json({ message: 'Contato enviado com sucesso!' });
});

router.get('/:cardId/contacts', authMiddleware, (req, res) => {
  const cardId = Number(req.params.cardId);
  const card = query('cards').findOne(c => c.id === cardId && c.user_id === req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const contacts = query('contacts').find(c => c.card_id === card.id);
  contacts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(contacts);
});

module.exports = router;
