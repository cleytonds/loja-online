import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resetOrderSchedulerForTests,
  shouldStartOrderScheduler,
  startOrderScheduler,
} from '../src/utils/orderScheduler.js';

test('scheduler não inicia em testes nem quando está desabilitado', () => {
  assert.equal(shouldStartOrderScheduler({ NODE_ENV: 'test', ENABLE_ORDER_SCHEDULER: 'true' }), false);
  assert.equal(shouldStartOrderScheduler({ NODE_ENV: 'production', ENABLE_ORDER_SCHEDULER: 'false' }), false);
});

test('scheduler inicia uma única vez quando habilitado', () => {
  resetOrderSchedulerForTests();
  let chamadas = 0;
  const setIntervalFake = () => ({ timer: ++chamadas });
  const env = { NODE_ENV: 'production', ENABLE_ORDER_SCHEDULER: 'true' };

  const primeiro = startOrderScheduler(() => {}, env, setIntervalFake);
  const segundo = startOrderScheduler(() => {}, env, setIntervalFake);

  assert.deepEqual(primeiro, { timer: 1 });
  assert.equal(segundo, primeiro);
  assert.equal(chamadas, 1);
  resetOrderSchedulerForTests();
});
