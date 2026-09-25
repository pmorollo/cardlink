const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { requireCustomer } = require('../middleware/roles');

const router = express.Router();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  message: { error: 'Limite de uploads atingido. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

const isR2Configured = () => {
  return (
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_ACCOUNT_ID
  );
};

let S3Client, PutObjectCommand;
if (isR2Configured()) {
  try {
    const s3Sdk = require('@aws-sdk/client-s3');
    S3Client = s3Sdk.S3Client;
    PutObjectCommand = s3Sdk.PutObjectCommand;
  } catch (e) {
    console.warn('⚠️ @aws-sdk/client-s3 não encontrado, usando upload local');
  }
}

const ALLOWED_UPLOAD_TYPES = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
  'application/pdf': new Set(['.pdf']),
};

function safeUploadExtension(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const originalExt = path.extname(file?.originalname || '').toLowerCase();
  const allowedExts = ALLOWED_UPLOAD_TYPES[mime];
  if (!allowedExts || !allowedExts.has(originalExt)) return null;
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  return null;
}

function buildUploadFilename(file) {
  const ext = safeUploadExtension(file);
  if (!ext) return null;
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

function detectedMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function readUploadBytes(file) {
  if (file.buffer) return file.buffer;
  if (file.path) {
    const fd = fs.openSync(file.path, 'r');
    try {
      const buffer = Buffer.alloc(16);
      const length = fs.readSync(fd, buffer, 0, buffer.length, 0);
      return buffer.subarray(0, length);
    } finally {
      fs.closeSync(fd);
    }
  }
  return Buffer.alloc(0);
}

function removeLocalUpload(file) {
  if (!file?.path) return;
  try { fs.unlinkSync(file.path); } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Falha ao remover upload recusado:', error.message);
  }
}

// Multer storage: memory if R2, disk if local
const storage = isR2Configured() && S3Client
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, '..', 'uploads'),
      filename: (req, file, cb) => {
        const name = buildUploadFilename(file);
        if (!name) return cb(new Error('Tipo de arquivo inválido'));
        cb(null, name);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 5, fieldNestingDepth: 1 }, // 15MB + limites anti-DoS
  fileFilter: (req, file, cb) => {
    if (safeUploadExtension(file)) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens (JPG, PNG, GIF, WebP) ou documentos PDF válidos são aceitos'));
  }
});

router.post('/', authMiddleware, requireCustomer, uploadLimiter, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const ext = safeUploadExtension(req.file);
    if (!ext) return res.status(400).json({ error: 'Tipo de arquivo inválido' });
    const isPdf = ext === '.pdf';
    if (isPdf && req.currentUser?.plan !== 'pro') {
      removeLocalUpload(req.file);
      return res.status(403).json({ error: 'O upload de catálogo em PDF está disponível exclusivamente no Plano Pro.' });
    }
    const realMime = detectedMime(readUploadBytes(req.file));
    if (realMime !== req.file.mimetype) {
      removeLocalUpload(req.file);
      return res.status(400).json({ error: 'O conteúdo do arquivo não corresponde ao tipo informado.' });
    }
    const filename = buildUploadFilename(req.file);

    if (isR2Configured() && S3Client) {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      const bucketName = process.env.R2_BUCKET || 'cardlink-uploads';

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || (isPdf ? 'application/pdf' : 'image/webp'),
        ContentDisposition: 'inline',
      });

      await s3.send(command);

      const url = '/uploads/' + filename;
      return res.json({ url, isPdf, originalName: req.file.originalname });
    } else {
      // Local file fallback
      const url = '/uploads/' + req.file.filename;
      return res.json({ url, isPdf, originalName: req.file.originalname });
    }
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao salvar o arquivo: ' + err.message });
  }
});

module.exports = router;
module.exports._test = { safeUploadExtension, buildUploadFilename, detectedMime };
