const express = require('express');
const slugify = require('slugify');
const { cards: cardRepo, contacts: contactRepo, users: userRepo } = require('../db/repository');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

async function generateUniqueSlug(name, excludeId = null) {
  let base = slugify(name, { lower: true, strict: true }) || 'cartao';
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await cardRepo.findBySlugExcluding(slug, excludeId);
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

// Sanitiza valores de redes sociais / links para bloquear esquemas perigosos
// (javascript:, data:, vbscript:, file:) e manter apenas https/http, @usuário
// ou handle (wa.me é liberado para WhatsApp).
function sanitizeSocialUrl(value, maxLen = 500) {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return '';
  const clean = v.substring(0, maxLen);
  if (/^(https?:\/\/|wa\.me\/|@)/i.test(clean)) {
    if (isDangerousScheme(clean)) return undefined;
    return clean;
  }
  const stripped = clean.replace(/^[a-z]+:\/\/+/i, '');
  if (isDangerousScheme(clean) || isDangerousScheme(stripped)) return undefined;
  return stripped;
}

function isDangerousScheme(value) {
  return /^(javascript|data|vbscript|file):/i.test(String(value));
}

function sanitizeEmail(value) {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(v)) return null;
  return v.substring(0, 200);
}

router.get('/stats/summary', authMiddleware, async (req, res) => {
  const card = await cardRepo.findOneByUserId(req.userId);
  if (!card) {
    return res.json({ hasCard: false, card: null, stats: { views: 0, contacts: 0 } });
  }

  const contactList = await contactRepo.findByCardId(card.id);
  contactList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    hasCard: true,
    card,
    stats: {
      views: card.views_count || 0,
      contacts: contactList.length,
      recentContacts: contactList.slice(0, 5)
    }
  });
});

router.get('/', authMiddleware, async (req, res) => {
  const cardList = await cardRepo.findByUserId(req.userId);
  cardList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(cardList);
});

