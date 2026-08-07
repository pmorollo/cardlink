const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, whatsapp, password } = req.body;
  const name = (req.body.name || '').trim().substring(0, 100);
  const userEmail = (email || whatsapp || '').trim().toLowerCase().substring(0, 200);

  if (!name || !userEmail || !password) {
    return res.status(400).json({ error: 'Nome, E-mail e senha são obrigatórios' });
  }

  // Basic email format check
  if (!userEmail.includes('@') || userEmail.length < 5) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }

  const existing = query('users').findOne(u => (u.email && u.email.toLowerCase() === userEmail) || u.whatsapp === userEmail);
  if (existing) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = query('users').insert({ name, email: userEmail, whatsapp: userEmail, password_hash: passwordHash });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cardlink-fallback-secret', { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin || false, plan: user.plan || 'free' }
  });
});

router.post('/login', (req, res) => {
  const { email, whatsapp, password } = req.body;
  const userEmail = (email || whatsapp || '').trim().toLowerCase().substring(0, 200);

  if (!userEmail || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const user = query('users').findOne(u => (u.email && u.email.toLowerCase() === userEmail) || u.whatsapp === userEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cardlink-fallback-secret', { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email || user.whatsapp, is_admin: user.is_admin || false, plan: user.plan || 'free' }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = query('users').findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { password_hash, ...safe } = user;
  res.json(safe);
});

// ─── Password Reset ──────────────────────────────────────────────────
router.put('/profile', authMiddleware, (req, res) => {
  const user = query('users').findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const name = (req.body.name || '').trim().substring(0, 100);
  const email = (req.body.email || '').trim().toLowerCase().substring(0, 200);
  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Informe um nome e um e-mail válido' });
  }

  const duplicate = query('users').findOne(u => u.id !== user.id && u.email && u.email.toLowerCase() === email);
  if (duplicate) return res.status(409).json({ error: 'Este e-mail já está cadastrado' });

  const updated = query('users').update(user.id, { name, email });
  res.json({ id: updated.id, name: updated.name, email: updated.email });
});

router.put('/change-password', authMiddleware, (req, res) => {
  const user = query('users').findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const currentPassword = req.body.currentPassword || '';
  const newPassword = req.body.newPassword || '';
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'A senha atual está incorreta' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres' });
  }

  query('users').update(user.id, { password_hash: bcrypt.hashSync(newPassword, 10) });
  res.json({ message: 'Senha atualizada com sucesso' });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const userEmail = (email || '').trim().toLowerCase();

  if (!userEmail) {
    return res.status(400).json({ error: 'Informe o seu e-mail' });
  }

  const user = query('users').findOne(u => u.email && u.email.toLowerCase() === userEmail);
  if (!user) {
    return res.status(404).json({ error: 'E-mail não encontrado na nossa base de dados' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  query('users').update(user.id, {
    reset_code: code,
    reset_expires: expiresAt
  });

  return res.json({
    message: 'Código de recuperação gerado com sucesso!',
    code
  });
});

router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  const userEmail = (email || '').trim().toLowerCase();

  if (!userEmail || !code || !newPassword) {
    return res.status(400).json({ error: 'E-mail, código e nova senha são obrigatórios' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
  }

  const user = query('users').findOne(u => u.email && u.email.toLowerCase() === userEmail);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  if (!user.reset_code || user.reset_code !== code.trim()) {
    return res.status(400).json({ error: 'Código de recuperação inválido' });
  }

  if (new Date() > new Date(user.reset_expires)) {
    return res.status(400).json({ error: 'Código de recuperação expirado. Gere um novo.' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  query('users').update(user.id, {
    password_hash: passwordHash,
    reset_code: null,
    reset_expires: null
  });

  return res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
});

module.exports = router;
