const crypto = require('crypto');
const { sendEmail } = require('./email');

function createActivationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return { token, tokenHash, expiresAt };
}

function hashActivationToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function resolvePublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const proto = (req && req.get && req.get('x-forwarded-proto')) || (req && req.protocol) || 'http';
  const host = (req && req.get && req.get('host')) || `localhost:${process.env.PORT || 3000}`;
  return `${String(proto).split(',')[0].trim()}://${host}`;
}

async function sendActivationEmail({ req, user, token }) {
  const baseUrl = resolvePublicBaseUrl(req);
  const activationUrl = `${baseUrl}/#activate?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
  const internalTest = !!user.is_test_account;
  const title = internalTest ? 'Convite para teste interno do CardLink' : 'Pagamento confirmado 🎉';
  const intro = internalTest
    ? 'Sua conta interna de teste do CardLink está pronta. Confirme este e-mail e defina sua senha para começar.'
    : 'Sua assinatura do CardLink foi confirmada. Agora falta apenas confirmar este e-mail e definir sua senha para acessar o painel.';
  await sendEmail({
    to: user.email,
    subject: internalTest ? 'Ative sua conta de teste CardLink' : 'Ative sua conta CardLink',
    text: `Olá, ${user.name}. ${intro} ${activationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827;">
        <h2 style="color:#7c3aed;">${title}</h2>
        <p>Olá, <strong>${escapeHtml(user.name)}</strong>.</p>
        <p>${intro}</p>
        <p style="margin:28px 0;"><a href="${activationUrl}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Confirmar e-mail e ativar conta</a></p>
        <p style="font-size:12px;color:#6b7280;">Este link é válido por 24 horas. Se expirar, entre em contato com o suporte CardLink.</p>
      </div>
    `
  });
  return activationUrl;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { createActivationToken, hashActivationToken, sendActivationEmail, resolvePublicBaseUrl };
