const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const slugify = require('slugify');
const { users, cards: cardRepo } = require('../db/repository');
const { SESSION_COOKIE } = require('../middleware/auth');
const { JWT_SECRET } = require('../config');
const { getTemplateByKey } = require('../utils/template-catalog');

const router = express.Router();

// Porta de entrada única do CardLink: nome, e-mail, nome do negócio,
// descrição do negócio e template — um único SALVAR cria a conta E o
// primeiro cartão juntos. Sem senha, sem código de confirmação por e-mail:
// a conta já nasce logada (ver signToken abaixo). Mesmo quem vai assinar o
// Pro entra por aqui — a conversão acontece depois, com a conta já criada
// (ver backend/routes/payments.js, que faz o upgrade via webhook da Cakto
// pelo e-mail já cadastrado).
function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

const quickCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 20,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
  standardHeaders: true,
  legacyHeaders: false
});

async function generateUniqueSlug(name, excludeId = null) {
  let base = slugify(name, { lower: true, strict: true }) || 'cartao';
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await cardRepo.findBySlugExcluding(slug, excludeId);
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

function sanitizeSocialUrl(value, maxLen = 500) {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return '';
  return v.substring(0, maxLen);
}

router.post('/criar-cartao', quickCreateLimiter, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().substring(0, 100);
    const email = String(req.body.email || '').trim().toLowerCase();
    const businessName = String(req.body.business_name || '').trim().substring(0, 100);
    const businessDescription = String(req.body.business_description || '').trim().substring(0, 3000);
    const templateKey = String(req.body.template_key || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Informe seu nome' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.includes('..')) {
      return res.status(400).json({ error: 'Informe um e-mail válido' });
    }
    if (!businessName) {
      return res.status(400).json({ error: 'Informe o nome do seu negócio' });
    }

    const existing = await users.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'email_already_registered',
        message: 'Este e-mail já tem uma conta CardLink. Entre na sua conta para continuar.'
      });
    }

    const template = templateKey ? getTemplateByKey(templateKey) : null;

    const now = new Date().toISOString();
    const user = await users.insert({
      name,
      email,
      whatsapp: null,
      // Conta nasce sem senha definida pelo usuário (ninguém digitou uma
      // neste fluxo). Um hash aleatório e intransponível ocupa o campo —
      // a sessão atual já fica autenticada pelo cookie/token abaixo, e a
      // pessoa pode definir uma senha própria depois, em Configurações.
      password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      is_admin: false,
      plan: 'free',
      account_status: 'active',
      subscription_status: 'active',
      subscription_source: 'free_tier',
      subscription_plan: 'free',
      trial_ends_at: null,
      email_verified_at: now,
      subscription_updated_at: now
    });

    const slug = await generateUniqueSlug(businessName);
    const card = await cardRepo.insert({
      user_id: user.id,
      slug,
      name: businessName,
      business: sanitizeSocialUrl(businessName),
      business_complement: null,
      title: null,
      photo_url: null,
      logo_url: null,
      description: businessDescription || null,
      message: null,
      phone: null,
      email: null,
      address: null,
      whatsapp: null,
      whatsapp_group: null,
      instagram: null,
      facebook: null,
      linkedin: null,
      tiktok: null,
      youtube: null,
      twitter: null,
      theme: template?.theme_key || 'institucional',
      template_key: template?.template_key || null,
      site_button_text: null,
      services_mode: 'image',
      services_title: '',
      services_image_url: '',
      catalog_pdf_url: '',
      catalog_pdf_title: '',
      products: [],
      gallery: [],
      testimonials: [],
      views_count: 0,
      qr_scans_count: 0
    });

    const token = signToken(user.id);
    setSessionCookie(res, token);

    return res.status(201).json({
      message: 'Conta e site criados com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: false,
        plan: user.plan,
        account_status: user.account_status,
        subscription_status: user.subscription_status,
        subscription_source: user.subscription_source,
        subscription_plan: user.subscription_plan,
        email_verified_at: user.email_verified_at
      },
      card,
      site_url: `${req.protocol}://${req.get('host')}/site/${card.slug}`
    });
  } catch (err) {
    console.error('Erro ao criar conta e cartão (fluxo rápido):', err);
    return res.status(500).json({ error: 'Erro interno ao criar seu site. Tente novamente.' });
  }
});

module.exports = router;
