const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const existing = query('users').findOne(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = query('users').insert({ name, email, password_hash: passwordHash });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cardlink-fallback-secret', { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = query('users').findOne(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha incorretos' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cardlink-fallback-secret', { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
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
