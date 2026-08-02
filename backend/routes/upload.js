const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');

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

// Multer storage: memory if R2, disk if local
const storage = isR2Configured() && S3Client
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, '..', 'uploads'),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.webp';
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase() || '.webp');
    const mimeOk = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPG, PNG, GIF, WebP) são aceitas'));
    }
  }
});

router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    if (isR2Configured() && S3Client) {
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });

      const ext = path.extname(req.file.originalname).toLowerCase() || '.webp';
      const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      const bucketName = process.env.R2_BUCKET || 'cardlink-uploads';

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || 'image/webp',
      });

      await s3.send(command);

      const publicBaseUrl = process.env.R2_PUBLIC_URL
        ? process.env.R2_PUBLIC_URL.replace(/\/$/, '')
        : `https://${bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

      const url = `${publicBaseUrl}/${filename}`;
      return res.json({ url });
    } else {
      // Local file fallback
      const url = '/uploads/' + req.file.filename;
      return res.json({ url });
    }
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ error: 'Erro ao salvar a imagem: ' + err.message });
  }
});

module.exports = router;
