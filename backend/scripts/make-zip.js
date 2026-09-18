const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.resolve(__dirname, '..', '..');
const zipPath = 'C:\\Users\\pedro\\Downloads\\cardlink.zip';
const tempDir = path.join(process.env.TEMP || 'C:\\TEMP', 'cardlink-clean-export');

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

function copySafe(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const name = path.basename(src);
    if (name === 'node_modules' || name === '.git' || name === '.system_generated' || name === 'tasks') {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copySafe(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('1. Copiando arquivos do projeto (ignorando node_modules e .git)...');
copySafe(sourceDir, tempDir);

console.log('2. Criando arquivo zip em: ' + zipPath);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Windows native tar creates .zip directly: tar -a -cf destination.zip *
try {
  execSync(`tar -a -cf "${zipPath}" *`, { cwd: tempDir, stdio: 'inherit' });
} catch (e) {
  // Fallback to powershell
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
}

fs.rmSync(tempDir, { recursive: true, force: true });

if (fs.existsSync(zipPath)) {
  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Sucesso! Arquivo gerado em Downloads: ${zipPath} (${sizeMb} MB)`);
} else {
  console.error('❌ Falha ao encontrar o arquivo zip gerado.');
}
