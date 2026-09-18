#!/usr/bin/env node
/* ==============================================================================
   CardLink — Script de Verificação e Diagnóstico de Infraestrutura de Produção
   Executa verificações não-destrutivas em:
   1. PostgreSQL (conectividade, tabelas, migrations)
   2. Cloudflare R2 (acesso e leitura do bucket)
   3. Provedores de E-mail (Resend / SMTP)
   4. Provedores de IA (Gemini / NVIDIA)
   5. Chaves de Segurança (JWT, Cakto Secret)
   ============================================================================== */

require('dotenv').config();
const { Pool } = require('pg');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { validateProductionEnv } = require('../utils/env-security');

console.log('\n========================================================');
console.log('🔍 CARDLINK — DIAGNÓSTICO DE INFRAESTRUTURA');
console.log(`⏰ Data/Hora: ${new Date().toISOString()}`);
console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log('========================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let warnings = 0;
let errors = 0;

async function checkSecurity() {
  totalChecks++;
  console.log('1️⃣  VERIFICAÇÃO DE SEGURANÇA & SEGREDOS');

  const envValidation = validateProductionEnv({ strict: false });
  if (process.env.NODE_ENV === 'production' && envValidation.errors.length) {
    envValidation.errors.forEach(message => console.log(`   ❌ Produção: ${message}`));
    errors += envValidation.errors.length;
  }
  envValidation.warnings.forEach(message => console.log(`   ⚠️  ${message}`));
  
  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt === 'dev-only-insecure-secret') {
    if (process.env.NODE_ENV === 'production') {
      console.log('   ❌ JWT_SECRET: Inseguro ou ausente para produção!');
      errors++;
    } else {
      console.log('   ⚠️  JWT_SECRET: Usando chave padrão de desenvolvimento.');
      warnings++;
    }
  } else if (jwt.length < 32) {
    console.log(`   ⚠️  JWT_SECRET: Definido, mas curto (${jwt.length} caracteres). Recomendado: >= 64 caracteres.`);
    warnings++;
  } else {
    console.log(`   ✅ JWT_SECRET: Forte e configurado (${jwt.length} caracteres).`);
    passedChecks++;
  }

  const caktoSecret = process.env.CAKTO_SECRET;
  if (caktoSecret) {
    console.log('   ✅ CAKTO_SECRET: Configurado para validação de webhooks.');
  } else {
    console.log('   ⚠️  CAKTO_SECRET: Não definido (webhooks da Cakto não serão autenticados).');
    warnings++;
  }
  console.log('');
}

async function checkPostgres() {
  totalChecks++;
  console.log('2️⃣  BANCO DE DADOS (PostgreSQL)');
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl || (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://'))) {
    console.log('   ℹ️  DATABASE_URL: Não configurado. O sistema usará o fallback local em backend/db/data.json.');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS server_time, current_database() AS db_name, version() AS pg_version;');
    console.log(`   ✅ Conexão com PostgreSQL estabelecida com sucesso!`);
    console.log(`      Banco: ${res.rows[0].db_name}`);
    console.log(`      Hora do Servidor: ${res.rows[0].server_time}`);

    // Verifica tabelas principais
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`      Tabelas existentes: ${tables.join(', ') || 'Nenhuma'}`);

    if (tables.includes('users') && tables.includes('cards')) {
      const counts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM cards) as cards_count,
          (SELECT COUNT(*) FROM contacts) as contacts_count;
      `);
      console.log(`      Registros: ${counts.rows[0].users_count} usuários | ${counts.rows[0].cards_count} cartões | ${counts.rows[0].contacts_count} contatos`);
    }

    client.release();
    passedChecks++;
  } catch (err) {
    console.log(`   ❌ Erro ao conectar no PostgreSQL: ${err.message}`);
    errors++;
  } finally {
    await pool.end().catch(() => {});
  }
  console.log('');
}

async function checkR2Storage() {
  totalChecks++;
  console.log('3️⃣  ARMAZENAMENTO CLOUDFLARE R2');
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET || 'cardlink-uploads';

  if (!accountId || !accessKey || !secretKey) {
    console.log('   ℹ️  Credenciais do R2 não configuradas por completo. O sistema salvará uploads localmente em backend/uploads/.');
    return;
  }

  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });

    const response = await s3.send(command);
    console.log(`   ✅ Conexão com Cloudflare R2 estabelecida com sucesso!`);
    console.log(`      Bucket: ${bucketName}`);
    console.log(`      Status HTTP: ${response.$metadata.httpStatusCode || 200}`);
    passedChecks++;
  } catch (err) {
    console.log(`   ❌ Falha ao acessar o bucket Cloudflare R2: ${err.message}`);
    errors++;
  }
  console.log('');
}

async function checkEmailService() {
  totalChecks++;
  console.log('4️⃣  SERVIÇO DE E-MAILS (Transacional / Notificações)');
  const resendKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (resendKey) {
    console.log('   ✅ Provedor Ativo: Resend (API Key configurada).');
    console.log(`      Remetente: ${process.env.EMAIL_FROM || 'Padrão CardLink'}`);
    passedChecks++;
  } else if (smtpHost) {
    console.log(`   ✅ Provedor Ativo: SMTP tradicional (${smtpHost}:${process.env.SMTP_PORT || 587}).`);
    passedChecks++;
  } else {
    console.log('   ⚠️  Nenhum provedor de e-mail configurado. E-mails serão apenas exibidos no log do console.');
    warnings++;
  }
  console.log('');
}

async function checkAI() {
  totalChecks++;
  console.log('5️⃣  ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL');
  const gemini = process.env.GEMINI_API_KEY;
  const nvidia = process.env.NVIDIA_API_KEY;

  if (gemini) {
    console.log(`   ✅ Provedor Principal: Google Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}).`);
    passedChecks++;
  }
  if (nvidia) {
    console.log(`   ✅ Provedor Secundário: NVIDIA Fallback (${process.env.NVIDIA_MODEL || 'nemotron'}).`);
  }
  if (!gemini && !nvidia) {
    console.log('   ℹ️  Chaves de IA não configuradas. O assistente de texto estará desativado.');
  }
  console.log('');
}

async function run() {
  await checkSecurity();
  await checkPostgres();
  await checkR2Storage();
  await checkEmailService();
  await checkAI();

  console.log('========================================================');
  console.log(`📊 RESUMO DO DIAGNÓSTICO:`);
  console.log(`   ✅ Verificações aprovadas: ${passedChecks}`);
  console.log(`   ⚠️  Avisos: ${warnings}`);
  console.log(`   ❌ Erros críticos: ${errors}`);
  console.log('========================================================\n');
}

run().catch(e => {
  console.error('Erro fatal no diagnóstico:', e);
  process.exit(1);
});
