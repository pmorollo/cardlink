const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const SESSION_COOKIE = 'cardlink_session';

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const prefix = `${name}=`;
  for (const part of raw.split(';')) {
    const item = part.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return '';
}

function authMiddleware(req, res, next) {
  const header = String(req.headers.authorization || '');
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = bearerToken || readCookie(req, SESSION_COOKIE);
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = authMiddleware;
module.exports.SESSION_COOKIE = SESSION_COOKIE;
