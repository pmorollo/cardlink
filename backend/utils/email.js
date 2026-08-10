const nodemailer = require('nodemailer');

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
  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromEmail = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
      const info = await transporter.sendMail({
        from: `"CardLink" <${fromEmail}>`,
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

module.exports = { sendEmail, isSmtpConfigured };
