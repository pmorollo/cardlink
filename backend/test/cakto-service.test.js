process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { syncCaktoCatalog, getPublicCatalogState, _resetForTests } = require('../services/cakto');

const originalFetch = global.fetch;
const originalClientId = process.env.CAKTO_CLIENT_ID;
const originalClientSecret = process.env.CAKTO_CLIENT_SECRET;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test.afterEach(() => {
  global.fetch = originalFetch;
  if (originalClientId === undefined) delete process.env.CAKTO_CLIENT_ID;
  else process.env.CAKTO_CLIENT_ID = originalClientId;
  if (originalClientSecret === undefined) delete process.env.CAKTO_CLIENT_SECRET;
  else process.env.CAKTO_CLIENT_SECRET = originalClientSecret;
  _resetForTests();
});

test('sem credenciais preserva o checkout mensal e nao chama a Cakto', async () => {
  delete process.env.CAKTO_CLIENT_ID;
  delete process.env.CAKTO_CLIENT_SECRET;
  _resetForTests();
  global.fetch = async () => { throw new Error('fetch nao deveria ser chamado'); };

  const state = await syncCaktoCatalog({ createAnnual: true });

  assert.equal(state.configured, false);
  assert.equal(state.ready, false);
  assert.equal(state.monthlyCheckoutUrl, 'https://pay.cakto.com.br/kawb7xd_1032085');
  assert.equal(state.annualCheckoutUrl, '');
});

