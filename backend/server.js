try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch(e) {}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

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
const { hasActiveCustomerAccess } = require('./utils/subscription');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ─── Security Headers (Helmet) ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow inline scripts in SPA
  crossOriginEmbedderPolicy: false
}));

// ─── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    const isSameOrigin = !origin;
    const corsEnv = process.env.CORS_ORIGIN;
    if (corsEnv === '*') {
      return cb(null, true);
    }
    if (isSameOrigin) {
      return cb(null, true);
    }
    const allowed = (corsEnv || '').split(',').map(o => o.trim()).filter(Boolean);
    const canonicalOrigins = ['https://cardlink.digitalnexoapp.com'];
    const ok = allowed.includes(origin) || canonicalOrigins.includes(origin) || origin.endsWith('.railway.app') || origin.includes('localhost');
    if (ok) {
      return cb(null, true);
    }
    return cb(new Error('Origem não permitida pelo CORS'));
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

    // Apenas cartões pertencentes a clientes PRO ficam ativos.
    const owner = await userRepo.findById(card.user_id);
    const isOwnerPro = hasActiveCustomerAccess(owner);
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

// Landing page route
app.get('/site/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'landing.html'));
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
  console.error(err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Erro no servidor' });
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
