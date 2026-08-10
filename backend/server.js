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

console.log('[DIAG] CAKTO_SECRET presente:', !!process.env.CAKTO_SECRET, '| valor:', JSON.stringify(process.env.CAKTO_SECRET || null));
console.log('[DIAG] NODE_ENV:', JSON.stringify(process.env.NODE_ENV));
console.log('[DIAG] ADMIN_EMAILS:', JSON.stringify(process.env.ADMIN_EMAILS || null));
console.log('[DIAG] JWT_SECRET presente:', !!process.env.JWT_SECRET);

const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/cards');
const contactRoutes = require('./routes/contacts');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const { adminRouter, supportRouter } = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const { cards: cardRepo, contacts: contactRepo, users: userRepo } = require('./db/repository');
const { sendEmail } = require('./utils/email');

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
app.use('/api/payments', apiLimiter, paymentRoutes);

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

// QR Code WhatsApp redirect route
app.get('/site/:slug/qr-whatsapp', async (req, res) => {
  try {
    const card = await cardRepo.findBySlug(req.params.slug);
    if (!card) {
      return res.status(404).send('Cartão não encontrado');
    }

    // Check if card owner is active (PRO/Admin)
    const owner = await userRepo.findById(card.user_id);
    const isOwnerPro = owner && (owner.plan === 'pro' || owner.is_admin);
    if (!isOwnerPro) {
      return res.redirect(`/site/${card.slug}`);
    }

    // Increment view count
    await cardRepo.update(card.id, { views_count: (card.views_count || 0) + 1 });

    // Insert an anonymous scan record in the contacts table
    await contactRepo.insert({
      card_id: card.id,
      name: 'Visitante (QR Code)',
      email: '',
      phone: 'Via Balcão',
      message: 'Escaneou o seu QR Code físico/balcão para falar no WhatsApp.'
    });

    // Get owner to send notification email (already fetched above)
    if (owner && owner.email) {
      try {
        await sendEmail({
          to: owner.email,
          subject: '🎉 Alguém escaneou seu QR Code do CardLink!',
          text: `Olá, ${owner.name}! Um cliente acabou de escanear o QR Code de balcão do seu CardLink para falar com você no WhatsApp.`
        });
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail de notificação de QR:', emailErr);
      }
    }

    // Clean up phone number for WhatsApp redirect
    const cleanPhone = (card.whatsapp || card.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      return res.redirect(`/site/${card.slug}`);
    }

    const text = encodeURIComponent('Olá! Escaneei o seu QR Code do CardLink e gostaria de tirar uma dúvida.');
    res.redirect(`https://wa.me/${cleanPhone}?text=${text}`);
  } catch (err) {
    console.error('Error on QR redirect:', err);
    res.redirect('/');
  }
});

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

// Função para garantir que os e-mails em ADMIN_EMAILS tenham plano 'pro' e is_admin = true
async function ensureAdmins() {
  try {
    const { ADMIN_EMAILS } = require('./config');
    const { users } = require('./db/repository');
    if (ADMIN_EMAILS && ADMIN_EMAILS.length > 0) {
      for (const email of ADMIN_EMAILS) {
        const user = await users.findByEmail(email);
        if (user) {
          if (user.plan !== 'pro' || !user.is_admin) {
            console.log(`[Startup] Atualizando privilégios do admin: ${email}`);
            await users.update(user.id, { plan: 'pro', is_admin: true });
          }
        }
      }
    }
  } catch (err) {
    console.error('[Startup] Erro ao garantir privilégios de administrador:', err);
  }
}

module.exports = app;

if (require.main === module) {
  ensureAdmins().then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  });
}
