process.env.NODE_ENV = 'test';

// renderCard() (frontend/app-builder.js) é código de navegador, sem
// module.exports — este teste carrega o arquivo num sandbox vm com um DOM
// mínimo simulado, só o suficiente para executar renderCard() sem lançar
// erro (ela não manipula o DOM, só monta e devolve uma string HTML).
//
// O que este teste garante de verdade: que a ordem das seções da página
// pública muda de fato por template (não é só decoração/cor) — é a prova
// de regressão para a feature de "templates reais" descrita em
// backend/utils/template-catalog.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function cleanWhatsapp(num) { return num ? String(num).replace(/\D/g, '') : ''; }

function loadRenderCard() {
  const sandbox = {
    console,
    window: { location: { origin: 'https://cardlink.digitalnexoapp.com' } },
    escapeHtml,
    cleanWhatsapp,
  };
  vm.createContext(sandbox);
  const builderSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'app-builder.js'), 'utf8');
  vm.runInContext(builderSrc, sandbox, { filename: 'app-builder.js' });
  return vm.runInContext('renderCard', sandbox);
}

function markerOrder(renderCard, templateKey) {
  const data = {
    name: 'Maria Teste',
    description: 'DESCRICAO_MARCADOR',
    phone: '11999999999',
    whatsapp: '11999999999',
    instagram: '@maria',
    products: [{ name: 'PRODUTO_MARCADOR', price: '10' }],
    testimonials: [{ name: 'Cliente', stars: 5, comment: 'DEPOIMENTO_MARCADOR' }],
    template_key: templateKey
  };
  const html = renderCard(data, true);
  // Um marcador por seção reordenável (description/cta/social/info/vitrine),
  // cada um só aparece dentro do bloco correspondente.
  const markers = ['DESCRICAO_MARCADOR', 'card-social-grid', 'Informações', 'PRODUTO_MARCADOR', 'DEPOIMENTO_MARCADOR'];
  return markers
    .map(m => ({ m, i: html.indexOf(m) }))
    .filter(x => x.i !== -1)
    .sort((a, b) => a.i - b.i)
    .map(x => x.m);
}

test('cada template produz uma ordem de seções diferente na página pública', () => {
  const renderCard = loadRenderCard();

  const institucional = markerOrder(renderCard, 'institucional');
  const comercial = markerOrder(renderCard, 'comercial');
  const pessoal = markerOrder(renderCard, 'pessoal');
  const profissional = markerOrder(renderCard, 'profissional');
  const semTemplate = markerOrder(renderCard, '');

  // Comercial: vitrine de produtos vem ANTES da descrição.
  assert.ok(comercial.indexOf('PRODUTO_MARCADOR') < comercial.indexOf('DESCRICAO_MARCADOR'),
    'template comercial deveria mostrar produtos antes da descrição');

  // Institucional: descrição/info vêm ANTES de produtos (oposto do comercial).
  assert.ok(institucional.indexOf('DESCRICAO_MARCADOR') < institucional.indexOf('PRODUTO_MARCADOR'),
    'template institucional deveria mostrar a descrição antes dos produtos');

  // Pessoal: depoimentos vêm ANTES de produtos (prioriza prova social sobre vitrine).
  assert.ok(pessoal.indexOf('DEPOIMENTO_MARCADOR') < pessoal.indexOf('PRODUTO_MARCADOR'),
    'template pessoal deveria mostrar depoimentos antes dos produtos');

  // Sem template_key (cartão antigo) deve se comportar exatamente como o
  // modelo "profissional" (ordem padrão pré-existente) — compatibilidade
  // com cartões já publicados antes desta feature.
  assert.deepEqual(semTemplate, profissional,
    'cartão sem template_key deve manter a ordem padrão de antes desta feature');

  // Nenhum dos quatro templates pode ter a mesma ordem exata de outro —
  // senão a feature voltou a ser só uma troca de cor.
  const orders = [institucional, comercial, pessoal, profissional].map(o => o.join('|'));
  assert.equal(new Set(orders).size, orders.length, 'cada template deve produzir uma ordem de seções distinta');
});
