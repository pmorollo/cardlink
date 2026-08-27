process.env.NODE_ENV = 'test';
process.env.CAKTO_SECRET = 'test-cakto-secret-123';
process.env.DATABASE_URL = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.NVIDIA_API_KEY = '';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = require('../server');
const { db } = require('../db/database');
const { users } = require('../db/repository');

const DATA_FILE = path.join(__dirname, '..', 'db', 'data.json');
let server;
let base;
let backup;

function snapshotDb() {
  db.users = [];
  db.cards = [];
  db.contacts = [];
  db.support_tickets = [];
  db.admin_messages = [];
  db._counters = { users: 0, cards: 0, contacts: 0, support_tickets: 0, admin_messages: 0 };
}

test.before(async () => {
  backup = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf-8') : '';
  await new Promise(resolve => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(snapshotDb);

test.after(() => {
  server && server.close();
  if (backup === '') fs.rmSync(DATA_FILE, { force: true });
  else fs.writeFileSync(DATA_FILE, backup, 'utf-8');
});

async function api(method, urlPath, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data, raw: res };
}

async function createActiveUser({
  email = 'test@example.com',
  name = 'Usuário Teste',
  password = 'SenhaValida123!',
  source = 'internal_test',
  isTest = true,
  plan = 'internal'
} = {}) {
  return users.insert({
    name,
    email,
    whatsapp: null,
    password_hash: await bcrypt.hash(password, 10),
    is_admin: false,
    plan: 'pro',
    account_status: 'active',
    subscription_status: 'active',
    subscription_source: source,
    subscription_plan: plan,
    subscription_amount: isTest ? '0' : '12.90',
    subscription_reference: null,
    is_test_account: isTest,
    referred_by: null,
    email_verified_at: new Date().toISOString(),
    subscription_updated_at: new Date().toISOString()
  });
}

async function createAdmin({
  email = 'admin@example.com',
  name = 'Administrador',
  password = 'SenhaAdmin123!'
} = {}) {
  return users.insert({
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

async function login(email, password) {
  return api('POST', '/api/auth/login', { email, password });
}

async function payAndActivate(email, name = 'Cliente Cakto', password = 'SenhaCliente123!') {
  const hook = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: {
      customerEmail: email,
      customerName: name,
      metadata: { plan: 'monthly' },
      amount: '12.90',
      purchaseId: 'purchase-test-1'
    }
  });
  assert.equal(hook.status, 200);
  assert.equal(hook.data.success, true);
  assert.equal(hook.data.account_status, 'pending_activation');
  assert.ok(hook.data.activation_token);

  const activation = await api('POST', '/api/auth/activate', {
    email,
    token: hook.data.activation_token,
    password
  });
  assert.equal(activation.status, 200);
  return { hook, activation, token: activation.data.token };
}

test('GET / serve o frontend (SPA)', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<html/i);
});

test('frontend mantem a IA somente como assistente textual para copia manual', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'index.html'), 'utf-8');
  const js = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'app.js'), 'utf-8');
  assert.equal(html.includes('id="ai-request"'), true);
  assert.equal(html.includes('id="ai-response"'), true);
  assert.equal(html.includes('Copiar texto'), true);
  assert.equal(html.includes('id="ai-skill"'), false);
  assert.equal(js.includes('improveFieldWithAI'), false);
  assert.equal(js.includes('reviewAiSuggestion'), false);
});

test('/backend/.env NAO expoe segredos', async () => {
  const res = await fetch(base + '/backend/.env');
  const html = await res.text();
  assert.equal(html.includes('JWT_SECRET'), false);
  assert.equal(html.includes('DATABASE_URL'), false);
  assert.equal(html.includes('NVIDIA_API_KEY'), false);
});

test('CORS rejeita origem nao permitida', async () => {
  const res = await fetch(base + '/api/cards/stats/summary', {
    headers: { Origin: 'https://evil.example.com' }
  });
  const acao = res.headers.get('access-control-allow-origin');
  assert.ok(!acao || res.status >= 400);
});

test('cadastro publico fica desativado: conta nasce da assinatura', async () => {
  const r = await api('POST', '/api/auth/register', {
    name: 'Sem Assinatura',
    email: 'naopago@example.com',
    password: 'SenhaValida123!'
  });
  assert.equal(r.status, 410);
  assert.equal(r.data.error, 'public_registration_disabled');
  assert.equal(db.users.length, 0);
});

test('/api/diag foi removido', async () => {
  const r = await api('GET', '/api/diag');
  assert.equal(r.status, 404);
  assert.equal(r.data.error, 'Endpoint não encontrado');
});

