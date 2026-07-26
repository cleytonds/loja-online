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
  const clearIntervalFake = () => {};
  const env = { NODE_ENV: 'production', ENABLE_ORDER_SCHEDULER: 'true' };

  const primeiro = startOrderScheduler(() => {}, env, setIntervalFake, clearIntervalFake);
  const segundo = startOrderScheduler(() => {}, env, setIntervalFake, clearIntervalFake);

  assert.deepEqual(primeiro.timer, { timer: 1 });
  assert.equal(segundo, primeiro);
  assert.equal(chamadas, 1);
  resetOrderSchedulerForTests();
});

test('scheduler nao sobrepoe ciclos e stop limpa o timer', async () => {
  resetOrderSchedulerForTests();
  let cycle;
  let clears = 0;
  let runs = 0;
  let release;
  const blocker = new Promise((resolve) => { release = resolve; });
  const scheduler = startOrderScheduler(async () => {
    runs += 1;
    await blocker;
  }, { NODE_ENV: 'production', ENABLE_ORDER_SCHEDULER: 'true' }, (fn) => {
    cycle = fn;
    return 'timer';
  }, (timer) => {
    assert.equal(timer, 'timer');
    clears += 1;
  });

  const first = cycle();
  await cycle();
  assert.equal(runs, 1);
  release();
  await first;
  scheduler.stop();
  assert.equal(clears, 1);
  resetOrderSchedulerForTests();
});
