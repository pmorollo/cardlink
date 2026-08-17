const test = require('node:test');
const assert = require('node:assert/strict');

// Teste de integração DESTRUTIVO contra PostgreSQL de teste.
// Execute somente com: TEST_PG_URL=postgres://postgres@localhost:5433/cardlink_test node --test backend/test/pg.integration.test.js
// O banco informado será truncado. DATABASE_URL nunca é usado automaticamente aqui.
const PG_URL = process.env.TEST_PG_URL;
const hasPg = PG_URL && (PG_URL.startsWith('postgres://') || PG_URL.startsWith('postgresql://'));

if (!hasPg) {
  test.skip('PG de teste nao configurado; defina TEST_PG_URL explicitamente para rodar', () => {});
} else {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = PG_URL;
  process.env.SMTP_HOST = '';
  process.env.SMTP_USER = '';
  process.env.SMTP_PASS = '';
  process.env.NVIDIA_API_KEY = '';

  const { Pool } = require('pg');
  const bcrypt = require('bcryptjs');
  const app = require('../server');
  const repo = require('../db/repository');

  let server;
  let base;
  let adminToken;
  let userToken;
  let cardId;
  let userId;
  let internalUserId;

  async function resetTables() {
    const pool = new Pool({ connectionString: PG_URL });
    await pool.query(`
      TRUNCATE TABLE contacts, support_tickets, cards, users RESTART IDENTITY CASCADE;
    `);
    await pool.end();
  }

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
    return { status: res.status, data };
  }

  async function insertUser({ name, email, password, isAdmin = false, isTest = false, source = 'cakto' }) {
    return repo.users.insert({
      name,
      email,
      whatsapp: null,
      password_hash: await bcrypt.hash(password, 10),
      is_admin: isAdmin,
      plan: isAdmin ? 'none' : 'pro',
      account_status: 'active',
      subscription_status: isAdmin ? 'none' : 'active',
      subscription_source: isAdmin ? 'none' : source,
      subscription_plan: isAdmin ? null : (isTest ? 'internal' : 'monthly'),
      subscription_amount: isAdmin ? null : (isTest ? '0' : '12.90'),
      is_test_account: isTest,
      referred_by: null,
      subscription_updated_at: new Date().toISOString()
    });
  }

  async function login(email, password) {
    return api('POST', '/api/auth/login', { email, password });
  }

  test.before(async () => {
    await resetTables();
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    server && server.closeAllConnections && server.closeAllConnections();
    server && await new Promise(r => server.close(r));
    await repo.close().catch(() => {});
  });

  test('fluxo completo PostgreSQL: admin, assinante, teste interno, card, contato e stats', async () => {
    const admin = await insertUser({
      name: 'Dono',
      email: 'admin-test@example.com',
      password: 'SenhaValida123!',
      isAdmin: true
    });
    const adminLogin = await login(admin.email, 'SenhaValida123!');
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.data.token;

    const customer = await insertUser({
      name: 'Cliente',
      email: 'cliente@example.com',
      password: 'SenhaValida123!',
      source: 'cakto'
    });
    userId = customer.id;
    const customerLogin = await login(customer.email, 'SenhaValida123!');
    assert.equal(customerLogin.status, 200);
    userToken = customerLogin.data.token;

    const rCard = await api('POST', '/api/cards', {
      name: 'Cliente Teste',
      business: 'Loja Teste',
      title: 'Proprietario',
      whatsapp: 'wa.me/5511999999999',
      instagram: '@cliente',
      theme: 'sunset'
    }, userToken);
    assert.equal(rCard.status, 201, JSON.stringify(rCard.data));
    assert.ok(rCard.data.slug);
    assert.deepEqual(rCard.data.products, []);
    cardId = rCard.data.id;

    const rCard2 = await api('POST', '/api/cards', { name: 'Cliente Teste' }, userToken);
    assert.ok([200, 201].includes(rCard2.status));
    assert.equal(rCard2.data.id, rCard.data.id);

    const internal = await insertUser({
      name: 'Equipe',
      email: 'equipe@example.com',
      password: 'SenhaValida123!',
      isTest: true,
      source: 'internal_test'
    });
    internalUserId = internal.id;
    const internalLogin = await login(internal.email, 'SenhaValida123!');
    assert.equal(internalLogin.status, 200);
    const rCard3 = await api('POST', '/api/cards', { name: 'Cliente Teste' }, internalLogin.data.token);
    assert.equal(rCard3.status, 201);
    assert.notEqual(rCard3.data.slug, rCard.data.slug);

    const rUpd = await api('PUT', `/api/cards/${cardId}`, { title: 'CEO', description: 'Nova descrição' }, userToken);
    assert.equal(rUpd.status, 200);
    assert.equal(rUpd.data.title, 'CEO');

    const rPub1 = await api('GET', `/api/public/${rCard.data.slug}`);
    assert.equal(rPub1.status, 200);
    assert.equal(rPub1.data.user_id, undefined);
    assert.equal(rPub1.data.views_count, undefined);
    assert.equal((await api('GET', `/api/public/${rCard.data.slug}`)).status, 200);

    const rContact = await api('POST', `/api/public/${rCard.data.slug}/contact`, {
      name: 'Visitante',
      email: 'visitante@example.com',
      message: 'Quero um orçamento'
    });
    assert.equal(rContact.status, 201);
    assert.equal((await api('POST', `/api/public/${rCard.data.slug}/contact`, { name: '<script>', message: 'ok' })).status, 400);
    assert.equal((await api('POST', `/api/public/${rCard.data.slug}/contact`, { name: '', message: 'oi' })).status, 400);

    const rContacts = await api('GET', `/api/cards/${cardId}/contacts`, null, userToken);
    assert.equal(rContacts.status, 200);
    assert.equal(rContacts.data.length, 1);

    const rStats = await api('GET', '/api/cards/stats/summary', null, userToken);
    assert.equal(rStats.status, 200);
    assert.equal(rStats.data.hasCard, true);
    assert.equal(rStats.data.stats.contacts, 1);

    assert.equal((await api('GET', '/api/admin/stats', null, userToken)).status, 403);

    const rStatsAdmin = await api('GET', '/api/admin/stats', null, adminToken);
    assert.equal(rStatsAdmin.status, 200);
    assert.equal(rStatsAdmin.data.totalUsers, 1, 'somente cliente comercial');
    assert.equal(rStatsAdmin.data.activeSubscriptions, 1);
    assert.equal(rStatsAdmin.data.internalTests, 1);
    assert.equal(rStatsAdmin.data.totalCards, 2);
    assert.equal(rStatsAdmin.data.totalContacts, 1);

    const rUsers = await api('GET', '/api/admin/users', null, adminToken);
    assert.equal(rUsers.status, 200);
    assert.equal(rUsers.data.length, 2);

    const rCommercialToggle = await api('POST', `/api/admin/users/${userId}/plan`, { plan: 'inactive' }, adminToken);
    assert.equal(rCommercialToggle.status, 409, 'assinatura Cakto nao deve ser alterada manualmente');

    const rTestToggle = await api('POST', `/api/admin/users/${internalUserId}/plan`, { plan: 'inactive' }, adminToken);
    assert.equal(rTestToggle.status, 200);
    assert.equal(rTestToggle.data.user.plan, 'inactive');

    const rTicket = await api('POST', '/api/support', { subject: 'Ajuda', message: 'Não consigo editar' }, userToken);
    assert.equal(rTicket.status, 200);
    assert.equal(rTicket.data.ticket.status, 'open');

    const rTickets = await api('GET', '/api/admin/support', null, adminToken);
    assert.equal(rTickets.status, 200);
    assert.equal(rTickets.data.length, 1);

    assert.equal((await api('GET', '/api/cards/99999', null, userToken)).status, 404);

    const rDel = await api('DELETE', `/api/cards/${cardId}`, null, userToken);
    assert.equal(rDel.status, 200);
    assert.equal((await api('GET', `/api/cards/${cardId}`, null, userToken)).status, 404);
  });
}
