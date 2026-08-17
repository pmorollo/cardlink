const crypto = require('crypto');
const { sendEmail } = require('./email');
const { resolvePublicBaseUrl } = require('./accountActivation');

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return { token, tokenHash, expiresAt };
}

function hashEmailVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmailChangeVerification({ req, user, newEmail, token }) {
  const baseUrl = resolvePublicBaseUrl(req);
  const verificationUrl = `${baseUrl}/#verify-email?email=${encodeURIComponent(newEmail)}&token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: newEmail,
    subject: 'Confirme seu novo e-mail - CardLink',
    text: `Olá, ${user.name}. Confirme que este e-mail pertence a você para concluir a alteração da sua conta CardLink: ${verificationUrl}. O link é válido por 60 minutos.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827;">
        <h2 style="color:#7c3aed;">Confirme seu novo e-mail</h2>
        <p>Olá, <strong>${escapeHtml(user.name)}</strong>.</p>
        <p>Foi solicitada a troca do e-mail da sua conta CardLink para este endereço.</p>
        <p style="margin:28px 0;"><a href="${verificationUrl}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">Confirmar novo e-mail</a></p>
        <p style="font-size:12px;color:#6b7280;">O link é válido por 60 minutos. O e-mail atual da conta só será substituído depois desta confirmação.</p>
      </div>
    `
  });
  return verificationUrl;
}

async function sendEmailChangeAlert({ user, requestedEmail, completed = false }) {
  if (!user.email) return;
  const subject = completed ? 'E-mail da sua conta CardLink foi alterado' : 'Solicitação de alteração de e-mail - CardLink';
  const action = completed
    ? `O e-mail de acesso da sua conta CardLink foi alterado para ${requestedEmail}.`
    : `Foi solicitada a alteração do e-mail da sua conta CardLink para ${requestedEmail}. O endereço atual continuará válido até a confirmação do novo e-mail.`;
  await sendEmail({
    to: user.email,
    subject,
    text: `${action} Se você não reconhece esta ação, entre em contato com o suporte CardLink.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827;">
        <h2 style="color:#7c3aed;">Segurança da conta CardLink</h2>
        <p>Olá, <strong>${escapeHtml(user.name)}</strong>.</p>
        <p>${escapeHtml(action)}</p>
        <p style="font-size:12px;color:#6b7280;">Se você não reconhece esta ação, entre em contato com o suporte CardLink.</p>
      </div>
    `
  });
}

module.exports = {
  createEmailVerificationToken,
  hashEmailVerificationToken,
  sendEmailChangeVerification,
  sendEmailChangeAlert
};
