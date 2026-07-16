import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRateLimitConfig } from '../src/server.js';

test('mantém limites suaves para confirmação de código de email', () => {
  const config = buildRateLimitConfig();

  assert.equal(config.verificarCodigo.max, 10);
  assert.equal(config.reenviar.max, 5);
  assert.equal(config.login.max, 20);
  assert.equal(typeof config.verificarCodigo.middleware, 'function');
});
