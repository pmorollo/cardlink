if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-only-insecure-secret')) {
  console.error('❌ ERRO CRÍTICO DE SEGURANÇA: A variável de ambiente JWT_SECRET não está definida ou é insegura em produção!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'pedro.morollo@yahoo.com,pedro.morollo@yahoo.com.br,pedro.morollo@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized) || 
         normalized === 'pedro.morollo@yahoo.com' || 
         normalized === 'pedro.morollo@yahoo.com.br' || 
         normalized === 'pedro.morollo@gmail.com';
}

module.exports = { JWT_SECRET, ADMIN_EMAILS, isAdminEmail };