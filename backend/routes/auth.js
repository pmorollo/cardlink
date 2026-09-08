const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users } = require('../db/repository');
const authMiddleware = require('../middleware/auth');
const { JWT_SECRET } = require('../config');
const { sendEmail } = require('../utils/email');
const { hasActiveCustomerAccess } = require('../utils/subscription');
const { hashActivationToken } = require('../utils/accountActivation');
const {
  createEmailVerificationToken, hashEmailVerificationToken, sendEmailChangeVerification, sendEmailChangeAlert
} = require('../utils/emailVerification');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Em produção o código de recuperação não é devolvido na resposta da API.
// Para testes em desenvolvimento (NODE_ENV !== 'production') ele ainda é retornado.
const isProduction = process.env.NODE_ENV === 'production';

router.post('/register', async (req, res) => {
  // O CardLink não oferece cadastro público gratuito.
  // A conta de cliente é criada após confirmação de pagamento pela Cakto
  // ou por ferramenta administrativa de teste interno.
  return res.status(410).json({
    error: 'public_registration_disabled',
    message: 'A conta CardLink é criada após a confirmação da assinatura. Escolha um plano na página inicial.'
  });
});

router.post('/activate', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const token = String(req.body.token || '').trim();
  const password = String(req.body.password || '');

  if (!email || !token || !password) {
    return res.status(400).json({ error: 'E-mail, token de ativação e senha são obrigatórios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' });
  }

  const user = await users.findByEmail(email);
  if (!user || user.is_admin) {
    return res.status(400).json({ error: 'Link de ativação inválido ou expirado' });
  }
  if (user.account_status !== 'pending_activation' || !user.activation_token_hash || !user.activation_expires) {
    return res.status(400).json({ error: 'Esta conta não possui uma ativação pendente' });
  }
  if (new Date() > new Date(user.activation_expires)) {
    return res.status(400).json({ error: 'Link de ativação expirado. Entre em contato com o suporte CardLink.' });
  }

  const providedHash = hashActivationToken(token);
  const expected = Buffer.from(String(user.activation_token_hash), 'hex');
  const provided = Buffer.from(providedHash, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(400).json({ error: 'Link de ativação inválido ou expirado' });
  }

  const updated = await users.update(user.id, {
    password_hash: await bcrypt.hash(password, 10),
    account_status: 'active',
    email_verified_at: new Date().toISOString(),
    activation_token_hash: null,
    activation_expires: null
  });

  if (!hasActiveCustomerAccess(updated)) {
    return res.status(403).json({ error: 'subscription_inactive', message: 'A assinatura desta conta não está ativa.' });
  }

  const signed = signToken(updated.id);
  return res.json({
    token: signed,
    user: {
      id: updated.id, name: updated.name, email: updated.email, is_admin: false, plan: updated.plan,
      account_status: updated.account_status, subscription_status: updated.subscription_status,
      subscription_source: updated.subscription_source, is_test_account: updated.is_test_account, email_verified_at: updated.email_verified_at
    }
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

  if (!user.is_admin && user.account_status === 'pending_activation') {
    return res.status(403).json({ error: 'account_activation_required', message: 'Conclua a ativação enviada para o seu e-mail.' });
  }
  if (!user.is_admin && !user.email_verified_at) {
    return res.status(403).json({ error: 'email_verification_required', message: 'O e-mail desta conta ainda não foi confirmado.' });
  }
  if (!user.is_admin && !hasActiveCustomerAccess(user)) {
    return res.status(403).json({ error: 'subscription_inactive', message: 'Sua assinatura CardLink não está ativa.' });
  }

  // Login apenas respeita os privilégios já persistidos no banco.
  // Nunca promove uma conta com base apenas no endereço de e-mail.

  const token = signToken(user.id);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email || user.whatsapp, is_admin: user.is_admin || false, plan: user.plan, account_status: user.account_status, subscription_status: user.subscription_status, subscription_source: user.subscription_source, is_test_account: user.is_test_account || false, email_verified_at: user.email_verified_at }
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const { password_hash, reset_code, reset_expires, activation_token_hash, activation_expires, email_verification_token_hash, email_verification_expires, ...safe } = user;
  res.json(safe);
});

