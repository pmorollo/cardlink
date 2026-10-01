process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TEMPLATE_CATALOG, DEFAULT_SECTION_ORDER, getTemplateByKey, getSectionOrder } = require('../utils/template-catalog');

test('catálogo tem os 4 templates esperados, cada um com estrutura própria', () => {
  const keys = TEMPLATE_CATALOG.map(t => t.template_key).sort();
  assert.deepEqual(keys, ['comercial', 'institucional', 'pessoal', 'profissional']);

  // A exigência central desta feature: cada template precisa ter uma ORDEM
  // DE SEÇÕES diferente dos outros — não só uma cor diferente. Se dois
  // templates tiverem exatamente a mesma ordem, a feature voltou a ser só
  // um tema de cor disfarçado de template.
  const orders = TEMPLATE_CATALOG.map(t => JSON.stringify(t.structure_json.sections));
  assert.equal(new Set(orders).size, orders.length, 'cada template deve ter uma ordem de seções distinta');
});

test('getTemplateByKey resolve um template válido e ignora um inexistente', () => {
  const comercial = getTemplateByKey('comercial');
  assert.ok(comercial);
  assert.equal(comercial.theme_key, 'comercial');
  assert.equal(comercial.structure_json.sections[0], 'products');

  assert.equal(getTemplateByKey('nao-existe'), null);
  assert.equal(getTemplateByKey(''), null);
  assert.equal(getTemplateByKey(undefined), null);
});

test('getSectionOrder cai na ordem padrão (comportamento anterior) quando não há template_key', () => {
  assert.deepEqual(getSectionOrder(''), DEFAULT_SECTION_ORDER);
  assert.deepEqual(getSectionOrder('template-que-nao-existe'), DEFAULT_SECTION_ORDER);
});

test('comercial mostra produtos antes da descrição; institucional faz o oposto', () => {
  const comercial = getSectionOrder('comercial');
  const institucional = getSectionOrder('institucional');
  assert.ok(comercial.indexOf('products') < comercial.indexOf('description'));
  assert.ok(institucional.indexOf('description') < institucional.indexOf('products'));
});
