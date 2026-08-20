const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
});

test('envia pelo Resend via HTTPS quando RESEND_API_KEY está configurada', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'CardLink <cardlink@example.com>';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) };
  };

  const { sendEmail } = require('../utils/email');
  const result = await sendEmail({
    to: 'destino@example.com',
    subject: 'Teste',
    text: 'Mensagem de teste',
    html: '<p>Mensagem de teste</p>',
  });

  assert.equal(result.provider, 'resend');
  assert.equal(result.messageId, 'email_123');
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(JSON.parse(request.options.body), {
    from: 'CardLink <cardlink@example.com>',
    to: 'destino@example.com',
    subject: 'Teste',
    html: '<p>Mensagem de teste</p>',
    text: 'Mensagem de teste',
  });
});

test('propaga uma mensagem clara quando o Resend recusa o envio', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'cardlink@example.com';
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: 'domínio não autorizado' }),
  });

  const { sendEmail } = require('../utils/email');
  await assert.rejects(
    sendEmail({ to: 'destino@example.com', subject: 'Teste', text: 'Teste' }),
    /Resend recusou o envio: domínio não autorizado/
  );
});
