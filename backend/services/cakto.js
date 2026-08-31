const CAKTO_API_BASE = 'https://api.cakto.com.br/public_api';
const DEFAULT_MONTHLY_CHECKOUT_URL = 'https://pay.cakto.com.br/kawb7xd_1032085';
const CARDLINK_PUBLIC_URL = 'https://cardlink.digitalnexoapp.com/';
const CARDLINK_AFFILIATE_MATERIALS_URL = `${CARDLINK_PUBLIC_URL}afiliados`;
const CARDLINK_AFFILIATE_DESCRIPTION = [
  'CardLink é um cartão digital profissional por assinatura para autônomos, prestadores de serviço e pequenos negócios.',
  'Reúne serviços, fotos, avaliações, localização, redes sociais, WhatsApp, link e QR Code em uma única apresentação.',
  'Planos: R$ 12,90 por mês ou R$ 99 por ano.',
  `Materiais oficiais de divulgação: ${CARDLINK_AFFILIATE_MATERIALS_URL}`
].join(' ');
const CARDLINK_PRODUCT_DESCRIPTION = 'Cartão digital profissional para reunir serviços, fotos, avaliações, localização, redes sociais e WhatsApp em um único link ou QR Code.';

let tokenCache = null;
let syncPromise = null;
let catalogState = {
  configured: false,
  ready: false,
  productId: '',
  productShortId: '',
  productName: '',
  monthlyCheckoutUrl: process.env.CAKTO_MONTHLY_CHECKOUT_URL || DEFAULT_MONTHLY_CHECKOUT_URL,
  annualCheckoutUrl: process.env.CAKTO_ANNUAL_CHECKOUT_URL || '',
  webhookConfigured: null,
  affiliateEnabled: false,
  affiliateApprovalRequired: false,
  affiliateCommission: null,
  affiliateMarketplace: false,
  affiliateConfigurationError: null,
  hasAffiliateDescription: false,
  hasAffiliateSupportEmail: false,
  hasAffiliateSalesPage: false,
  hasProductImage: false,
  hasSalesPage: false,
  affiliateSalesPageUrl: '',
  salesPageUrl: '',
  productCategory: '',
  lastSyncAt: null
};

function apiCredentials() {
  return {
    clientId: String(process.env.CAKTO_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.CAKTO_CLIENT_SECRET || '').trim()
  };
}

function withTimeout(ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail = typeof body === 'object' && body
      ? body.detail || body.error || body.message || JSON.stringify(body)
      : body;
    const error = new Error(`Cakto API ${response.status}: ${String(detail || 'falha na requisição').substring(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = apiCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET não configurados');
  }

  const timeout = withTimeout();
  try {
    const response = await fetch(`${CAKTO_API_BASE}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
      signal: timeout.signal
    });
    const body = await parseResponse(response);
    if (!body || !body.access_token) throw new Error('A Cakto não retornou um token de acesso');
    tokenCache = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000
    };
    return tokenCache.accessToken;
  } finally {
    timeout.clear();
  }
}

