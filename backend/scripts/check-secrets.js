#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateProductionEnv } = require('../utils/env-security');

const ROOT = path.join(__dirname, '..', '..');
const FORBIDDEN_EXT = new Set(['.pem', '.key', '.p12', '.pfx']);
const ALLOWED_ENV = new Set(['.env.example']);
const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const base = path.basename(file);
  const ext = path.extname(base).toLowerCase();
  if (base.startsWith('.env') && !ALLOWED_ENV.has(base)) violations.push(`${rel} (arquivo de ambiente real)`);
  if (rel === 'backend/db/data.json') violations.push(`${rel} (banco local com dados)`);
  if (FORBIDDEN_EXT.has(ext)) violations.push(`${rel} (chave/certificado privado)`);
}

console.log('CARDLINK — AUDITORIA DE SEGREDOS');
if (violations.length) {
  console.error('\n❌ Arquivos proibidos encontrados:');
  violations.forEach(v => console.error(`- ${v}`));
  process.exitCode = 1;
} else {
  console.log('✅ Nenhum .env real, banco local ou chave privada encontrado no projeto exportável.');
}

if (process.env.NODE_ENV === 'production') {
  try {
    const result = validateProductionEnv({ strict: true });
    result.warnings.forEach(w => console.warn(`⚠️ ${w}`));
    console.log('✅ Variáveis obrigatórias de produção passaram na validação.');
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exitCode = 1;
  }
} else {
  console.log('ℹ️ Validação de valores de produção é executada quando NODE_ENV=production.');
}
