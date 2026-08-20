const nodemailer = require('nodemailer');
const RESEND_TIMEOUT_MS = 10_000;

function getFromAddress() {
  const configured = String(process.env.EMAIL_FROM || process.env.SMTP_FROM || '').trim();
  if (!configured) return '';
  return configured.includes('<') ? configured : `CardLink <${configured}>`;
}

function isResendConfigured() {
  return !!String(process.env.RESEND_API_KEY || '').trim();
}

async function sendWithResend({ to, subject, html, text }) {
  const from = getFromAddress();
  if (!from) {
    throw new Error('EMAIL_FROM ou SMTP_FROM precisa estar configurado para usar o Resend');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${String(process.env.RESEND_API_KEY).trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || payload.name || `HTTP ${response.status}`;
    throw new Error(`Resend recusou o envio: ${detail}`);
  }

  return { messageId: payload.id, provider: 'resend' };
}

function getTransporter() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    return null;
  }

  const portStr = String(process.env.SMTP_PORT || '587').trim();
  const port = parseInt(portStr, 10);
  const secure = portStr === '465';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendEmail({ to, subject, html, text }) {
  if (isResendConfigured()) {
    try {
      const info = await sendWithResend({ to, subject, html, text });
      console.log(`📧 E-mail enviado com sucesso para ${to}: ${info.messageId}`);
      return info;
    } catch (e) {
      console.error(`❌ Erro ao enviar e-mail para ${to}:`, e.message);
      throw e;
    }
  }

  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromEmail = getFromAddress() || `CardLink <${String(process.env.SMTP_USER || '').trim()}>`;
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });
      console.log(`📧 E-mail enviado com sucesso para ${to}: ${info.messageId}`);
      return info;
    } catch (e) {
      console.error(`❌ Erro ao enviar e-mail para ${to}:`, e.message);
      throw e;
    }
  } else {
    console.log(`
=========================================
📧 MOCK EMAIL DISPATCH
Para: ${to}
Assunto: ${subject}
Conteúdo (Texto): ${text}
=========================================
    `);
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }
}

module.exports = { sendEmail, isSmtpConfigured, isResendConfigured };