async function caktoRequest(path, options = {}) {
  const token = await getAccessToken();
  const timeout = withTimeout();
  try {
    const response = await fetch(`${CAKTO_API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: timeout.signal
    });
    return await parseResponse(response);
  } finally {
    timeout.clear();
  }
}

function resultsOf(body) {
  return Array.isArray(body?.results) ? body.results : [];
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function numberEquals(value, expected) {
  return Math.abs(Number(value) - expected) < 0.001;
}

function offerCheckoutUrl(offer) {
  if (!offer?.id) return '';
  return `https://pay.cakto.com.br/${offer.id}`;
}

function isMonthlyOffer(offer) {
  const name = normalized(offer?.name);
  return offer?.status === 'active' && offer?.type === 'subscription' && (
    name.includes('mensal') || name.includes('monthly') ||
    (Number(offer.recurrence_period) === 30 && numberEquals(offer.price, 12.9))
  );
}

function isAnnualOffer(offer) {
  const name = normalized(offer?.name);
  return offer?.status === 'active' && offer?.type === 'subscription' && (
    name.includes('anual') || name.includes('annual') ||
    (Number(offer.recurrence_period) === 365 && numberEquals(offer.price, 99))
  );
}

function selectCardLinkProduct(products) {
  const active = products.filter(product => product?.status === 'active');
  const exact = active.filter(product => normalized(product.name) === 'cardlink');
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error('Mais de um produto ativo chamado CardLink foi encontrado na Cakto');

  const contains = active.filter(product => normalized(product.name).includes('cardlink'));
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) throw new Error('Mais de um produto CardLink ativo foi encontrado na Cakto');
  throw new Error('Produto CardLink ativo não encontrado na Cakto');
}

function affiliateConfigurationMatches(product) {
  return Boolean(product?.affiliate) &&
    Boolean(product?.affiliateRequest) &&
    numberEquals(product?.affiliateCommission, 30) &&
    Boolean(product?.affiliateMarketplace) &&
    String(product?.affiliateSupportEmail || '').trim().toLowerCase() === 'cardlink@yahoo.com' &&
    String(product?.affiliateSalesPage || '').trim() === CARDLINK_PUBLIC_URL &&
    String(product?.affiliateDescription || '').includes(CARDLINK_AFFILIATE_MATERIALS_URL);
}

async function configureAffiliateProgram(product) {
  if (affiliateConfigurationMatches(product)) return product;

  await caktoRequest(`/products/${encodeURIComponent(product.id)}/`, {
    method: 'PUT',
    body: {
      name: String(product.name || 'CardLink PRO'),
      description: String(product.description || CARDLINK_PRODUCT_DESCRIPTION),
      price: String(product.price || '12.90'),
      affiliate: true,
      affiliateRequest: true,
      affiliateCommission: '30.00',
      affiliateDescription: CARDLINK_AFFILIATE_DESCRIPTION,
      affiliateSupportEmail: 'cardlink@yahoo.com',
      affiliateMarketplace: true,
      affiliateSalesPage: CARDLINK_PUBLIC_URL
    }
  });
  console.log(`✅ Cakto: programa de afiliados configurado no produto CardLink (produto=${product.id}).`);
  return caktoRequest(`/products/${encodeURIComponent(product.id)}/`);
}

async function performCatalogSync({ createAnnual = false, configureAffiliates = false } = {}) {
  const { clientId, clientSecret } = apiCredentials();
  catalogState.configured = Boolean(clientId && clientSecret);
  if (!catalogState.configured) {
    return { ...catalogState };
  }

  const productsBody = await caktoRequest('/products/?search=CardLink&status=active&limit=100');
  const product = selectCardLinkProduct(resultsOf(productsBody));
  let productDetails = await caktoRequest(`/products/${encodeURIComponent(product.id)}/`);
  let affiliateConfigurationError = null;
  if (configureAffiliates) {
    try {
      productDetails = await configureAffiliateProgram(productDetails);
    } catch (error) {
      affiliateConfigurationError = String(error.message || 'Falha ao configurar afiliados').substring(0, 300);
      console.error(`❌ Cakto: configuração de afiliados não aplicada: ${affiliateConfigurationError}`);
    }
  }

  const offersBody = await caktoRequest(`/offers/?product=${encodeURIComponent(product.id)}&status=active&limit=100`);
  const offers = resultsOf(offersBody);
  const monthlyOffer = offers.find(isMonthlyOffer);
  let annualOffer = offers.find(isAnnualOffer);

  if (!annualOffer && createAnnual) {
    annualOffer = await caktoRequest('/offers/', {
      method: 'POST',
      body: {
        name: 'CardLink Anual',
        price: 99,
        product: product.id,
        units: 1,
        status: 'active',
        type: 'subscription',
        intervalType: 'year',
        interval: 1,
        recurrence_period: 365,
        quantity_recurrences: -1,
        trial_days: 0,
        max_retries: 3,
        retry_interval: 1
      }
    });
    console.log(`✅ Cakto: oferta anual criada para o produto CardLink (oferta=${annualOffer.id}).`);
  }

  let webhookConfigured = null;
  try {
    const webhooksBody = await caktoRequest(`/webhook/?products=${encodeURIComponent(product.id)}&status=active&limit=100`);
    webhookConfigured = resultsOf(webhooksBody).some(webhook =>
      Array.isArray(webhook.products) && webhook.products.some(item => item?.id === product.id)
    );
  } catch (error) {
    // A chave pode não ter o escopo read webhooks. Isso não deve impedir os checkouts.
    console.warn(`⚠️ Cakto: não foi possível conferir o webhook existente: ${error.message}`);
  }

  catalogState = {
    configured: true,
    ready: Boolean((monthlyOffer || catalogState.monthlyCheckoutUrl) && annualOffer),
    productId: String(productDetails.id || product.id || ''),
    productShortId: String(productDetails.short_id || product.short_id || ''),
    productName: String(productDetails.name || product.name || ''),
    monthlyCheckoutUrl: offerCheckoutUrl(monthlyOffer) || catalogState.monthlyCheckoutUrl,
    annualCheckoutUrl: offerCheckoutUrl(annualOffer) || catalogState.annualCheckoutUrl,
    webhookConfigured,
    affiliateEnabled: Boolean(productDetails.affiliate),
    affiliateApprovalRequired: Boolean(productDetails.affiliateRequest),
    affiliateCommission: productDetails.affiliateCommission ?? null,
    affiliateMarketplace: Boolean(productDetails.affiliateMarketplace),
    affiliateConfigurationError,
    hasAffiliateDescription: Boolean(String(productDetails.affiliateDescription || '').trim()),
    hasAffiliateSupportEmail: Boolean(String(productDetails.affiliateSupportEmail || '').trim()),
    hasAffiliateSalesPage: Boolean(String(productDetails.affiliateSalesPage || '').trim()),
    hasProductImage: Boolean(String(productDetails.image || '').trim()),
    hasSalesPage: Boolean(String(productDetails.salesPage || '').trim()),
    affiliateSalesPageUrl: String(productDetails.affiliateSalesPage || '').trim(),
    salesPageUrl: String(productDetails.salesPage || '').trim(),
    productCategory: String(
      (typeof product.category === 'object' ? product.category?.name : productDetails.category) || ''
    ),
    lastSyncAt: new Date().toISOString()
  };

  return { ...catalogState };
}

function syncCaktoCatalog(options = {}) {
  if (!syncPromise) {
    syncPromise = performCatalogSync(options).finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

function getPublicCatalogState() {
  return {
    configured: catalogState.configured,
    ready: catalogState.ready,
    productId: catalogState.productId,
    productShortId: catalogState.productShortId,
    productName: catalogState.productName,
    monthlyCheckoutUrl: catalogState.monthlyCheckoutUrl,
    annualCheckoutUrl: catalogState.annualCheckoutUrl,
    webhookConfigured: catalogState.webhookConfigured,
    affiliateEnabled: catalogState.affiliateEnabled,
    affiliateApprovalRequired: catalogState.affiliateApprovalRequired,
    affiliateCommission: catalogState.affiliateCommission,
    affiliateMarketplace: catalogState.affiliateMarketplace,
    affiliateConfigurationError: catalogState.affiliateConfigurationError,
    hasAffiliateDescription: catalogState.hasAffiliateDescription,
    hasAffiliateSupportEmail: catalogState.hasAffiliateSupportEmail,
    hasAffiliateSalesPage: catalogState.hasAffiliateSalesPage,
    hasProductImage: catalogState.hasProductImage,
    hasSalesPage: catalogState.hasSalesPage,
    affiliateSalesPageUrl: catalogState.affiliateSalesPageUrl,
    salesPageUrl: catalogState.salesPageUrl,
    productCategory: catalogState.productCategory,
    lastSyncAt: catalogState.lastSyncAt
  };
}

function resetForTests() {
  tokenCache = null;
  syncPromise = null;
  catalogState = {
    configured: false,
    ready: false,
    productId: '',
    productShortId: '',
    productName: '',
    monthlyCheckoutUrl: process.env.CAKTO_MONTHLY_CHECKOUT_URL || DEFAULT_MONTHLY_CHECKOUT_URL,
    annualCheckoutUrl: process.env.CAKTO_ANNUAL_CHECKOUT_URL || '',
    webhookConfigured: null,
    affiliateEnabled: false,
    affiliateApprovalRequired: false,
    affiliateCommission: null,
    affiliateMarketplace: false,
    affiliateConfigurationError: null,
    hasAffiliateDescription: false,
    hasAffiliateSupportEmail: false,
    hasAffiliateSalesPage: false,
    hasProductImage: false,
    hasSalesPage: false,
    affiliateSalesPageUrl: '',
    salesPageUrl: '',
    productCategory: '',
    lastSyncAt: null
  };
}

module.exports = {
  syncCaktoCatalog,
  getPublicCatalogState,
  _resetForTests: resetForTests
};
