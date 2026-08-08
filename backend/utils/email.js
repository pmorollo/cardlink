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
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Nodemailer SMTP configurado com sucesso!');
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
