try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (e) {}

const bcrypt = require('bcryptjs');
const { users, cards, close } = require('../db/repository');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const password = String(process.argv[3] || '');
  const name = String(process.argv.slice(4).join(' ') || 'Administrador CardLink').trim().substring(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Uso: npm run admin:set -- email@exemplo.com [SenhaCom8+] ["Nome do administrador"]');
    process.exitCode = 2;
    return;
  }

  const allUsers = await users.all();
  let user = await users.findByEmail(email);
  const otherAdmin = allUsers.find(u => u.is_admin && (!user || u.id !== user.id));
  if (otherAdmin) {
    console.error(`Já existe um administrador (userId=${otherAdmin.id}). O CardLink permite apenas uma conta administrativa.`);
    process.exitCode = 4;
    return;
  }

  if (user) {
    const existingCard = await cards.findOneByUserId(user.id);
    if (existingCard) {
      console.error('Esta conta já possui um cartão. Use uma conta separada e exclusiva para administração.');
      process.exitCode = 5;
      return;
    }
    if (user.is_test_account || user.subscription_source === 'cakto') {
      console.error('Uma conta de cliente/teste não deve ser reaproveitada como administrador. Use um e-mail administrativo exclusivo.');
      process.exitCode = 6;
      return;
    }
    const updates = {
      is_admin: true,
      plan: 'none',
      account_status: 'active',
      subscription_status: 'none',
      subscription_source: 'none',
      subscription_plan: null,
      subscription_amount: null,
      subscription_reference: null,
      is_test_account: false,
      email_verified_at: user.email_verified_at || new Date().toISOString()
    };
    if (password) {
      if (password.length < 8) throw new Error('A senha administrativa deve ter pelo menos 8 caracteres.');
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    user = await users.update(user.id, updates);
  } else {
    if (password.length < 8) {
      console.error('Para criar o administrador, informe uma senha com pelo menos 8 caracteres.');
      process.exitCode = 3;
      return;
    }
    user = await users.insert({
      name,
      email,
      whatsapp: null,
      password_hash: await bcrypt.hash(password, 10),
      is_admin: true,
      plan: 'none',
      account_status: 'active',
      subscription_status: 'none',
      subscription_source: 'none',
      subscription_plan: null,
      subscription_amount: null,
      subscription_reference: null,
      is_test_account: false,
      email_verified_at: new Date().toISOString(),
      referred_by: null
    });
  }

  console.log(`Administrador exclusivo configurado: userId=${user.id}. Esta conta não possui assinatura nem cartão.`);
}

main()
  .catch(err => {
    console.error('Falha ao definir administrador:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await close(); } catch (e) {}
  });
