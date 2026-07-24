const express = require('express');
const slugify = require('slugify');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function generateUniqueSlug(name, excludeId = null) {
  let base = slugify(name, { lower: true, strict: true }) || 'cartao';
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = query('cards').findOne(c => c.slug === slug && c.id !== excludeId);
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

router.get('/stats/summary', authMiddleware, (req, res) => {
  const card = query('cards').findOne(c => c.user_id === req.userId);
  if (!card) {
    return res.json({ hasCard: false, card: null, stats: { views: 0, contacts: 0 } });
  }

  const contacts = query('contacts').find(c => c.card_id === card.id);
  contacts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    hasCard: true,
    card,
    stats: {
      views: card.views_count || 0,
      contacts: contacts.length,
      recentContacts: contacts.slice(0, 5)
    }
  });
});

router.get('/', authMiddleware, (req, res) => {
  const cards = query('cards').find(c => c.user_id === req.userId);
  cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(cards);
});

router.post('/', authMiddleware, (req, res) => {
  const existing = query('cards').findOne(c => c.user_id === req.userId);
  if (existing) {
    return res.status(409).json({ error: 'Você já possui um cartão. Edite o existente.' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const slug = generateUniqueSlug(name);

  const card = query('cards').insert({
    user_id: req.userId,
    slug,
    name,
    business: req.body.business || null,
    title: req.body.title || null,
    photo_url: req.body.photo_url || null,
    description: req.body.description || null,
    phone: req.body.phone || null,
    email: req.body.email || null,
    address: req.body.address || null,
    whatsapp: req.body.whatsapp || null,
    whatsapp_group: req.body.whatsapp_group || null,
    instagram: req.body.instagram || null,
    facebook: req.body.facebook || null,
    linkedin: req.body.linkedin || null,
    tiktok: req.body.tiktok || null,
    youtube: req.body.youtube || null,
    twitter: req.body.twitter || null,
    theme: req.body.theme || 'midnight',
    views_count: 0
  });

  res.status(201).json(card);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const card = query('cards').findOne(c => c.id === id && c.user_id === req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }
  res.json(card);
});

router.put('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const card = query('cards').findOne(c => c.id === id && c.user_id === req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  let slug = card.slug;
  if (req.body.name && req.body.name !== card.name) {
    slug = generateUniqueSlug(req.body.name, card.id);
  }

  const updated = query('cards').update(card.id, {
    slug,
    name: req.body.name || card.name,
    business: req.body.business !== undefined ? req.body.business : card.business,
    title: req.body.title !== undefined ? req.body.title : card.title,
    photo_url: req.body.photo_url !== undefined ? req.body.photo_url : card.photo_url,
    description: req.body.description !== undefined ? req.body.description : card.description,
    phone: req.body.phone !== undefined ? req.body.phone : card.phone,
    email: req.body.email !== undefined ? req.body.email : card.email,
    address: req.body.address !== undefined ? req.body.address : card.address,
    whatsapp: req.body.whatsapp !== undefined ? req.body.whatsapp : card.whatsapp,
    whatsapp_group: req.body.whatsapp_group !== undefined ? req.body.whatsapp_group : card.whatsapp_group,
    instagram: req.body.instagram !== undefined ? req.body.instagram : card.instagram,
    facebook: req.body.facebook !== undefined ? req.body.facebook : card.facebook,
    linkedin: req.body.linkedin !== undefined ? req.body.linkedin : card.linkedin,
    tiktok: req.body.tiktok !== undefined ? req.body.tiktok : card.tiktok,
    youtube: req.body.youtube !== undefined ? req.body.youtube : card.youtube,
    twitter: req.body.twitter !== undefined ? req.body.twitter : card.twitter,
    theme: req.body.theme || card.theme,
    updated_at: new Date().toISOString()
  });

  res.json(updated);
});

router.delete('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const card = query('cards').findOne(c => c.id === id && c.user_id === req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  query('cards').delete(card.id);
  res.json({ message: 'Cartão excluído com sucesso' });
});

module.exports = router;
