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