// ─── Account ──────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const name = (req.body.name || '').trim().substring(0, 100);
  const email = (req.body.email || '').trim().toLowerCase().substring(0, 200);
  const currentPassword = String(req.body.currentPassword || '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email) || email.includes('..')) {
    return res.status(400).json({ error: 'Informe um nome e um e-mail válido' });
  }

  const currentEmail = String(user.email || '').toLowerCase();
  if (email === currentEmail) {
    const updated = await users.update(user.id, { name });
    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      email_verified_at: updated.email_verified_at,
      pending_email: updated.pending_email || null,
      message: 'Dados da conta atualizados.'
    });
  }

  // Alterar o identificador de login é uma ação sensível: exige a senha atual
  // e só entra em vigor depois que o novo endereço comprovar sua posse.
  if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(400).json({ error: 'Informe a senha atual correta para alterar o e-mail' });
  }

  const duplicate = await users.findEmailExcluding(email, user.id);
  if (duplicate) return res.status(409).json({ error: 'Este e-mail já está cadastrado ou aguardando confirmação' });

  const verification = createEmailVerificationToken();
  const updated = await users.update(user.id, {
    name,
    pending_email: email,
    email_verification_token_hash: verification.tokenHash,
    email_verification_expires: verification.expiresAt
  });

  try {
    await sendEmailChangeVerification({ req, user: updated, newEmail: email, token: verification.token });
    await sendEmailChangeAlert({ user, requestedEmail: email }).catch(err => {
      console.error('Falha ao avisar e-mail atual sobre solicitação de troca:', err.message);
    });
  } catch (err) {
    await users.update(user.id, {
      pending_email: null,
      email_verification_token_hash: null,
      email_verification_expires: null
    });
    console.error('Falha ao enviar confirmação para novo e-mail:', err.message);
    return res.status(503).json({ error: 'Não foi possível enviar a confirmação para o novo e-mail. Tente novamente.' });
  }

  const response = {
    id: updated.id,
    name: updated.name,
    email: user.email,
    email_verified_at: user.email_verified_at,
    pending_email: email,
    message: 'Enviamos um link de confirmação para o novo e-mail. O endereço atual continua válido até a confirmação.'
  };
  if (!isProduction) response.verification_token = verification.token;
  return res.json(response);
});

router.post('/confirm-email-change', async (req, res) => {
  const newEmail = String(req.body.email || '').trim().toLowerCase().substring(0, 200);
  const token = String(req.body.token || '').trim();
  if (!newEmail || !token) {
    return res.status(400).json({ error: 'Link de confirmação inválido ou incompleto' });
  }

  const user = await users.findByPendingEmail(newEmail);
  if (!user || !user.email_verification_token_hash || !user.email_verification_expires) {
    return res.status(400).json({ error: 'Link de confirmação inválido ou expirado' });
  }
  if (new Date() > new Date(user.email_verification_expires)) {
    return res.status(400).json({ error: 'Link de confirmação expirado. Solicite novamente a alteração do e-mail.' });
  }

  const providedHash = hashEmailVerificationToken(token);
  const expected = Buffer.from(String(user.email_verification_token_hash), 'hex');
  const provided = Buffer.from(providedHash, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(400).json({ error: 'Link de confirmação inválido ou expirado' });
  }

  const duplicate = await users.findEmailExcluding(newEmail, user.id);
  if (duplicate) {
    return res.status(409).json({ error: 'Este e-mail não está mais disponível para uso' });
  }

  const oldEmail = user.email;
  const updated = await users.update(user.id, {
    email: newEmail,
    email_verified_at: new Date().toISOString(),
    pending_email: null,
    email_verification_token_hash: null,
    email_verification_expires: null,
    reset_code: null,
    reset_expires: null
  });

  await sendEmailChangeAlert({ user: { ...user, email: oldEmail }, requestedEmail: newEmail, completed: true }).catch(err => {
    console.error('Falha ao avisar e-mail anterior sobre conclusão da troca:', err.message);
  });

  return res.json({ message: 'Novo e-mail confirmado com sucesso.', email: updated.email });
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

  if (!user || (!user.is_admin && !user.email_verified_at)) {
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
