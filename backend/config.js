// Configurações centralizadas de segurança.
// Em produção, JWT_SECRET e ADMIN_EMAILS DEVEM estar definidos no ambiente.

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized);
}

module.exports = { JWT_SECRET, ADMIN_EMAILS, isAdminEmail };