import test from 'node:test';
import assert from 'node:assert/strict';

const { default: app } = await import('../src/server.js');

async function request(path, options = {}) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health, 404, login vazio e webhook sem assinatura possuem respostas seguras', async () => {
  const health = await request('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');

  const missing = await request('/nao-existe');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { erro: 'Rota nao encontrada' });

  const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(login.status, 400);
  assert.doesNotMatch(JSON.stringify(login.body), /stack|token/i);

  const webhook = await request('/pagamentos/mercado-pago/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'payment', data: { id: '123456' } }),
  });
  assert.equal(webhook.status, 401);
  assert.deepEqual(webhook.body, { erro: 'Assinatura inválida' });
});
