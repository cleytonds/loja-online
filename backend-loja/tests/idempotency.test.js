import test from 'node:test';
import assert from 'node:assert/strict';

import { isDuplicateKeyError, normalizeIdempotencyKey } from '../src/utils/idempotency.js';

test('aceita chave de idempotência no formato gerado pelo checkout', () => {
  assert.equal(normalizeIdempotencyKey('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
});

test('rejeita chave de idempotência ausente ou inválida', () => {
  assert.equal(normalizeIdempotencyKey(), null);
  assert.equal(normalizeIdempotencyKey('curta'), null);
  assert.equal(normalizeIdempotencyKey('chave com espaço inválido'), null);
});

test('identifica conflito UNIQUE da chave de idempotência', () => {
  assert.equal(isDuplicateKeyError({ code: 'ER_DUP_ENTRY', message: "Duplicate entry for key 'unique_pedidos_idempotency_key'" }), true);
  assert.equal(isDuplicateKeyError({ code: 'ER_DUP_ENTRY', message: "Duplicate entry for key 'email'" }), false);
});
