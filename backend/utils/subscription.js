// Modelo vigente (decisão de 13/10/2026): versão única gratuita, com TODOS os
// recursos liberados. O plano 'pro' permanece apenas como selo visual
// (3 estrelinhas), sem qualquer diferença funcional.
//
// Importante: não reintroduzir gating por plano sem uma nova decisão registrada.
// A checagem de acesso abaixo valida somente a situação da conta (suspensa ou não).

function hasActiveCustomerAccess(user) {
  if (!user || user.is_admin) return false;
  return (user.account_status || 'active') === 'active';
}

// Todos os clientes ativos têm acesso completo. Mantido como ponto único para
// que eventuais travas futuras (ex.: abuso) tenham um lugar explícito.
function hasFullAccess(user) {
  return hasActiveCustomerAccess(user);
}

// Usado apenas para exibição de status/selo e métricas administrativas.
function isProCustomer(user) {
  return hasActiveCustomerAccess(user) && user.plan === 'pro';
}

function isInternalTestAccount(user) {
  return !!(user && !user.is_admin && user.is_test_account && user.subscription_source === 'internal_test');
}

module.exports = { hasActiveCustomerAccess, hasFullAccess, isProCustomer, isInternalTestAccount };
