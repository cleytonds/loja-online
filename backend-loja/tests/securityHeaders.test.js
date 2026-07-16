import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHelmetConfig } from '../src/server.js';

test('helmet usa CSP desativada para não bloquear o frontend atual', () => {
  const config = buildHelmetConfig();
  assert.equal(config.contentSecurityPolicy, false);
});

test('helmet mantém recursos cross-origin para produtos e uploads', () => {
  const config = buildHelmetConfig();
  assert.equal(config.crossOriginResourcePolicy.policy, 'cross-origin');
  assert.equal(config.crossOriginEmbedderPolicy, false);
});
