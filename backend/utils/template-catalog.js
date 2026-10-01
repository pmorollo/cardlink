// Catálogo estático dos templates, usado como fallback quando não há
// Postgres configurado (modo local/teste) e como fonte única de verdade
// para validar um template_key recebido da API.
//
// IMPORTANTE: `structure_json.sections` não é cosmético — é a ordem real
// em que a página pública monta as seções opcionais (ver
// frontend/app-builder.js, função resolveSectionOrder/renderCard). Seções
// fixas (cabeçalho, formulário de contato, rodapé) não entram nesta lista
// porque não variam por template.
const TEMPLATE_CATALOG = [
  {
    template_key: 'institucional',
    name: 'Institucional',
    emoji: '🏛️',
    description: 'Para negócios que priorizam credibilidade: informações de contato logo após a apresentação, produtos e galeria depois.',
    theme_key: 'institucional',
    structure_json: { sections: ['description', 'info', 'social', 'products', 'gallery', 'testimonials'] },
    active: true
  },
  {
    template_key: 'pessoal',
    name: 'Pessoal',
    emoji: '👤',
    description: 'Para marca pessoal e portfólio: redes sociais e depoimentos aparecem antes de produtos, já que o destaque é a pessoa.',
    theme_key: 'pessoal',
    structure_json: { sections: ['description', 'social', 'testimonials', 'gallery', 'products', 'info'] },
    active: true
  },
  {
    template_key: 'profissional',
    name: 'Profissional',
    emoji: '💼',
    description: 'Modelo equilibrado padrão, com o botão de ação em destaque logo após a descrição.',
    theme_key: 'profissional',
    structure_json: { sections: ['description', 'cta', 'social', 'info', 'products', 'gallery', 'testimonials'] },
    active: true
  },
  {
    template_key: 'comercial',
    name: 'Comercial',
    emoji: '🛍️',
    description: 'Para quem vende produtos: vitrine e galeria aparecem imediatamente após o cabeçalho, antes mesmo da descrição.',
    theme_key: 'comercial',
    structure_json: { sections: ['products', 'gallery', 'description', 'testimonials', 'info', 'social'] },
    active: true
  }
];

// Ordem padrão (igual ao comportamento anterior a esta feature), usada
// quando um cartão não tem template_key ou tem um valor desconhecido —
// garante que cartões antigos continuem renderizando exatamente como antes.
const DEFAULT_SECTION_ORDER = ['description', 'cta', 'social', 'info', 'products', 'gallery', 'testimonials'];

function getTemplateByKey(key) {
  if (!key) return null;
  return TEMPLATE_CATALOG.find(t => t.template_key === key && t.active) || null;
}

function getSectionOrder(key) {
  const template = getTemplateByKey(key);
  return (template && Array.isArray(template.structure_json?.sections) && template.structure_json.sections.length)
    ? template.structure_json.sections
    : DEFAULT_SECTION_ORDER;
}

module.exports = { TEMPLATE_CATALOG, DEFAULT_SECTION_ORDER, getTemplateByKey, getSectionOrder };
