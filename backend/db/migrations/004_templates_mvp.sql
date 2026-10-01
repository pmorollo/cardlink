-- Banco de templates com estrutura real (ordem de seções por modelo),
-- não apenas cor. Ver backend/utils/template-catalog.js para o catálogo
-- usado como fallback fora do Postgres, e frontend/app-builder.js para
-- a engine que lê `structure_json.sections` e monta a página pública
-- na ordem correspondente.

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  theme_key VARCHAR(50) NOT NULL,
  structure_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS template_key VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_cards_template_key ON cards(template_key);

-- Quatro modelos, cada um com uma ORDEM DE SEÇÕES diferente (não só cor).
-- "profissional" preserva a ordem que já era usada antes desta migração,
-- então cartões existentes sem template_key continuam idênticos.
INSERT INTO templates (template_key, name, emoji, description, theme_key, structure_json)
VALUES
  ('institucional', 'Institucional', '🏛️',
   'Para negócios que priorizam credibilidade: informações de contato logo após a apresentação, produtos e galeria depois.',
   'institucional',
   '{"sections":["description","info","social","products","gallery","testimonials"]}'::jsonb),
  ('pessoal', 'Pessoal', '👤',
   'Para marca pessoal e portfólio: redes sociais e depoimentos aparecem antes de produtos, já que o destaque é a pessoa.',
   'pessoal',
   '{"sections":["description","social","testimonials","gallery","products","info"]}'::jsonb),
  ('profissional', 'Profissional', '💼',
   'Modelo equilibrado padrão, com o botão de ação em destaque logo após a descrição.',
   'profissional',
   '{"sections":["description","cta","social","info","products","gallery","testimonials"]}'::jsonb),
  ('comercial', 'Comercial', '🛍️',
   'Para quem vende produtos: vitrine e galeria aparecem imediatamente após o cabeçalho, antes mesmo da descrição.',
   'comercial',
   '{"sections":["products","gallery","description","testimonials","info","social"]}'::jsonb)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  theme_key = EXCLUDED.theme_key,
  structure_json = EXCLUDED.structure_json,
  active = TRUE,
  updated_at = CURRENT_TIMESTAMP;
