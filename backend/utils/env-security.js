const { URL } = require('url');

const PLACEHOLDER_RE = /(substitua|seu_|sua_|example|exemplo|changeme|change_me|dev-only|insecure|placeholder)/i;

function value(name) {
  return String(process.env[name] || '').trim();
}

function isPlaceholder(v) {
  return !v || PLACEHOLDER_RE.test(String(v));
}

function validHttpsUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && Boolean(u.hostname);
  } catch {
    return false;
  }
}

function validateProductionEnv({ strict = process.env.NODE_ENV === 'production' } = {}) {
  const errors = [];
  const warnings = [];

  const jwt = value('JWT_SECRET');
  if (!jwt || isPlaceholder(jwt)) {
    errors.push('JWT_SECRET ausente ou placeholder.');
  } else if (jwt.length < 64) {
    errors.push(`JWT_SECRET curto (${jwt.length} caracteres). Use pelo menos 64 caracteres aleatórios.`);
  }

  const db = value('DATABASE_URL');
  if (!/^postgres(ql)?:\/\//i.test(db)) {
    errors.push('DATABASE_URL deve apontar para PostgreSQL em produção. Fallback local não é permitido.');
  }

  const appUrl = value('PUBLIC_APP_URL') || 'https://cardlink.digitalnexoapp.com';
  if (!validHttpsUrl(appUrl)) {
    errors.push('PUBLIC_APP_URL deve ser uma URL HTTPS válida.');
  }

  const cors = value('CORS_ORIGIN');
  if (cors.includes('*')) {
    errors.push('CORS_ORIGIN não pode conter * em produção.');
  }
  if (cors && cors.split(',').some(v => v.trim() && !validHttpsUrl(v.trim()))) {
    errors.push('CORS_ORIGIN contém origem inválida ou sem HTTPS.');
  }

  const caktoSecret = value('CAKTO_SECRET');
  if (!caktoSecret || isPlaceholder(caktoSecret)) {
    errors.push('CAKTO_SECRET ausente ou placeholder; webhook de pagamentos não pode operar com segurança.');
  } else if (caktoSecret.length < 16) {
    warnings.push('CAKTO_SECRET parece curto; prefira um segredo longo e aleatório.');
  }

  const caktoClientId = value('CAKTO_CLIENT_ID');
  const caktoClientSecret = value('CAKTO_CLIENT_SECRET');
  if (Boolean(caktoClientId) !== Boolean(caktoClientSecret)) {
    errors.push('CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET devem ser configurados em conjunto.');
  } else if (!caktoClientId && !caktoClientSecret) {
    warnings.push('Cakto API sem credenciais: sincronização automática de catálogo/ofertas ficará desativada.');
  }

  const r2Values = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  const r2Configured = r2Values.filter(name => value(name)).length;
  if (r2Configured > 0 && r2Configured < r2Values.length) {
    errors.push('Cloudflare R2 está parcialmente configurado. Defina ACCOUNT_ID, ACCESS_KEY_ID e SECRET_ACCESS_KEY juntos.');
  } else if (r2Configured === 0) {
    warnings.push('Cloudflare R2 não configurado; uploads persistentes externos ficarão indisponíveis.');
  }

  if (!value('RESEND_API_KEY') && !value('SMTP_HOST')) {
    warnings.push('Nenhum provedor de e-mail configurado; notificações por e-mail ficarão desativadas.');
  }

  if (!value('GEMINI_API_KEY') && !value('NVIDIA_API_KEY')) {
    warnings.push('Nenhum provedor de IA configurado; assistente de textos ficará desativado.');
  }

  if (strict && errors.length) {
    const err = new Error(`Configuração de produção inválida:\n- ${errors.join('\n- ')}`);
    err.code = 'INVALID_PRODUCTION_ENV';
    err.validation = { errors, warnings };
    throw err;
  }

  return { errors, warnings };
}

module.exports = { validateProductionEnv, isPlaceholder };