test('subscription_created sozinho nao libera conta antes do pagamento aprovado', async () => {
  const email = 'assinatura-sem-pagamento@example.com';
  const hook = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'subscription_created',
    status: 'approved',
    data: {
      customerEmail: email,
      customerName: 'Assinatura sem pagamento',
      metadata: { plan: 'monthly' },
      amount: '12.90'
    }
  });

  assert.equal(hook.status, 200);
  assert.equal(hook.data.received, true);
  assert.equal(hook.data.event, 'subscription_created');
  assert.equal(await users.findByEmail(email), null);
});

test('conta administrativa e exclusiva da plataforma e nao usa recursos de cliente', async () => {
  await createAdmin({ email: 'admin-exclusive@example.com' });
  const rLogin = await login('admin-exclusive@example.com', 'SenhaAdmin123!');
  assert.equal(rLogin.status, 200);
  assert.equal(rLogin.data.user.is_admin, true);
  assert.equal(rLogin.data.user.plan, 'none');

  const token = rLogin.data.token;
  assert.equal((await api('GET', '/api/cards/stats/summary', null, token)).status, 403);
  assert.equal((await api('POST', '/api/cards', { name: 'Cartão indevido' }, token)).status, 403);
  assert.equal((await api('POST', '/api/ai/generate', { profession: 'Admin' }, token)).status, 403);
  assert.equal((await api('POST', '/api/support', { message: 'Chamado indevido' }, token)).status, 403);

  const hook = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: { customerEmail: 'admin-exclusive@example.com' }
  });
  assert.equal(hook.status, 200);
  assert.equal(hook.data.ignored, 'administrative_account');

  const stats = await api('GET', '/api/admin/stats', null, token);
  assert.equal(stats.status, 200);
  assert.equal(stats.data.totalUsers, 0);
});

test('pagamento Cakto cria conta pendente; ativacao define senha e libera acesso', async () => {
  const email = 'cliente-cakto@example.com';
  const hook = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: {
      customerEmail: email,
      customerName: 'Cliente Cakto',
      metadata: { plan: 'monthly' },
      amount: '12.90'
    }
  });

  assert.equal(hook.status, 200);
  assert.equal(hook.data.account_status, 'pending_activation');
  assert.equal(hook.data.activation_sent, true);
  assert.ok(hook.data.activation_token);

  const pending = await users.findByEmail(email);
  assert.equal(pending.plan, 'pro');
  assert.equal(pending.subscription_source, 'cakto');
  assert.equal(pending.subscription_status, 'active');
  assert.equal(pending.account_status, 'pending_activation');
  assert.equal(pending.is_test_account, false);

  const beforeActivation = await login(email, 'qualquerSenha123!');
  assert.notEqual(beforeActivation.status, 200);

  const activate = await api('POST', '/api/auth/activate', {
    email,
    token: hook.data.activation_token,
    password: 'MinhaSenha123!'
  });
  assert.equal(activate.status, 200);
  assert.ok(activate.data.token);
  assert.equal(activate.data.user.account_status, 'active');
  assert.ok(activate.data.user.email_verified_at);

  const afterActivation = await login(email, 'MinhaSenha123!');
  assert.equal(afterActivation.status, 200);
  assert.equal(afterActivation.data.user.subscription_status, 'active');
});


test('nova compra reabre ativacao se cliente cancelou antes de definir senha', async () => {
  const email = 'reativacao-pendente@example.com';

  const first = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: {
      customerEmail: email,
      customerName: 'Cliente Reativado',
      metadata: { plan: 'monthly' },
      amount: '12.90',
      purchaseId: 'purchase-before-cancel'
    }
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.account_status, 'pending_activation');

  const canceled = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'subscription_canceled',
    data: { customerEmail: email }
  });
  assert.equal(canceled.status, 200);

  const second = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: {
      customerEmail: email,
      customerName: 'Cliente Reativado',
      metadata: { plan: 'monthly' },
      amount: '12.90',
      purchaseId: 'purchase-after-cancel'
    }
  });

  assert.equal(second.status, 200);
  assert.equal(second.data.account_status, 'pending_activation');
  assert.equal(second.data.activation_sent, true);
  assert.ok(second.data.activation_token);

  const activate = await api('POST', '/api/auth/activate', {
    email,
    token: second.data.activation_token,
    password: 'NovaSenha123!'
  });
  assert.equal(activate.status, 200);
});

test('webhook da Cakto rejeita secret invalido', async () => {
  const r = await api('POST', '/api/payments/cakto-webhook', {
    secret: 'secret-errado',
    event: 'purchase_approved',
    data: { customerEmail: 'qualquer@example.com' }
  });
  assert.equal(r.status, 401);
});