test('cria a oferta anual, configura afiliados e confere o webhook existente', async () => {
  process.env.CAKTO_CLIENT_ID = 'client-test';
  process.env.CAKTO_CLIENT_SECRET = 'secret-test';
  _resetForTests();
  const calls = [];
  let affiliateConfigured = false;

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/token/')) {
      return jsonResponse({ access_token: 'token-test', expires_in: 3600 });
    }
    if (String(url).includes('/products/?')) {
      return jsonResponse({ results: [{ id: 'product-1', short_id: 'short-1', name: 'CardLink', status: 'active', type: 'subscription', category: { name: 'Apps & Software' } }] });
    }
    if (String(url).endsWith('/products/product-1/') && (options.method || 'GET') === 'GET') {
      return jsonResponse({
        id: 'product-1',
        short_id: 'short-1',
        name: 'CardLink',
        status: 'active',
        type: 'subscription',
        affiliate: affiliateConfigured,
        affiliateRequest: affiliateConfigured,
        affiliateCommission: affiliateConfigured ? '30.00' : null,
        affiliateMarketplace: affiliateConfigured,
        affiliateClick: affiliateConfigured ? 'last' : '',
        cookieTime: affiliateConfigured ? -1 : null,
        affiliateDescription: affiliateConfigured ? 'Materiais: https://cardlink.digitalnexoapp.com/afiliados' : '',
        affiliateSupportEmail: affiliateConfigured ? 'cardlink@yahoo.com' : '',
        affiliateSalesPage: affiliateConfigured ? 'https://cardlink.digitalnexoapp.com/' : '',
        image: null,
        salesPage: 'https://cardlink.example.com/'
      });
    }
    if (String(url).endsWith('/products/product-1/') && options.method === 'PUT') {
      const payload = JSON.parse(options.body);
      assert.equal(payload.name, 'CardLink');
      assert.equal(payload.price, '12.90');
      assert.match(payload.description, /Cartão digital profissional/);
      assert.equal(payload.salesPage, 'https://cardlink.digitalnexoapp.com/');
      assert.equal(payload.affiliate, true);
      assert.equal(payload.affiliateRequest, true);
      assert.equal(payload.affiliateCommission, '30.00');
      assert.equal(payload.affiliateContact, false);
      assert.equal(payload.affiliateMarketplace, true);
      assert.equal(payload.affiliateClick, 'last');
      assert.equal(payload.cookieTime, -1);
      assert.equal(payload.affiliateShareBump, false);
      assert.equal(payload.affiliateShareUpsell, false);
      assert.equal(payload.affiliateCloneQuiz, false);
      assert.equal(payload.affiliateCloneQuizUrl, '');
      assert.equal(payload.affiliateSupportEmail, 'cardlink@yahoo.com');
      assert.equal(payload.affiliateSalesPage, 'https://cardlink.digitalnexoapp.com/');
      assert.match(payload.affiliateDescription, /cardlink\.digitalnexoapp\.com\/afiliados/);
      affiliateConfigured = true;
      return jsonResponse({
        id: 'product-1',
        short_id: 'short-1',
        name: 'CardLink',
        status: 'active',
        type: 'subscription',
        affiliate: true,
        affiliateRequest: true,
        affiliateCommission: '30.00',
        affiliateMarketplace: true,
        affiliateClick: 'last',
        cookieTime: -1,
        affiliateDescription: payload.affiliateDescription,
        affiliateSupportEmail: payload.affiliateSupportEmail,
        affiliateSalesPage: payload.affiliateSalesPage,
        image: null,
        salesPage: 'https://cardlink.example.com/'
      });
    }
    if (String(url).includes('/offers/') && (options.method || 'GET') === 'GET') {
      return jsonResponse({
        results: [{
          id: 'kawb7xd_1032085',
          name: 'CardLink Mensal',
          price: 12.9,
          product: 'product-1',
          status: 'active',
          type: 'subscription',
          intervalType: 'month',
          interval: 1,
          recurrence_period: 30,
          quantity_recurrences: -1
        }]
      });
    }
    if (String(url).endsWith('/offers/') && options.method === 'POST') {
      const payload = JSON.parse(options.body);
      assert.equal(payload.product, 'product-1');
      assert.equal(payload.name, 'CardLink Anual');
      assert.equal(payload.price, 99);
      assert.equal(payload.type, 'subscription');
      assert.equal(payload.intervalType, 'year');
      assert.equal(payload.recurrence_period, 365);
      assert.equal(payload.quantity_recurrences, -1);
      return jsonResponse({ id: 'annual-new', ...payload, default: false }, 201);
    }
    if (String(url).includes('/webhook/')) {
      return jsonResponse({ results: [{ id: 1, status: 'active', products: [{ id: 'product-1' }] }] });
    }
    throw new Error(`URL inesperada: ${url}`);
  };

  const state = await syncCaktoCatalog({ createAnnual: true, configureAffiliates: true });

  assert.equal(state.configured, true);
  assert.equal(state.ready, true);
  assert.equal(state.productId, 'product-1');
  assert.equal(state.productShortId, 'short-1');
  assert.equal(state.productName, 'CardLink');
  assert.equal(state.monthlyCheckoutUrl, 'https://pay.cakto.com.br/kawb7xd_1032085');
  assert.equal(state.annualCheckoutUrl, 'https://pay.cakto.com.br/annual-new');
  assert.equal(state.webhookConfigured, true);
  assert.equal(state.affiliateEnabled, true);
  assert.equal(state.affiliateApprovalRequired, true);
  assert.equal(state.affiliateCommission, '30.00');
  assert.equal(state.affiliateMarketplace, true);
  assert.equal(state.affiliateConfigurationError, null);
  assert.equal(state.hasAffiliateDescription, true);
  assert.equal(state.hasAffiliateSupportEmail, true);
  assert.equal(state.hasAffiliateSalesPage, true);
  assert.equal(state.hasProductImage, false);
  assert.equal(state.hasSalesPage, true);
  assert.equal(state.affiliateSalesPageUrl, 'https://cardlink.digitalnexoapp.com/');
  assert.equal(state.salesPageUrl, 'https://cardlink.example.com/');
  assert.equal(state.productCategory, 'Apps & Software');
  assert.equal(calls.filter(call => call.options.method === 'POST' && call.url.endsWith('/offers/')).length, 1);
  assert.equal(calls.filter(call => call.options.method === 'PUT' && call.url.endsWith('/products/product-1/')).length, 1);
  assert.equal(calls.filter(call => (call.options.method || 'GET') === 'GET' && call.url.endsWith('/products/product-1/')).length, 2);
  assert.deepEqual(getPublicCatalogState(), state);
});
