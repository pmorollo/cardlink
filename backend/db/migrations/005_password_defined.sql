-- Contas criadas pelo cadastro fluido (POST /api/onboarding/criar-cartao)
-- nascem sem senha escolhida pelo usuário. Esta coluna registra isso para
-- que o painel ofereça "Definir senha" (sem exigir senha atual) apenas
-- nesses casos. Contas existentes já têm senha própria: padrão TRUE.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_defined BOOLEAN NOT NULL DEFAULT TRUE;