test('conta interna de teste tem recursos completos mas webhook Cakto nao a converte em venda', async () => {
  await createActiveUser({ email: 'equipe@example.com', name: 'Equipe Teste' });
  const rLogin = await login('equipe@example.com', 'SenhaValida123!');
  assert.equal(rLogin.status, 200);
  assert.equal(rLogin.data.user.is_test_account, true);
  assert.equal(rLogin.data.user.subscription_source, 'internal_test');

  const token = rLogin.data.token;
  const card = await api('POST', '/api/cards', {
    name: 'Card Equipe',
    services_mode: 'image',
    services_title: 'Cardápio',
    services_image_url: '/uploads/menu.webp'
  }, token);
  assert.equal(card.status, 201);

  const ai = await api('POST', '/api/ai/generate', { request: 'Crie uma apresentação para uma barbearia.' }, token);
  assert.equal(ai.status, 503);
  assert.match(ai.data.error, /preservada/i);

  const hook = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'purchase_approved',
    data: { customerEmail: 'equipe@example.com' }
  });
  assert.equal(hook.status, 200);
  assert.equal(hook.data.ignored, 'internal_test_account');

  const publicCard = await api('GET', `/api/public/${card.data.slug}`);
  assert.equal(publicCard.status, 200);
});

test('assistente valida entradas e preserva o texto quando a IA externa esta indisponivel', async () => {
  await createActiveUser({ email: 'ia-segura@example.com', name: 'Teste IA Segura' });
  const loginResult = await login('ia-segura@example.com', 'SenhaValida123!');
  const token = loginResult.data.token;

  const tooLong = await api('POST', '/api/ai/generate', {
    request: 'A'.repeat(2501)
  }, token);
  assert.equal(tooLong.status, 400);

  const empty = await api('POST', '/api/ai/generate', { request: '   ' }, token);
  assert.equal(empty.status, 400);

  const unavailable = await api('POST', '/api/ai/generate', {
    request: 'Melhore este texto: Meu texto original.'
  }, token);
  assert.equal(unavailable.status, 503);
  assert.equal(Object.hasOwn(unavailable.data, 'text'), false);
  assert.match(unavailable.data.error, /preservada/i);
});

test('assistente devolve somente texto separado quando o provedor responde', async () => {
  await createActiveUser({ email: 'ia-provider@example.com', name: 'Teste Provedor IA' });
  const loginResult = await login('ia-provider@example.com', 'SenhaValida123!');
  const token = loginResult.data.token;
  const originalFetch = global.fetch;
  let providerPayload = null;
  process.env.NVIDIA_API_KEY = 'test-provider-key';
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://integrate.api.nvidia.com/')) {
      providerPayload = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Texto alternativo para a apresentação da barbearia.' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(url, options);
  };

  try {
    const generated = await api('POST', '/api/ai/generate', {
      request: 'Escreva uma apresentação curta para minha barbearia.'
    }, token);
    assert.equal(generated.status, 200);
    assert.equal(generated.data.ai_meta.source, 'nvidia');
    assert.equal(generated.data.text, 'Texto alternativo para a apresentação da barbearia.');
    assert.deepEqual(Object.keys(generated.data).sort(), ['ai_meta', 'text']);
    assert.equal(providerPayload.messages.length, 2);
    assert.equal(providerPayload.messages[0].role, 'system');
    assert.equal(providerPayload.messages[1].role, 'user');
    assert.equal(providerPayload.messages[1].content, 'Escreva uma apresentação curta para minha barbearia.');
    assert.equal(providerPayload.messages[0].content.includes(providerPayload.messages[1].content), false);
  } finally {
    global.fetch = originalFetch;
    process.env.NVIDIA_API_KEY = '';
  }
});

test('cancelamento Cakto suspende cartao e corta APIs mesmo com token antigo', async () => {
  const email = 'cancelado@example.com';
  const { token } = await payAndActivate(email, 'Cliente Cancelado');

  const card = await api('POST', '/api/cards', { name: 'Card Cancelado' }, token);
  assert.equal(card.status, 201);

  const cancel = await api('POST', '/api/payments/cakto-webhook', {
    secret: process.env.CAKTO_SECRET,
    event: 'subscription_canceled',
    data: { customerEmail: email }
  });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.plan, 'inactive');

  const oldTokenAccess = await api('GET', '/api/cards/stats/summary', null, token);
  assert.equal(oldTokenAccess.status, 402);

  const publicAfterCancel = await api('GET', `/api/public/${card.data.slug}`);
  assert.equal(publicAfterCancel.status, 402);

  const relogin = await login(email, 'SenhaCliente123!');
  assert.equal(relogin.status, 403);
});

