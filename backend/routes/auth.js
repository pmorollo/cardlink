const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users } = require('../db/repository');
const authMiddleware = require('../middleware/auth');
const { JWT_SECRET, isAdminEmail } = require('../config');
const { sendEmail } = require('../utils/email');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Em produção o código de recuperação não é devolvido na resposta da API.
// Para testes em desenvolvimento (NODE_ENV !== 'production') ele ainda é retornado.
const isProduction = process.env.NODE_ENV === 'production';

router.post('/register', async (req, res) => {
  const { email, whatsapp, password, referred_by } = req.body;
  const name = (req.body.name || '').trim().substring(0, 100);
  const userEmail = (email || whatsapp || '').trim().toLowerCase().substring(0, 200);

  if (!name || !userEmail || !password) {
    return res.status(400).json({ error: 'Nome, E-mail e senha são obrigatórios' });
  }

  // Regex email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail) || userEmail.includes('..')) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }

  const existing = await users.findByLogin(userEmail);
  if (existing) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isOwner = isAdminEmail(userEmail);
  const user = await users.insert({ 
    name, 
    email: userEmail, 
    whatsapp: null, 
    password_hash: passwordHash,
    is_admin: isOwner,
    plan: isOwner ? 'pro' : 'free',
    referred_by: referred_by ? String(referred_by).substring(0, 100) : null
  });

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin || false, plan: user.plan || 'free' }
  });
});

router.post('/login', async (req, res) => {
  const { email, whatsapp, password } = req.body;
  const userEmail = (email || whatsapp || '').trim().toLowerCase().substring(0, 200);

  if (!userEmail || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const user = await users.findByLogin(userEmail);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  // Promote owner email (configurado em ADMIN_EMAILS) to admin at runtime on login
  const isOwner = isAdminEmail(userEmail);
  if (isOwner && !user.is_admin) {
    await users.update(user.id, { is_admin: true, plan: 'pro' });
    user.is_admin = true;
    user.plan = 'pro';
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email || user.whatsapp, is_admin: user.is_admin || false, plan: user.plan || 'free' }
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { password_hash, reset_code, reset_expires, ...safe } = user;
  res.json(safe);
});

// ─── Account ──────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const name = (req.body.name || '').trim().substring(0, 100);
  const email = (req.body.email || '').trim().toLowerCase().substring(0, 200);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email) || email.includes('..')) {
    return res.status(400).json({ error: 'Informe um nome e um e-mail válido' });
  }

  const duplicate = await users.findEmailExcluding(email, user.id);
  if (duplicate) return res.status(409).json({ error: 'Este e-mail já está cadastrado' });

  const updated = await users.update(user.id, { name, email });
  res.json({ id: updated.id, name: updated.name, email: updated.email });
});

router.put('/change-password', authMiddleware, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const currentPassword = req.body.currentPassword || '';
  const newPassword = req.body.newPassword || '';
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(400).json({ error: 'A senha atual está incorreta' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres' });
  }

  await users.update(user.id, { password_hash: await bcrypt.hash(newPassword, 10) });
  res.json({ message: 'Senha atualizada com sucesso' });
});

// ─── Password Reset ──────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const userEmail = (email || '').trim().toLowerCase();

  if (!userEmail) {
    return res.status(400).json({ error: 'Informe o seu e-mail' });
  }

  const user = await users.findByEmail(userEmail);
  // Não revela se o e-mail existe: resposta idêntica em ambos os casos
  const genericMessage = 'Se o e-mail estiver cadastrado, um código de recuperação foi gerado.';

  if (!user) {
    return res.json({ message: genericMessage });
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await users.update(user.id, {
    reset_code: code,
    reset_expires: expiresAt
  });

  // Envia e-mail de verdade (ou loga no console caso não configurado)
  await sendEmail({
    to: userEmail,
    subject: 'Código de Recuperação - CardLink',
    text: `Seu código de recuperação é: ${code}. Ele é válido por 15 minutos.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #7c3aed; margin-bottom: 10px;">Recuperação de Senha</h2>
        <p>Olá, <strong>${user.name}</strong>.</p>
        <p>Você solicitou a recuperação de senha no CardLink. Use o código abaixo para redefinir sua senha:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e293b; background: #f1f5f9; padding: 12px; border-radius: 6px; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748b;">Este código expira em 15 minutos. Se você não solicitou esta reconfiguração, ignore este e-mail.</p>
      </div>
    `
  }).catch(err => console.error('Falha ao enviar e-mail de recuperação:', err.message));

  const payload = { message: genericMessage };
  if (!isProduction) {
    payload.code = code;
    payload.message = 'Código de recuperação gerado com sucesso!';
  }
  return res.json(payload);
});

router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const userEmail = (email || '').trim().toLowerCase();

  if (!userEmail || !code || !newPassword) {
    return res.status(400).json({ error: 'E-mail, código e nova senha são obrigatórios' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
  }

  const user = await users.findByEmail(userEmail);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  if (!user.reset_code) {
    return res.status(400).json({ error: 'Nenhum código de recuperação foi solicitado' });
  }

  if (new Date() > new Date(user.reset_expires)) {
    return res.status(400).json({ error: 'Código de recuperação expirado. Gere um novo.' });
  }

  // Comparação em tempo constante para evitar timing attacks
  const a = Buffer.from(String(user.reset_code));
  const b = Buffer.from(String(code).trim());
  const codesMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!codesMatch) {
    return res.status(400).json({ error: 'Código de recuperação inválido' });
  }

  await users.update(user.id, {
    password_hash: await bcrypt.hash(newPassword, 10),
    reset_code: null,
    reset_expires: null
  });

  return res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
});

module.exports = router;