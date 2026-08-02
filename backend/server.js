try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/cards');
const contactRoutes = require('./routes/contacts');
const uploadRoutes = require('./routes/upload');

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
    // Always allow requests without origin (curl, same-origin, server-to-server)
    if (!origin) return cb(null, true);

    const corsEnv = process.env.CORS_ORIGIN;
    if (!corsEnv || corsEnv === '*') return cb(null, true);

    const allowed = corsEnv.split(',').map(o => o.trim());
    if (allowed.includes(origin) || origin.endsWith('.railway.app') || origin.includes('localhost')) {
      return cb(null, true);
    }

    return cb(null, true); // Allow all web origins
  },
  credentials: true
}));

// ─── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────
// Auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API: 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cards', apiLimiter, cardRoutes);
app.use('/api', apiLimiter, contactRoutes);
app.use('/api/upload', apiLimiter, uploadRoutes);

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
app.use(express.static(path.join(__dirname, '..')));

// Landing page route — serves landing.html for /site/:slug
app.get('/site/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'landing.html'));
});

// SPA catch-all — serves index.html for everything else
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Erro no servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
