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
const { adminRouter, supportRouter } = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();
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
    const ok = allowed.includes(origin) || origin.endsWith('.railway.app') || origin.includes('localhost');
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
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
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
app.use('/api/payments', paymentRoutes);

// Image proxy/streaming route
app.get('/uploads/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  const localFilePath = path.join(__dirname, 'uploads', filename);

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

// Landing page route
app.get('/site/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'landing.html'));
});

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
  });
}
