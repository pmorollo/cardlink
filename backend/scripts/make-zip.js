const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const sourceDir = path.resolve(__dirname, '..', '..');
const defaultZipPath = path.join(os.homedir(), 'Downloads', 'CardLink-export-seguro.zip');
const zipPath = path.resolve(process.argv[2] || defaultZipPath);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cardlink-clean-export-'));

const BLOCKED_DIRS = new Set([
  'node_modules',
  '.git',
  '.system_generated',
  'tasks',
  '.vscode',
  '.idea',
  '.next',
  'dist',
  'coverage'
]);

const BLOCKED_FILE_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'data.json'
]);

const BLOCKED_EXTENSIONS = new Set([
  '.pem', '.key', '.p12', '.pfx', '.crt', '.cer', '.sqlite', '.db',
  '.zip', '.rar', '.7z'
]);

function normalizeRel(filePath) {
  return path.relative(sourceDir, filePath).split(path.sep).join('/');
}

function isEnvSecret(name) {
  if (name === '.env.example') return false;
  return name === '.env' || name.startsWith('.env.');
}

function shouldBlock(src) {
  const stat = fs.statSync(src);
  const name = path.basename(src);
  const rel = normalizeRel(src);

  if (stat.isDirectory()) {
    return BLOCKED_DIRS.has(name);
  }

  if (isEnvSecret(name)) return true;
  if (BLOCKED_FILE_NAMES.has(name)) return true;
  if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) return true;

  if (/\.log(?:\.|$)/i.test(name) || /npm-debug\.log/i.test(name)) return true;
  if (/^(?:server\.log|debug\.log)/i.test(name)) return true;

  // Dados locais e uploads não devem integrar pacotes de entrega.
  if (/^backend\/db\/.*\.(?:json|sqlite|db)$/i.test(rel)) return true;
  if (/^backend\/uploads\//i.test(rel) && name !== '.gitkeep') return true;

  return false;
}

function copySafe(src, dest) {
  if (shouldBlock(src)) {
    console.log(`   ↳ ignorado: ${normalizeRel(src)}`);
    return;
  }

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copySafe(path.join(src, item), path.join(dest, item));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function auditExport(exportDir) {
  const violations = [];
  for (const file of walk(exportDir)) {
    const rel = path.relative(exportDir, file).split(path.sep).join('/');
    const name = path.basename(file);
    if (isEnvSecret(name)) violations.push(rel);
    if (BLOCKED_FILE_NAMES.has(name)) violations.push(rel);
    if (BLOCKED_EXTENSIONS.has(path.extname(name).toLowerCase())) violations.push(rel);
    if (/^backend\/db\/.*\.(?:json|sqlite|db)$/i.test(rel)) violations.push(rel);
    if (/^backend\/uploads\//i.test(rel) && name !== '.gitkeep') violations.push(rel);
  }

  const unique = [...new Set(violations)];
  if (unique.length) {
    throw new Error(`Exportação bloqueada. Arquivos sensíveis detectados:\n- ${unique.join('\n- ')}`);
  }
}

function createZip(exportDir, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) fs.unlinkSync(destination);

  if (process.platform === 'win32') {
    try {
      execFileSync('tar', ['-a', '-cf', destination, '.'], {
        cwd: exportDir,
        stdio: 'inherit',
        shell: true
      });
      return;
    } catch (_) {
      execFileSync('powershell', [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${exportDir}\\*' -DestinationPath '${destination}' -Force`
      ], { stdio: 'inherit' });
      return;
    }
  }

  // Linux/macOS: usa o utilitário zip quando disponível.
  execFileSync('zip', ['-qr', destination, '.'], { cwd: exportDir, stdio: 'inherit' });
}

try {
  console.log('1. Copiando projeto com filtros de segurança...');
  copySafe(sourceDir, tempDir);

  console.log('2. Auditando conteúdo antes da compactação...');
  auditExport(tempDir);

  console.log('3. Criando ZIP seguro em: ' + zipPath);
  createZip(tempDir, zipPath);

  if (!fs.existsSync(zipPath)) {
    throw new Error('ZIP não foi encontrado após a compactação.');
  }

  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Exportação segura concluída: ${zipPath} (${sizeMb} MB)`);
} catch (error) {
  console.error('❌ Falha na exportação segura:', error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