test('conta ativa sem e-mail confirmado nao consegue fazer login', async () => {
  const email = 'nao-verificado@example.com';
  await users.insert({
    name: 'Não Verificado',
    email,
    whatsapp: null,
    password_hash: await bcrypt.hash('SenhaValida123!', 10),
    is_admin: false,
    plan: 'pro',
    account_status: 'active',
    subscription_status: 'active',
    subscription_source: 'internal_test',
    subscription_plan: 'internal',
    subscription_amount: '0',
    is_test_account: true,
    email_verified_at: null,
    referred_by: null
  });

  const r = await login(email, 'SenhaValida123!');
  assert.equal(r.status, 403);
  assert.equal(r.data.error, 'email_verification_required');
});

test('troca de e-mail exige senha e confirmacao do novo endereco', async () => {
  const oldEmail = 'email-atual@example.com';
  const newEmail = 'email-novo@example.com';
  await createActiveUser({ email: oldEmail, name: 'Troca Email', password: 'SenhaAtual123!' });
  const rLogin = await login(oldEmail, 'SenhaAtual123!');
  assert.equal(rLogin.status, 200);
  const token = rLogin.data.token;

  const noPassword = await api('PUT', '/api/auth/profile', {
    name: 'Troca Email', email: newEmail
  }, token);
  assert.equal(noPassword.status, 400);

  const requestChange = await api('PUT', '/api/auth/profile', {
    name: 'Troca Email', email: newEmail, currentPassword: 'SenhaAtual123!'
  }, token);
  assert.equal(requestChange.status, 200);
  assert.equal(requestChange.data.email, oldEmail);
  assert.equal(requestChange.data.pending_email, newEmail);
  assert.ok(requestChange.data.verification_token);

  const stillOld = await login(oldEmail, 'SenhaAtual123!');
  assert.equal(stillOld.status, 200);
  const beforeConfirmNew = await login(newEmail, 'SenhaAtual123!');
  assert.equal(beforeConfirmNew.status, 401);

  const confirm = await api('POST', '/api/auth/confirm-email-change', {
    email: newEmail,
    token: requestChange.data.verification_token
  });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.data.email, newEmail);

  const oldAfter = await login(oldEmail, 'SenhaAtual123!');
  assert.equal(oldAfter.status, 401);
  const newAfter = await login(newEmail, 'SenhaAtual123!');
  assert.equal(newAfter.status, 200);

  const stored = await users.findByEmail(newEmail);
  assert.ok(stored.email_verified_at);
  assert.equal(stored.pending_email, null);
  assert.equal(stored.email_verification_token_hash, null);
});

test('ativacao de conta interna de teste tambem confirma o e-mail', async () => {
  const { createActivationToken } = require('../utils/accountActivation');
  const activation = createActivationToken();
  const email = 'interno-pendente@example.com';
  await users.insert({
    name: 'Teste Interno Pendente',
    email,
    whatsapp: null,
    password_hash: await bcrypt.hash('SenhaTemporariaInutil123!', 10),
    is_admin: false,
    plan: 'pro',
    account_status: 'pending_activation',
    subscription_status: 'active',
    subscription_source: 'internal_test',
    subscription_plan: 'internal',
    subscription_amount: '0',
    is_test_account: true,
    activation_token_hash: activation.tokenHash,
    activation_expires: activation.expiresAt,
    email_verified_at: null,
    referred_by: null
  });

  const activate = await api('POST', '/api/auth/activate', {
    email,
    token: activation.token,
    password: 'SenhaDefinida123!'
  });
  assert.equal(activate.status, 200);
  assert.ok(activate.data.user.email_verified_at);
  assert.equal((await login(email, 'SenhaDefinida123!')).status, 200);
});

test('recuperacao de senha funciona para assinante ativo', async () => {
  const email = 'reset-user@example.com';
  await createActiveUser({ email, name: 'Reset User', password: 'SenhaAntiga123!' });

  const forgot = await api('POST', '/api/auth/forgot-password', { email });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.data.code);

  const reset = await api('POST', '/api/auth/reset-password', {
    email,
    code: forgot.data.code,
    newPassword: 'SenhaNova456!'
  });
  assert.equal(reset.status, 200);

  const rLogin = await login(email, 'SenhaNova456!');
  assert.equal(rLogin.status, 200);

  const reuse = await api('POST', '/api/auth/reset-password', {
    email,
    code: forgot.data.code,
    newPassword: 'OutraSenha789!'
  });
  assert.equal(reuse.status, 400);
});

