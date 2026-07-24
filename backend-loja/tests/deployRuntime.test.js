import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDatabaseConfig, parseCorsOrigins, parseTrustProxy, publicApiUrl, validateMercadoPagoConfiguration, validateRuntimeEnvironment } from '../src/config/runtime.js';
import { urlsCheckout } from '../src/routes/pagamentos.js';

test('runtime normaliza trust proxy e origens CORS', () => {
  assert.equal(parseTrustProxy(''), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('1'), 1);
  assert.throws(() => parseTrustProxy('loopback'));
  assert.deepEqual(parseCorsOrigins(' https://loja.test, https://admin.test '), ['https://loja.test', 'https://admin.test']);
});

test('Mercado Pago exige ambiente explicito e webhook usa URL publica sem barras duplicadas', () => {
  assert.equal(validateMercadoPagoConfiguration({
    MP_ENVIRONMENT: 'sandbox', MERCADO_PAGO_ACCESS_TOKEN: 'token', MERCADO_PAGO_WEBHOOK_SECRET: 'secret',
  }).environment, 'sandbox');
  assert.throws(() => validateMercadoPagoConfiguration({ MP_ENVIRONMENT: 'other' }));
  assert.equal(publicApiUrl({ PUBLIC_API_URL: 'https://api.loja.test///' }), 'https://api.loja.test');
  const oldFront = process.env.FRONT_URL;
  const oldPublic = process.env.PUBLIC_API_URL;
  const oldBack = process.env.BACKEND_URL;
  process.env.FRONT_URL = 'https://loja.test/';
  process.env.PUBLIC_API_URL = 'https://api.loja.test/';
  delete process.env.BACKEND_URL;
  assert.equal(urlsCheckout().notificationUrl, 'https://api.loja.test/pagamentos/mercado-pago/webhook');
  process.env.FRONT_URL = oldFront;
  process.env.PUBLIC_API_URL = oldPublic;
  process.env.BACKEND_URL = oldBack;
});

test('producao bloqueia localhost e configura SSL opcional do banco', () => {
  const env = {
    NODE_ENV: 'production', JWT_SECRET: 'x', DB_HOST: 'db', DB_PORT: '3306', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'd',
    FRONT_URL: 'https://loja.test', PUBLIC_API_URL: 'https://api.loja.test', CORS_ORIGINS: 'https://loja.test',
    MP_ENVIRONMENT: 'production', MERCADO_PAGO_ACCESS_TOKEN: 'token', MERCADO_PAGO_WEBHOOK_SECRET: 'secret', UPLOAD_DIR: process.cwd(),
  };
  assert.equal(validateRuntimeEnvironment(env).origins[0], 'https://loja.test');
  assert.throws(() => validateRuntimeEnvironment({ ...env, FRONT_URL: 'http://localhost:5173' }));
  const config = buildDatabaseConfig({ ...env, DB_SSL_ENABLED: 'true', DB_SSL_CA: 'ca-content' });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.ca, 'ca-content');
  assert.equal(config.connectTimeout, 10000);
});
