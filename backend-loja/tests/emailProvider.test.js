import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoEmail } from '../src/utils/email.js';

const envBrevo = {
  EMAIL_PROVIDER: 'brevo',
  EMAIL_FROM: 'contato@dlmodas.example',
  EMAIL_FROM_NAME: 'DLmodas',
  BREVO_API_KEY: 'test-api-key',
};

test('provedor HTTPS aceita envio sem expor a chave', async () => {
  let request;
  const service = criarServicoEmail(envBrevo, {
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ messageId: 'provider-message-id' }), { status: 201 });
    },
  });

  const result = await service.enviar('cliente@example.com', 'Confirme sua conta', '<p>123456</p>');

  assert.equal(service.provider, 'brevo');
  assert.equal(result.messageId, 'provider-message-id');
  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).to[0].email, 'cliente@example.com');
});

test('falha HTTP do provedor HTTPS nao confirma envio nem expoe a chave', async () => {
  const service = criarServicoEmail(envBrevo, {
    fetchImpl: async () => new Response(JSON.stringify({ code: 'temporary_error' }), { status: 503 }),
  });

  await assert.rejects(() => service.enviar('cliente@example.com', 'Confirme sua conta', '<p>123456</p>'), (error) => {
    assert.equal(error.code, 'EEMAIL_PROVIDER');
    assert.equal(error.status, 503);
    assert.doesNotMatch(error.message, /test-api-key/);
    return true;
  });
});

for (const [cenario, criarResposta] of [
  ['sem messageId', () => new Response(JSON.stringify({}), { status: 201 })],
  ['com messageId vazio', () => new Response(JSON.stringify({ messageId: '   ' }), { status: 201 })],
  ['com corpo vazio', () => new Response('', { status: 201 })],
  ['com JSON invalido', () => new Response('{', { status: 201 })],
]) {
  test(`resposta 2xx ${cenario} e falha sanitizada do provedor`, async () => {
    const service = criarServicoEmail(envBrevo, { fetchImpl: async () => criarResposta() });

    await assert.rejects(() => service.enviar('cliente@example.com', 'Confirme sua conta', '<p>123456</p>'), (error) => {
      assert.equal(error.code, 'EEMAIL_PROVIDER');
      assert.equal(error.status, 201);
      assert.doesNotMatch(error.message, /test-api-key/);
      return true;
    });
  });
}

test('Brevo nunca inicializa SMTP', async () => {
  let smtpChamado = false;
  const service = criarServicoEmail(envBrevo, {
    createTransport: () => {
      smtpChamado = true;
      throw new Error('SMTP nao deveria ser chamado');
    },
    fetchImpl: async () => new Response(JSON.stringify({ messageId: 'provider-message-id' }), { status: 201 }),
  });

  await service.enviar('cliente@example.com', 'Confirme sua conta', '<p>123456</p>');
  assert.equal(smtpChamado, false);
});

test('SMTP continua disponivel quando EMAIL_PROVIDER nao e informado', async () => {
  let options;
  let mail;
  const service = criarServicoEmail(
    {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'smtp-user@example.com',
      SMTP_PASS: 'smtp-password',
    },
    {
      createTransport: (config) => {
        options = config;
        return {
          sendMail: async (payload) => {
            mail = payload;
            return { messageId: 'smtp-message-id' };
          },
        };
      },
    },
  );

  const result = await service.enviar('cliente@example.com', 'Assunto', '<p>Mensagem</p>');

  assert.equal(service.provider, 'smtp');
  assert.equal(result.messageId, 'smtp-message-id');
  assert.equal(options.connectionTimeout, 12000);
  assert.equal(mail.to, 'cliente@example.com');
});
