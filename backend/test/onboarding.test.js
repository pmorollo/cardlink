process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

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
  db.admin_messages = [];
  db.webhook_events = [];
  db._counters = { users: 0, cards: 0, contacts: 0, support_tickets: 0, admin_messages: 0, webhook_events: 0 };
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

async function api(method, urlPath, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let parsed = null;
  try { parsed = await res.json(); } catch (_) { parsed = null; }
  return { status: res.status, body: parsed };
}

// Prova central da "porta de entrada única": nome, e-mail, nome do negócio,
// descrição e template num único SALVAR cria a conta E o primeiro cartão
// juntos, sem senha e sem etapa de confirmação por e-mail — exatamente a
// especificação literal do fluxo de cadastro fluido (Fase 2).
test('POST /api/onboarding/criar-cartao cria conta + cartão juntos, numa única chamada', async () => {
  const email = `fluido-${Date.now()}@teste.com`;
  const res = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Maria Teste',
    email,
    business_name: 'Studio Maria Beleza',
    business_description: 'Salão de beleza especializado em coloração',
    template_key: 'comercial'
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.token, 'deveria devolver um token de sessão imediato (já logado)');
  assert.equal(res.body.user.email, email);
  assert.equal(res.body.user.plan, 'free');
  assert.equal(res.body.user.account_status, 'active', 'conta deve nascer ativa, sem etapa de confirmação');

  assert.ok(res.body.card, 'deveria criar o cartão junto com a conta');
  assert.equal(res.body.card.name, 'Studio Maria Beleza');
  assert.equal(res.body.card.template_key, 'comercial');
  assert.equal(res.body.card.theme, 'comercial');
  assert.ok(res.body.card.slug, 'o cartão precisa de um slug para a URL pública');

  assert.ok(res.body.site_url, 'deveria devolver a URL pública do site recém-criado');
  assert.ok(res.body.site_url.endsWith(`/site/${res.body.card.slug}`));
});

test('POST /api/onboarding/criar-cartao rejeita e-mail já cadastrado, sem criar duplicata', async () => {
  const email = `fluido-dup-${Date.now()}@teste.com`;
  const first = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Primeiro', email, business_name: 'Negócio 1', business_description: '', template_key: ''
  });
  assert.equal(first.status, 201);

  const second = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Segundo', email, business_name: 'Negócio 2', business_description: '', template_key: ''
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'email_already_registered');
});

test('POST /api/onboarding/criar-cartao exige nome, e-mail válido e nome do negócio', async () => {
  const noName = await api('POST', '/api/onboarding/criar-cartao', {
    name: '', email: 'x@x.com', business_name: 'Negócio'
  });
  assert.equal(noName.status, 400);

  const badEmail = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Fulano', email: 'nao-e-email', business_name: 'Negócio'
  });
  assert.equal(badEmail.status, 400);

  const noBusiness = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Fulano', email: `semnegocio-${Date.now()}@teste.com`, business_name: ''
  });
  assert.equal(noBusiness.status, 400);
});

test('POST /api/onboarding/criar-cartao sem template_key cai no template padrão (institucional)', async () => {
  const email = `sem-template-${Date.now()}@teste.com`;
  const res = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'Sem Template', email, business_name: 'Negócio Simples', business_description: ''
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.card.theme, 'institucional');
  assert.equal(res.body.card.template_key, null);
});

// Conta do cadastro fluido nasce sem senha: precisa conseguir definir a
// primeira senha sem "senha atual", e depois entrar com e-mail + senha.
test('conta do cadastro fluido define a primeira senha e passa a logar com ela', async () => {
  const email = `senha-${Date.now()}@teste.com`;
  const created = await api('POST', '/api/onboarding/criar-cartao', {
    name: 'João Senha', email, business_name: 'Oficina do João', template_key: 'profissional'
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.password_defined, false);
  const auth = { Authorization: `Bearer ${created.body.token}`, 'Content-Type': 'application/json' };

  const me = await fetch(base + '/api/auth/me', { headers: auth }).then(r => r.json());
  assert.equal(me.password_defined, false);

  const short = await fetch(base + '/api/auth/set-password', { method: 'PUT', headers: auth, body: JSON.stringify({ newPassword: '123' }) });
  assert.equal(short.status, 400);

  const ok = await fetch(base + '/api/auth/set-password', { method: 'PUT', headers: auth, body: JSON.stringify({ newPassword: 'SenhaNova123' }) });
  assert.equal(ok.status, 200);

  // Depois de definida, não dá para redefinir sem a senha atual.
  const again = await fetch(base + '/api/auth/set-password', { method: 'PUT', headers: auth, body: JSON.stringify({ newPassword: 'OutraSenha456' }) });
  assert.equal(again.status, 409);

  const meAfter = await fetch(base + '/api/auth/me', { headers: auth }).then(r => r.json());
  assert.equal(meAfter.password_defined, true);

  const login = await api('POST', '/api/auth/login', { email, password: 'SenhaNova123' });
  assert.equal(login.status, 200);
});

test('set-password exige sessão e não vale para contas com senha já definida', async () => {
  const anon = await api('PUT', '/api/auth/set-password', { newPassword: 'SenhaNova123' });
  assert.equal(anon.status, 401);
});
