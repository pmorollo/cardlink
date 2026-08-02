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
    user: { id: user.id, name: user.name, email: user.email }
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
    user: { id: user.id, name: user.name, email: user.email || user.whatsapp }
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

module.exports = router;
