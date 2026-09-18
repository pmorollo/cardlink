try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch(e) {}
const { validateProductionEnv } = require('./utils/env-security');

try {
  const envValidation = validateProductionEnv();
  if (process.env.NODE_ENV !== 'test') {
    envValidation.warnings.forEach(message => console.warn(`⚠️ Configuração: ${message}`));
  }
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('./utils/logger');

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET é obrigatório em produção. Configure a variável de ambiente.');
    process.exit(1);
  }
  console.warn('⚠️ JWT_SECRET não configurado. Usando segredo temporário somente para desenvolvimento.');
}

const uploadsDir = path.join(__dirname, 'uploads');
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });


const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/cards');
const contactRoutes = require('./routes/contacts');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const { adminRouter, supportRouter, messageRouter } = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const { syncCaktoCatalog } = require('./services/cakto');
const { cards: cardRepo, contacts: contactRepo, users: userRepo } = require('./db/repository');
const { sendEmail } = require('./utils/email');
const { hasActiveCustomerAccess, isProCustomer } = require('./utils/subscription');

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
const PORT = process.env.PORT || 3000;

// ─── Security Headers (Helmet) ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https://pay.cakto.com.br']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ─── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    const configured = String(process.env.CORS_ORIGIN || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const canonicalOrigins = new Set(['https://cardlink.digitalnexoapp.com', ...configured.filter(value => value !== '*')]);

    if (canonicalOrigins.has(origin)) return cb(null, true);

    // Em desenvolvimento local, libera apenas localhost/127.0.0.1 com porta opcional.
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }

    // CORS_ORIGIN=* não amplia produção; é aceito apenas em desenvolvimento explícito.
    if (process.env.NODE_ENV !== 'production' && configured.includes('*')) return cb(null, true);

    const err = new Error('Origem não permitida pelo CORS');
    err.status = 403;
    return cb(err);
  },
  credentials: true
}));

// ─── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 200,
  message: { error: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Routes ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptimeSeconds: Math.round(process.uptime()) });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cards', apiLimiter, cardRoutes);
app.use('/api', apiLimiter, contactRoutes);
app.use('/api/upload', apiLimiter, uploadRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/admin', apiLimiter, adminRouter);
app.use('/api/support', apiLimiter, supportRouter);
app.use('/api/messages', apiLimiter, messageRouter);
app.use('/api/payments', apiLimiter, paymentRoutes);

// Rotas /api desconhecidas não devem cair no SPA nem expor diagnósticos.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Image proxy/streaming route
app.get('/uploads/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const localFilePath = path.join(__dirname, 'uploads', safeFilename);

  if (fs.existsSync(localFilePath)) {
    return res.sendFile(localFilePath);
  }

  if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET || 'cardlink-uploads',
        Key: filename,
      });

      const data = await s3.send(command);
      res.setHeader('Content-Type', data.ContentType || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return data.Body.pipe(res);
    } catch (err) {
      console.error('R2 fetch error:', err.message);
    }
  }

  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// QR Code de balcão: contabiliza o scan e abre a página pública do CardLink.
// A rota antiga é mantida para que QRs já impressos continuem funcionando.
app.get(['/site/:slug/qr', '/site/:slug/qr-whatsapp'], async (req, res) => {
  try {
    const card = await cardRepo.findBySlug(req.params.slug);
    if (!card) {
      return res.status(404).send('Cartão não encontrado');
    }

    // O QR integrado/rastreável é um recurso Pro. Contas Free continuam com a página pública ativa.
    const owner = await userRepo.findById(card.user_id);
    const isOwnerPro = isProCustomer(owner);
    if (!isOwnerPro) {
      return res.redirect(`/site/${card.slug}`);
    }

    // O scan é uma métrica própria; a página pública contabiliza a visualização separadamente.
    await cardRepo.update(card.id, { qr_scans_count: (card.qr_scans_count || 0) + 1 });
    return res.redirect(`/site/${card.slug}`);
  } catch (err) {
    console.error('Error on QR redirect:', err);
    res.redirect('/');
  }
});

// Landing page route: disponível para Free e Pro ativos, com metadados SEO por cliente.
app.get('/site/:slug', async (req, res, next) => {
  try {
    const card = await cardRepo.findBySlug(req.params.slug);
    if (!card) return res.status(404).send('Cartão não encontrado');
    const owner = await userRepo.findById(card.user_id);
    if (!hasActiveCustomerAccess(owner)) return res.status(402).send('Página temporariamente indisponível');

    const escapeAttr = value => String(value || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const title = `${card.name || card.business || 'CardLink'} — ${card.business || 'Página profissional'}`;
    const description = String(card.description || card.message || `Página profissional de ${card.name || card.business || 'cliente CardLink'}`)
      .replace(/\s+/g, ' ').trim().slice(0, 160);
    const canonical = `${req.protocol}://${req.get('host')}/site/${encodeURIComponent(card.slug)}`;
    const templatePath = path.join(__dirname, '..', 'frontend', 'landing.html');
    let html = await fs.promises.readFile(templatePath, 'utf8');
    html = html
      .replace('<title>Carregando...</title>', `<title>${escapeAttr(title)}</title>`)
      .replace('<meta name="description" content="Landing page profissional criada com CardLink">', `<meta name="description" content="${escapeAttr(description)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">`);
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

// Kit público de divulgação para afiliados aprovados.
app.get('/afiliados', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'afiliados.html'));
});

// Entrada administrativa canônica. O SPA autentica e direciona para o painel admin.
app.get('/admin', (req, res) => res.redirect('/#admin'));

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    message: err.message || 'Erro no servidor',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
  res.status(status).json({ error: err.message || 'Erro no servidor', requestId: req.requestId });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    syncCaktoCatalog({ createAnnual: true })
      .then(state => {
        if (!state.configured) {
          console.warn('⚠️ Cakto API: credenciais não configuradas; sincronização ignorada.');
          return;
        }
        console.log(`✅ Cakto API sincronizada: checkouts=${state.ready ? 'prontos' : 'incompletos'}, webhook=${state.webhookConfigured === null ? 'não consultado' : state.webhookConfigured ? 'vinculado' : 'não vinculado'}.`);
      })
      .catch(error => console.error(`❌ Falha na sincronização Cakto: ${error.message}`));
  });
}
