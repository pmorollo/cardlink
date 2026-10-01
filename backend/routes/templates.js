const express = require('express');
const { templates: templateRepo } = require('../db/repository');
const { getTemplateByKey } = require('../utils/template-catalog');

const router = express.Router();

// Rotas públicas — a vitrine de templates é exibida antes de o usuário
// ter conta, dentro do próprio editor de criação do cartão.
router.get('/', async (req, res, next) => {
  try {
    const items = await templateRepo.allActive();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.get('/:key', async (req, res, next) => {
  try {
    const item = await templateRepo.findByKey(req.params.key) || getTemplateByKey(req.params.key);
    if (!item) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
