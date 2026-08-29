const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { requireCustomer } = require('../middleware/roles');

const router = express.Router();

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

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
};

function safeImageExtension(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const originalExt = path.extname(file?.originalname || '').toLowerCase();
  const allowedExts = ALLOWED_IMAGE_TYPES[mime];
  if (!allowedExts || !allowedExts.has(originalExt)) return null;
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  return null;
}

// Multer storage: memory if R2, disk if local
const storage = isR2Configured() && S3Client
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, '..', 'uploads'),
      filename: (req, file, cb) => {
        const ext = safeImageExtension(file);
        if (!ext) return cb(new Error('Tipo de imagem inválido'));
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, fieldNestingDepth: 1 }, // 5MB + limites anti-DoS
  fileFilter: (req, file, cb) => {
    if (safeImageExtension(file)) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens JPG, PNG, GIF ou WebP válidas são aceitas'));
  }
});

router.post('/', authMiddleware, requireCustomer, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const ext = safeImageExtension(req.file);
    if (!ext) return res.status(400).json({ error: 'Tipo de imagem inválido' });
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;

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
        ContentType: req.file.mimetype || 'image/webp',
      });

      await s3.send(command);

      const url = '/uploads/' + filename;
      return res.json({ url });
    } else {
      // Local file fallback
      const url = '/uploads/' + (req.file.filename || filename);
      return res.json({ url });
    }
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao salvar a imagem: ' + err.message });
  }
});

module.exports = router;
