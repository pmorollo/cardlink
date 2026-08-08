const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const app = require('../server');
const repo = require('../db/repository');

// Teste de integração contra PostgreSQL real.
// Execute com: DATABASE_URL=postgres://postgres@localhost:5433/cardlink_test node --test backend/test/pg.integration.test.js
// (o banco cardlink_test deve existir; as tabelas são truncadas a cada teste)

const PG_URL = process.env.TEST_PG_URL || process.env.DATABASE_URL;
const hasPg = PG_URL && (PG_URL.startsWith('postgres://') || PG_URL.startsWith('postgresql://'));

if (!hasPg) {
  test.skip('PG nao configurado; defina TEST_PG_URL/DATABASE_URL para rodar', () => {});
} else {
  let server;
  let base;
  let adminToken;
  let userToken;
  let cardId;
  let userId;

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
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(base + urlPath, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* sem corpo */ }
    return { status: res.status, data };
  }

  test.before(async () => {
    await resetTables();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    server && server.closeAllConnections && server.closeAllConnections();
    server && await new Promise(r => server.close(r));
    await repo.close().catch(() => {});
  });

  test('fluxo completo: admin, user, card, contato publico e stats', async () => {
    const admins = (process.env.ADMIN_EMAILS || 'pedro.morollo@gmail.com').split(',').map(s => s.trim()).filter(Boolean);
// 1. Registro do dono (admin)
    const rAdmin = await api('POST', '/api/auth/register', { name: 'Dono', email: admins[0], password: 'SenhaValida123!' });
    assert.equal(rAdmin.status, 201, JSON.stringify(rAdmin.data));
    assert.equal(rAdmin.data.user.is_admin, true);
    adminToken = rAdmin.data.token;

    // 2. Registro de um usuário comum
    const rUser = await api('POST', '/api/auth/register', { name: 'Cliente', email: 'cliente@example.com', password: 'SenhaValida123!' });
    assert.equal(rUser.status, 201);
    assert.equal(rUser.data.user.is_admin, false);
    userToken = rUser.data.token;
    userId = rUser.data.user.id;

    // 3. Cria cartão
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

    // 4. Second POST updates (usuario ja tem card) — comportamento herdado
    const rCard2 = await api('POST', '/api/cards', { name: 'Cliente Teste' }, userToken);
    assert.ok([200, 201].includes(rCard2.status), `esperava 200/201, recebi ${rCard2.status}`);
    assert.equal(rCard2.data.id, rCard.data.id, 'deve atualizar o mesmo card');

    // 4b. Slug unico entre usuarios diferentes
    const rUser3 = await api('POST', '/api/auth/register', { name: 'Cliente 3', email: 'cliente3@example.com', password: 'SenhaValida123!' });
    const rCard3 = await api('POST', '/api/cards', { name: 'Cliente Teste' }, rUser3.data.token);
    assert.equal(rCard3.status, 201);
    assert.notEqual(rCard3.data.slug, rCard.data.slug);

    // 5. Atualiza cartao
    const rUpd = await api('PUT', `/api/cards/${cardId}`, { title: 'CEO', description: 'Nova descrição' }, userToken);
    assert.equal(rUpd.status, 200);
    assert.equal(rUpd.data.title, 'CEO');

    // 6. Página pública: incrementa views e nao expoe internos (views_count, user_id, timestamps)
    const rPub1 = await api('GET', `/api/public/${rCard.data.slug}`);
    assert.equal(rPub1.status, 200);
    assert.equal(rPub1.data.user_id, undefined);
    assert.equal(rPub1.data.views_count, undefined, 'payload publico nao deve conter views_count');
    const rPub2 = await api('GET', `/api/public/${rCard.data.slug}`);
    assert.equal(rPub2.status, 200);

    // 7. Contato público
    const rContact = await api('POST', `/api/public/${rCard.data.slug}/contact`, {
      name: 'Visitante',
      email: 'visitante@example.com',
      message: 'Quero um orçamento'
    });
    assert.equal(rContact.status, 201);

    // 8. Anti-spam: mensagem com HTML
    const rSpam = await api('POST', `/api/public/${rCard.data.slug}/contact`, { name: '<script>', message: 'ok' });
    assert.equal(rSpam.status, 400);

    // 9. Contato sem nome
    const rNoName = await api('POST', `/api/public/${rCard.data.slug}/contact`, { name: '', message: 'oi' });
    assert.equal(rNoName.status, 400);

    // 10. Lista de contatos do card (autenticado)
    const rContacts = await api('GET', `/api/cards/${cardId}/contacts`, null, userToken);
    assert.equal(rContacts.status, 200);
    assert.equal(rContacts.data.length, 1);
    assert.equal(rContacts.data[0].name, 'Visitante');

    // 11. Stats do card
    const rStats = await api('GET', '/api/cards/stats/summary', null, userToken);
    assert.equal(rStats.status, 200);
    assert.equal(rStats.data.hasCard, true);
    assert.equal(rStats.data.stats.contacts, 1);

    // 12. Acesso indevido: user comum NAO ve card de outro user via /users (admin)
    const rForbidden = await api('GET', '/api/admin/stats', null, userToken);
    assert.equal(rForbidden.status, 403);

    // 13. Admin: stats globais
    const rStatsAdmin = await api('GET', '/api/admin/stats', null, adminToken);
    assert.equal(rStatsAdmin.status, 200);
    assert.equal(rStatsAdmin.data.totalUsers, 3);
    assert.equal(rStatsAdmin.data.totalCards, 2);
    assert.equal(rStatsAdmin.data.totalContacts, 1);

    // 14. Admin: lista de usuarios
    const rUsers = await api('GET', '/api/admin/users', null, adminToken);
    assert.equal(rUsers.status, 200);
    assert.equal(rUsers.data.length, 3);

    // 15. Admin muda plano
    const rPlan = await api('POST', `/api/admin/users/${userId}/plan`, { plan: 'pro' }, adminToken);
    assert.equal(rPlan.status, 200);
    assert.equal(rPlan.data.user.plan, 'pro');

    // 16. Support ticket (cliente)
    const rTicket = await api('POST', '/api/support', { subject: 'Ajuda', message: 'Não consigo editar' }, userToken);
    assert.equal(rTicket.status, 200);
    assert.equal(rTicket.data.ticket.status, 'open');

    // 17. Admin: lista de tickets
    const rTickets = await api('GET', '/api/admin/support', null, adminToken);
    assert.equal(rTickets.status, 200);
    assert.equal(rTickets.data.length, 1);

    // 18. Card nao encontrado
    const rMissing = await api('GET', '/api/cards/99999', null, userToken);
    assert.equal(rMissing.status, 404);

    // 19. Delete do card
    const rDel = await api('DELETE', `/api/cards/${cardId}`, null, userToken);
    assert.equal(rDel.status, 200);
    const rAfterDel = await api('GET', `/api/cards/${cardId}`, null, userToken);
    assert.equal(rAfterDel.status, 404);
  });
}
