const nodemailer = require('nodemailer');

const isSmtpConfigured = () => {
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

let transporter = null;

if (isSmtpConfigured()) {
  const host = String(process.env.SMTP_HOST || '').trim();
  const portStr = String(process.env.SMTP_PORT || '587').trim();
  const port = parseInt(portStr, 10);
  const secure = portStr === '465';
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
  console.log(`✅ Nodemailer SMTP configurado com sucesso! (Host: ${host}, Porto: ${port}, Secure: ${secure})`);
} else {
  console.warn('⚠️ SMTP não configurado. E-mails serão impressos no console do servidor.');
}

async function sendEmail({ to, subject, html, text }) {
  if (transporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
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
    // Fallback logger
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
