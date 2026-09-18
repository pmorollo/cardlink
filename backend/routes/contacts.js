const express = require('express');
const { cards: cardRepo, contacts: contactRepo, users: userRepo } = require('../db/repository');
const authMiddleware = require('../middleware/auth');
const { requireCustomer, requirePro } = require('../middleware/roles');
const { sendEmail } = require('../utils/email');
const { hasActiveCustomerAccess, isProCustomer } = require('../utils/subscription');

const router = express.Router();

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


router.get('/public/:slug', async (req, res) => {
  const card = await cardRepo.findBySlug(req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const owner = await userRepo.findById(card.user_id);
  if (!hasActiveCustomerAccess(owner)) {
    return res.status(402).json({ error: 'account_inactive', message: 'Página temporariamente indisponível' });
  }

  const isOwnerPro = isProCustomer(owner);
  await cardRepo.update(card.id, { views_count: (card.views_count || 0) + 1 });

  // Only expose fields needed for public display — never expose user_id or internals.
  // Free pages remain public, but premium content/capabilities are projected out.
  const { user_id, views_count, created_at, updated_at, ...publicCard } = card;
  if (!isOwnerPro) {
    publicCard.catalog_pdf_url = '';
    publicCard.catalog_pdf_title = '';
    publicCard.gallery = Array.isArray(publicCard.gallery) ? publicCard.gallery.slice(0, 4) : [];
    if (!['midnight', 'ocean', 'rose'].includes(publicCard.theme)) publicCard.theme = 'midnight';
  }
  publicCard.features = {
    contact_form: isOwnerPro,
    qr_tracking: isOwnerPro,
    catalog_pdf: isOwnerPro,
    gallery_limit: isOwnerPro ? 10 : 4
  };
  res.json(publicCard);
});

router.post('/public/:slug/contact', async (req, res) => {
  const card = await cardRepo.findBySlug(req.params.slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  // A página pública existe no Free, mas a captura de leads pelo formulário é exclusiva do Pro.
  const owner = await userRepo.findById(card.user_id);
  if (!hasActiveCustomerAccess(owner)) {
    return res.status(402).json({ error: 'account_inactive', message: 'Página temporariamente indisponível' });
  }
  if (!isProCustomer(owner)) {
    return res.status(403).json({ error: 'pro_required', message: 'O formulário de mensagens está disponível exclusivamente no Plano Pro.' });
  }

  // Honeypot anti-spam check
  if (req.body.website && req.body.website.trim() !== '') {
    // Return a silent 201 OK so the spambot thinks it succeeded
    return res.status(201).json({ message: 'Contato enviado com sucesso!' });
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

  // Envia e-mail de notificação para o proprietário do cartão (owner já carregado acima)
  if (owner && owner.email) {
    const safeOwnerName = escapeHtml(owner.name);
    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    sendEmail({
      to: owner.email,
      subject: '🎉 Novo contato recebido no CardLink!',
      text: `Olá, ${owner.name}! Você recebeu uma nova mensagem de ${name} (${phone || 'Sem telefone'} / ${email || 'Sem e-mail'}):\n\n"${message || 'Sem mensagem'}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7c3aed; margin-bottom: 10px;">🎉 Novo Contato Recebido!</h2>
          <p>Olá, <strong>${safeOwnerName}</strong>.</p>
          <p>Um visitante enviou uma mensagem através da sua página digital do CardLink:</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 15px 0;">
            <div style="margin-bottom: 8px;"><strong>Nome:</strong> ${safeName}</div>
            ${phone ? `<div style="margin-bottom: 8px;"><strong>Telefone:</strong> ${safePhone}</div>` : ''}
            ${email ? `<div style="margin-bottom: 8px;"><strong>E-mail:</strong> ${safeEmail}</div>` : ''}
            ${message ? `<div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;"><strong>Mensagem:</strong><br>${safeMessage}</div>` : ''}
          </div>
          
          <p style="font-size: 0.85rem; color: #64748b;">Acesse seu painel do CardLink para ver a lista de contatos e retornar diretamente via WhatsApp.</p>
        </div>
      `
    }).catch(err => console.error('Falha ao enviar e-mail de notificação de contato:', err.message));
  }

  res.status(201).json({ message: 'Contato enviado com sucesso!' });
});

router.get('/cards/:cardId/contacts', authMiddleware, requireCustomer, requirePro, async (req, res) => {
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
