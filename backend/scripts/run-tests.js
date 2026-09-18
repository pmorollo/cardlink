#!/usr/bin/env node
/**
 * Executa a suíte de testes com um arquivo por invocação de `node --test`.
 *
 * Por quê: o test runner nativo do Node (isolamento padrão = 1 subprocesso
 * por arquivo, comunicando com o processo principal via serialização
 * estruturada) apresenta uma falha intermitente de deserialização
 * ("Unable to deserialize cloned data due to invalid or unsupported
 * version") observada nas versões de Node testadas neste projeto, mais
 * frequente em backend/test/smoke.test.js por ser o arquivo com mais
 * subtestes e mais saída de console.
 *
 * `--experimental-test-isolation=none` evita o subprocesso (e portanto a
 * falha), mas faz todos os arquivos passados numa mesma invocação
 * compartilharem processo — e módulos/variáveis de ambiente com estado
 * mutável entre arquivos de teste passam a se contaminar.
 *
 * Este script concilia os dois lados: cada arquivo continua isolado dos
 * outros (processo próprio do sistema operacional, via spawnSync — uma
 * única execução por arquivo), e dentro de cada processo o isolamento
 * interno do Node fica desativado (sem subprocesso, sem a falha de
 * serialização).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '..', 'test');

function encontrarArquivosDeTeste(dir) {
  const resultado = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultado.push(...encontrarArquivosDeTeste(caminho));
    } else if (entrada.isFile() && entrada.name.endsWith('.test.js')) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

const files = encontrarArquivosDeTeste(testDir).sort();

if (files.length === 0) {
  console.error(`Nenhum arquivo de teste encontrado em ${testDir}`);
  process.exit(1);
}

let totalTests = 0, totalPass = 0, totalFail = 0, totalSkip = 0;
let anyFailure = false;

for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  console.log(`\n=== ${relative} ===`);

  const result = spawnSync(
    process.execPath,
    ['--test', '--experimental-test-isolation=none', file],
    { encoding: 'utf8' }
  );

  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);

  const out = result.stdout || '';
  const grab = (label) => {
    const m = out.match(new RegExp(`^# ${label} (\\d+)`, 'm'));
    return m ? Number(m[1]) : 0;
  };
  totalTests += grab('tests');
  totalPass += grab('pass');
  totalFail += grab('fail');
  totalSkip += grab('skipped');

  if (result.status !== 0) anyFailure = true;
}

console.log('\n=== Resumo consolidado ===');
console.log(`tests=${totalTests} pass=${totalPass} fail=${totalFail} skipped=${totalSkip}`);

process.exit(anyFailure || totalFail > 0 ? 1 : 0);
