if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-only-insecure-secret')) {
  console.error('❌ ERRO CRÍTICO DE SEGURANÇA: A variável de ambiente JWT_SECRET não está definida ou é insegura em produção!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-insecure-secret');


module.exports = { JWT_SECRET };