test('contato publico funciona para cartao ativo', async () => {
  const email = 'owner-notification@example.com';
  await createActiveUser({ email, name: 'Owner Test' });
  const rLogin = await login(email, 'SenhaValida123!');
  const token = rLogin.data.token;

  const rCard = await api('POST', '/api/cards', { name: 'Meu Cartao Teste' }, token);
  assert.equal(rCard.status, 201);

  const rContact = await api('POST', `/api/public/${rCard.data.slug}/contact`, {
    name: 'Visitante Interessado',
    phone: '11999998888',
    message: 'Olá, gostaria de saber mais!'
  });
  assert.equal(rContact.status, 201);
  assert.equal(rContact.data.message, 'Contato enviado com sucesso!');
});

test('metricas comerciais nao contam contas internas de teste', async () => {
  await createAdmin();
  await createActiveUser({ email: 'teste1@example.com', name: 'Teste Interno' });
  await payAndActivate('cliente-real@example.com', 'Cliente Real');

  const adminLogin = await login('admin@example.com', 'SenhaAdmin123!');
  assert.equal(adminLogin.status, 200);
  const stats = await api('GET', '/api/admin/stats', null, adminLogin.data.token);
  assert.equal(stats.status, 200);
  assert.equal(stats.data.totalUsers, 1);
  assert.equal(stats.data.activeSubscriptions, 1);
  assert.equal(stats.data.internalTests, 1);

  const list = await api('GET', '/api/admin/users', null, adminLogin.data.token);
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 2);
  const testUser = list.data.find(u => u.is_test_account);
  const realUser = list.data.find(u => u.subscription_source === 'cakto');
  assert.ok(testUser);
  assert.ok(realUser);
});


test('administrador envia mensagem interna e somente o destinatario consegue ler', async () => {
  await createAdmin();
  const user = await createActiveUser({ email: 'mensagem-user@example.com', name: 'Usuário Mensagem' });
  const other = await createActiveUser({ email: 'mensagem-outro@example.com', name: 'Outro Usuário' });

  const adminLogin = await login('admin@example.com', 'SenhaAdmin123!');
  const userLogin = await login('mensagem-user@example.com', 'SenhaValida123!');
  const otherLogin = await login('mensagem-outro@example.com', 'SenhaValida123!');

  const sent = await api('POST', `/api/admin/users/${user.id}/message`, {
    subject: 'Teste da semana',
    message: 'Esta é uma mensagem enviada pelo administrador para validar o painel.'
  }, adminLogin.data.token);
  assert.equal(sent.status, 200);
  assert.equal(sent.data.adminMessage.user_id, user.id);

  const inbox = await api('GET', '/api/messages', null, userLogin.data.token);
  assert.equal(inbox.status, 200);
  assert.equal(inbox.data.length, 1);
  assert.equal(inbox.data[0].read_at, null);

  const otherInbox = await api('GET', '/api/messages', null, otherLogin.data.token);
  assert.equal(otherInbox.status, 200);
  assert.equal(otherInbox.data.length, 0);

  const forbiddenRead = await api('POST', `/api/messages/${inbox.data[0].id}/read`, {}, otherLogin.data.token);
  assert.equal(forbiddenRead.status, 404);

  const read = await api('POST', `/api/messages/${inbox.data[0].id}/read`, {}, userLogin.data.token);
  assert.equal(read.status, 200);
  assert.ok(read.data.adminMessage.read_at);
});

test('QR de balcão conta scan separado de contato e abre o cartão público', async () => {
  await createActiveUser({ email: 'qr-owner@example.com', name: 'QR Owner' });
  const rLogin = await login('qr-owner@example.com', 'SenhaValida123!');
  const token = rLogin.data.token;
  const rCard = await api('POST', '/api/cards', { name: 'Cartão QR', whatsapp: '+5511999999999' }, token);
  assert.equal(rCard.status, 201);

  const qrRes = await fetch(base + `/site/${rCard.data.slug}/qr`, { redirect: 'manual' });
  assert.equal(qrRes.status, 302);
  const location = qrRes.headers.get('location') || '';
  assert.equal(location, `/site/${rCard.data.slug}`);

  const legacyQrRes = await fetch(base + `/site/${rCard.data.slug}/qr-whatsapp`, { redirect: 'manual' });
  assert.equal(legacyQrRes.status, 302);
  assert.equal(legacyQrRes.headers.get('location'), `/site/${rCard.data.slug}`);

  const summary = await api('GET', '/api/cards/stats/summary', null, token);
  assert.equal(summary.status, 200);
  assert.equal(summary.data.stats.qrScans, 2);
  assert.equal(summary.data.stats.contacts, 0);
});
