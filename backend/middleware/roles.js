const { users } = require('../db/repository');
const { hasActiveCustomerAccess } = require('../utils/subscription');

async function requireAdmin(req, res, next) {
  try {
    const user = await users.findById(req.userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Acesso restrito ao administrador da plataforma' });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function requireCustomer(req, res, next) {
  try {
    const user = await users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (user.is_admin) {
      return res.status(403).json({
        error: 'admin_customer_separation',
        message: 'A conta administrativa não utiliza cartões ou recursos de assinante.'
      });
    }
    if (!hasActiveCustomerAccess(user)) {
      return res.status(402).json({
        error: 'subscription_required',
        message: 'É necessária uma assinatura CardLink ativa para acessar este recurso.'
      });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin, requireCustomer };
