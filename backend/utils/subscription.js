function hasActiveCustomerAccess(user) {
  if (!user || user.is_admin) return false;
  if (user.trial_ends_at && new Date() > new Date(user.trial_ends_at)) {
    return false;
  }
  const accountActive = (user.account_status || 'active') === 'active';
  const subscriptionActive = (user.subscription_status || 'active') === 'active';
  if (!accountActive || !subscriptionActive) return false;

  return user.plan === 'free' || user.plan === 'pro';
}

function isProCustomer(user) {
  return hasActiveCustomerAccess(user) && user.plan === 'pro';
}

function isInternalTestAccount(user) {
  return !!(user && !user.is_admin && user.is_test_account && user.subscription_source === 'internal_test');
}

module.exports = { hasActiveCustomerAccess, isProCustomer, isInternalTestAccount };
