process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = require('../server');
const { db } = require('../db/database');

const DATA_FILE = path.join(__dirname, '..', 'db', 'data.json');
let server;
let base;
let backup;

function snapshotDb() {
  db.users = [];
  db.cards = [];
  db.contacts = [];
  db.support_tickets = [];
  db._counters = { users: 0, cards: 0, contacts: 0, support_tickets: 0 };
}

function saveJsonState() {
  return JSON.stringify({ users: db.users, cards: db.cards, contacts: db.contacts, support_tickets: db.support_tickets, _counters: db._counters });
}

test.before(async () => {
  backup = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf-8') : '';
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(snapshotDb);

test.after(() => {
  server && server.close();
  if (backup === '') {
    fs.rmSync(DATA_FILE, { force: true });
  } else {
    fs.writeFileSync(DATA_FILE, backup, 'utf-8');
  }
});

async function api(method, urlPath, body) {
  const res = await fetch(base + urlPath, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* resposta sem corpo JSON */ }
  return { status: res.status, data, raw: res };
}

test('GET / serve o frontend (SPA)', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html/i);
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
  assert.ok(!acao || res.status >= 400, `esperava bloqueio, recebi status ${res.status} ACAO=${acao}`);
});

test('registro com e-mail suspeito NAO vira admin', async () => {
  const r = await api('POST', '/api/auth/register', {
    name: 'Suspicious', email: 'pedro.morollo.attacker@example.com', password: 'SenhaValida123!'
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.is_admin, false);
  assert.equal(r.data.user.plan, 'free');
});

test('registro com e-mail admin (ADMIN_EMAILS) vira admin', async () => {
  const admins = (process.env.ADMIN_EMAILS || 'pedro.morollo@gmail.com').split(',').map(s => s.trim()).filter(Boolean);
  const email = admins[0];
  const r = await api('POST', '/api/auth/register', {
    email, name: 'Admin', password: 'SenhaValida123!'
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.is_admin, true);
});

test('fluxo completo de recuperacao de senha', async (t) => {
  const email = 'reset-user@example.com';
  const r1 = await api('POST', '/api/auth/register', { email, name: 'Reset', password: 'SenhaAntiga123!' });
  assert.equal(r1.status, 201);

  const r2 = await api('POST', '/api/auth/forgot-password', { email });
  assert.equal(r2.status, 200);
  assert.ok(r2.data.code, 'em dev o codigo deve vir na resposta');

  const r3 = await api('POST', '/api/auth/reset-password', { email, code: r2.data.code, newPassword: 'SenhaNova456!' });
  assert.equal(r3.status, 200);

  const r4 = await api('POST', '/api/auth/login', { email, password: 'SenhaNova456!' });
  assert.equal(r4.status, 200);
  assert.ok(r4.data.token);

  const r5 = await api('POST', '/api/auth/reset-password', { email, code: r2.data.code, newPassword: 'Xyz12345!' });
  assert.equal(r5.status, 400, 'codigo reutilizado deve ser rejeitado');
});

test('reset de senha com codigo errado eh rejeitado', async () => {
  const email = 'eraser-user@example.com';
  await api('POST', '/api/auth/register', { email, name: 'E', password: 'SenhaAntiga123!' });
  await api('POST', '/api/auth/forgot-password', { email });

  const r = await api('POST', '/api/auth/reset-password', { email, code: '000000', newPassword: 'SenhaNova456!' });
  assert.equal(r.status, 400);
});

test('webhook da Cakto ativa e cancela plano PRO', async () => {
  const email = 'webhook-user@example.com';
  // 1. Registra usuário comum
  const rReg = await api('POST', '/api/auth/register', { email, name: 'Test Webhook', password: 'Password123!' });
  assert.equal(rReg.status, 201);
  assert.equal(rReg.data.user.plan, 'free');

  // 2. Simula webhook de pagamento aprovado da Cakto
  const rHookPay = await api('POST', '/api/payments/cakto-webhook', {
    email,
    status: 'paid'
  });
  assert.equal(rHookPay.status, 200);
  assert.equal(rHookPay.data.success, true);
  assert.equal(rHookPay.data.plan, 'pro');

  // 3. Simula webhook de cancelamento/estorno
  const rHookCancel = await api('POST', '/api/payments/cakto-webhook', {
    email,
    status: 'refunded'
  });
  assert.equal(rHookCancel.status, 200);
  assert.equal(rHookCancel.data.success, true);
  assert.equal(rHookCancel.data.plan, 'free');
});

test('controle de recursos (gating) free vs pro no backend', async () => {
  const email = 'gated-user@example.com';
  
  // 1. Cria usuário free
  const rReg = await api('POST', '/api/auth/register', { email, name: 'Gated User', password: 'Password123!' });
  const token = rReg.data.token;
  
  // 2. Tenta chamar API de IA como free (deve falhar com 403)
  const resAI = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ profession: 'Designer' })
  });
  assert.equal(resAI.status, 403);

  // 3. Tenta salvar cartão com produtos como free (deve salvar os produtos na conta rascunho)
  const resCard = await fetch(`http://127.0.0.1:${server.address().port}/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ 
      name: 'Card de Gated', 
      slug: 'card-de-gated',
      products: [{ name: 'Shampoo', price: '20,00' }] 
    })
  });
  assert.equal(resCard.status, 201);
  const cardData = await resCard.json();
  assert.equal(cardData.products.length, 1);
  assert.equal(cardData.products[0].name, 'Shampoo');

  // 4. Acesso ao link público como free deve retornar 402 Payment Required
  const resPublicFree = await fetch(`http://127.0.0.1:${server.address().port}/api/public/card-de-gated`);
  assert.equal(resPublicFree.status, 402);

  // 5. Promove usuário a PRO
  await api('POST', '/api/payments/cakto-webhook', { email, status: 'paid' });

  // 6. Tenta chamar API de IA como PRO (deve passar com 200)
  const resAIPro = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ profession: 'Designer' })
  });
  assert.equal(resAIPro.status, 200);

  // 7. Acesso ao link público como PRO deve retornar 200
  const resPublicPro = await fetch(`http://127.0.0.1:${server.address().port}/api/public/card-de-gated`);
  assert.equal(resPublicPro.status, 200);
  const publicData = await resPublicPro.json();
  assert.equal(publicData.name, 'Card de Gated');
});


test('envio de contato publico dispara email de notificacao para o dono do cartao', async () => {
  const email = 'owner-notification@example.com';
  // 1. Registra usuário dono
  const rReg = await api('POST', '/api/auth/register', { email, name: 'Owner Test', password: 'Password123!' });
  const token = rReg.data.token;

  // 2. Cria cartão para esse usuário
  const rCard = await fetch(`http://127.0.0.1:${server.address().port}/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Meu Cartao Teste' })
  });
  const cardData = await rCard.json();
  const slug = cardData.slug;

  // 3. Envia contato público para o slug desse cartão
  const rContact = await fetch(`http://127.0.0.1:${server.address().port}/api/public/${slug}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: 'Visitante Interessado', 
      phone: '11999998888', 
      message: 'Olá, gostaria de saber mais!' 
    })
  });
  
  assert.equal(rContact.status, 201);
  const contactRes = await rContact.json();
  assert.equal(contactRes.message, 'Contato enviado com sucesso!');
});