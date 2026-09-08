try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (e) {}

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { users, close } = require('../db/repository');
const { createActivationToken, sendActivationEmail } = require('../utils/accountActivation');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const name = String(process.argv.slice(3).join(' ') || '').trim().substring(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    console.error('Uso: npm run test-user:create -- email@exemplo.com "Nome do usuário"');
    process.exitCode = 2;
    return;
  }

  const existing = await users.findByEmail(email);
  if (existing && existing.is_admin) {
    console.error('A conta administrativa não pode ser convertida em conta de teste.');
    process.exitCode = 3;
    return;
  }
  if (existing && !existing.is_test_account && existing.subscription_source === 'cakto') {
    console.error('Este e-mail pertence a uma conta comercial Cakto. Use outro e-mail para teste interno.');
    process.exitCode = 4;
    return;
  }

  const activation = createActivationToken();
  const fields = {
    name,
    email,
    password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
    is_admin: false,
    plan: 'pro',
    account_status: 'pending_activation',
    subscription_status: 'active',
    subscription_source: 'internal_test',
    subscription_plan: 'internal',
    subscription_amount: '0',
    subscription_reference: null,
    is_test_account: true,
    activation_token_hash: activation.tokenHash,
    activation_expires: activation.expiresAt,
    email_verified_at: null,
    pending_email: null,
    email_verification_token_hash: null,
    email_verification_expires: null,
    subscription_updated_at: new Date().toISOString()
  };

  const user = existing
    ? await users.update(existing.id, fields)
    : await users.insert({ ...fields, whatsapp: null, referred_by: null });

  await sendActivationEmail({ req: null, user, token: activation.token });

  console.log(`Conta interna de teste preparada: userId=${user.id}, email=${user.email}.`);
  console.log('Foi enviado um link para confirmar o e-mail e definir a senha. A conta não é contabilizada como venda Cakto.');
}

main()
  .catch(err => {
    console.error('Falha ao criar conta de teste:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await close(); } catch (e) {}
  });