router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  // Check if user is PRO/Admin
  const user = await userRepo.findById(req.userId);
  const isPro = user && (user.plan === 'pro' || user.is_admin);

  if (!isPro) {
    return res.status(402).json({ error: 'subscription_required', message: 'Assinatura ativa do CardLink PRO necessária para salvar ou editar cartões' });
  }

  let productsToSave = req.body.products;
  let galleryToSave = req.body.gallery;
  let testimonialsToSave = req.body.testimonials;



  const existing = await cardRepo.findOneByUserId(req.userId);
  if (existing) {
    let slug = existing.slug;
    if (req.body.name && req.body.name !== existing.name) {
      slug = await generateUniqueSlug(req.body.name, existing.id);
    }

    const updated = await cardRepo.update(existing.id, {
      slug,
      name: (req.body.name || '').toString().substring(0, 100) || existing.name,
      business: req.body.business !== undefined ? sanitizeSocialUrl(req.body.business) : existing.business,
      title: req.body.title !== undefined ? sanitizeSocialUrl(req.body.title) : existing.title,
      photo_url: req.body.photo_url !== undefined ? sanitizeSocialUrl(req.body.photo_url) : existing.photo_url,
      logo_url: req.body.logo_url !== undefined ? sanitizeSocialUrl(req.body.logo_url) : existing.logo_url,
      description: req.body.description !== undefined ? String(req.body.description).substring(0, 3000) : existing.description,
      message: req.body.message !== undefined ? String(req.body.message).substring(0, 3000) : existing.message,
      phone: req.body.phone !== undefined ? String(req.body.phone).substring(0, 30) : existing.phone,
      email: req.body.email !== undefined ? sanitizeEmail(req.body.email) : existing.email,
      address: req.body.address !== undefined ? String(req.body.address).substring(0, 500) : existing.address,
      whatsapp: req.body.whatsapp !== undefined ? sanitizeSocialUrl(req.body.whatsapp, 100) : existing.whatsapp,
      whatsapp_group: req.body.whatsapp_group !== undefined ? sanitizeSocialUrl(req.body.whatsapp_group, 500) : existing.whatsapp_group,
      instagram: req.body.instagram !== undefined ? sanitizeSocialUrl(req.body.instagram) : existing.instagram,
      facebook: req.body.facebook !== undefined ? sanitizeSocialUrl(req.body.facebook) : existing.facebook,
      linkedin: req.body.linkedin !== undefined ? sanitizeSocialUrl(req.body.linkedin) : existing.linkedin,
      tiktok: req.body.tiktok !== undefined ? sanitizeSocialUrl(req.body.tiktok) : existing.tiktok,
      youtube: req.body.youtube !== undefined ? sanitizeSocialUrl(req.body.youtube) : existing.youtube,
      twitter: req.body.twitter !== undefined ? sanitizeSocialUrl(req.body.twitter) : existing.twitter,
      theme: req.body.theme || existing.theme,
      site_button_text: req.body.site_button_text !== undefined ? String(req.body.site_button_text).substring(0, 200) : existing.site_button_text,
      products: productsToSave !== undefined ? productsToSave : existing.products,
      gallery: galleryToSave !== undefined ? galleryToSave : existing.gallery,
      testimonials: testimonialsToSave !== undefined ? testimonialsToSave : existing.testimonials,
      updated_at: new Date().toISOString()
    });

    return res.json(updated);
  }

  const slug = await generateUniqueSlug(name);

  const card = await cardRepo.insert({
    user_id: req.userId,
    slug,
    name: String(name).substring(0, 100),
    business: sanitizeSocialUrl(req.body.business),
    title: sanitizeSocialUrl(req.body.title),
    photo_url: sanitizeSocialUrl(req.body.photo_url),
    logo_url: sanitizeSocialUrl(req.body.logo_url),
    description: req.body.description ? String(req.body.description).substring(0, 3000) : null,
    message: req.body.message ? String(req.body.message).substring(0, 3000) : null,
    phone: req.body.phone ? String(req.body.phone).substring(0, 30) : null,
    email: sanitizeEmail(req.body.email),
    address: req.body.address ? String(req.body.address).substring(0, 500) : null,
    whatsapp: sanitizeSocialUrl(req.body.whatsapp, 100),
    whatsapp_group: sanitizeSocialUrl(req.body.whatsapp_group, 500),
    instagram: sanitizeSocialUrl(req.body.instagram),
    facebook: sanitizeSocialUrl(req.body.facebook),
    linkedin: sanitizeSocialUrl(req.body.linkedin),
    tiktok: sanitizeSocialUrl(req.body.tiktok),
    youtube: sanitizeSocialUrl(req.body.youtube),
    twitter: sanitizeSocialUrl(req.body.twitter),
    theme: req.body.theme || 'midnight',
    site_button_text: req.body.site_button_text ? String(req.body.site_button_text).substring(0, 200) : null,
    products: productsToSave || [],
    gallery: galleryToSave || [],
    testimonials: testimonialsToSave || [],
    views_count: 0
  });

  res.status(201).json(card);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const card = await cardRepo.findByIdAndUser(id, req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }
  res.json(card);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const card = await cardRepo.findByIdAndUser(id, req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  let slug = card.slug;
  if (req.body.name && req.body.name !== card.name) {
    slug = await generateUniqueSlug(req.body.name, card.id);
  }

  const updated = await cardRepo.update(card.id, {
    slug,
    name: (req.body.name || '').toString().substring(0, 100) || card.name,
    business: req.body.business !== undefined ? sanitizeSocialUrl(req.body.business) : card.business,
    title: req.body.title !== undefined ? sanitizeSocialUrl(req.body.title) : card.title,
    photo_url: req.body.photo_url !== undefined ? sanitizeSocialUrl(req.body.photo_url) : card.photo_url,
    logo_url: req.body.logo_url !== undefined ? sanitizeSocialUrl(req.body.logo_url) : card.logo_url,
    description: req.body.description !== undefined ? String(req.body.description).substring(0, 3000) : card.description,
    message: req.body.message !== undefined ? String(req.body.message).substring(0, 3000) : card.message,
    phone: req.body.phone !== undefined ? String(req.body.phone).substring(0, 30) : card.phone,
    email: req.body.email !== undefined ? sanitizeEmail(req.body.email) : card.email,
    address: req.body.address !== undefined ? String(req.body.address).substring(0, 500) : card.address,
    whatsapp: req.body.whatsapp !== undefined ? sanitizeSocialUrl(req.body.whatsapp, 100) : card.whatsapp,
    whatsapp_group: req.body.whatsapp_group !== undefined ? sanitizeSocialUrl(req.body.whatsapp_group, 500) : card.whatsapp_group,
    instagram: req.body.instagram !== undefined ? sanitizeSocialUrl(req.body.instagram) : card.instagram,
    facebook: req.body.facebook !== undefined ? sanitizeSocialUrl(req.body.facebook) : card.facebook,
    linkedin: req.body.linkedin !== undefined ? sanitizeSocialUrl(req.body.linkedin) : card.linkedin,
    tiktok: req.body.tiktok !== undefined ? sanitizeSocialUrl(req.body.tiktok) : card.tiktok,
    youtube: req.body.youtube !== undefined ? sanitizeSocialUrl(req.body.youtube) : card.youtube,
    twitter: req.body.twitter !== undefined ? sanitizeSocialUrl(req.body.twitter) : card.twitter,
    theme: req.body.theme || card.theme,
    site_button_text: req.body.site_button_text !== undefined ? String(req.body.site_button_text).substring(0, 200) : card.site_button_text,
    products: req.body.products !== undefined ? req.body.products : card.products,
    gallery: req.body.gallery !== undefined ? req.body.gallery : card.gallery,
    testimonials: req.body.testimonials !== undefined ? req.body.testimonials : card.testimonials,
    updated_at: new Date().toISOString()
  });

  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const card = await cardRepo.findByIdAndUser(id, req.userId);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  await cardRepo.delete(card.id);
  res.json({ message: 'Cartão excluído com sucesso' });
});

module.exports = router;
