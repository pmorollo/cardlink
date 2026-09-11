function hasActiveCustomerAccess(user) {
  if (!user || user.is_admin) return false;
  if (user.trial_ends_at && new Date() > new Date(user.trial_ends_at)) {
    return false;
  }
  return user.plan === 'pro' &&
    (user.account_status || 'active') === 'active' &&
    (user.subscription_status || 'active') === 'active';
}

function isInternalTestAccount(user) {
  return !!(user && !user.is_admin && user.is_test_account && user.subscription_source === 'internal_test');
}

module.exports = { hasActiveCustomerAccess, isInternalTestAccount };
