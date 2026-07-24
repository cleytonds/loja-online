import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Preference } from 'mercadopago';

process.env.MERCADO_PAGO_ACCESS_TOKEN ||= 'TEST-mercado-pago-access-token';
process.env.JWT_SECRET ||= 'jwt-test-secret';
process.env.FRONT_URL ||= 'https://loja.test';
process.env.BACKEND_URL ||= 'https://api.loja.test';

const { default: db } = await import('../src/config/database.js');
const { default: pagamentosRoutes } = await import('../src/routes/pagamentos.js');

function pedido(overrides = {}) {
  return {
    id: 100,
    usuario_id: 1,
    status: 'pendente',
    total: '50.00',
    created_at: new Date(Date.now() - 60_000),
    expires_at: new Date(Date.now() + 60_000),
    mp_preference_id: null,
    mp_checkout_url: null,
    nome: 'Cliente Teste',
    email: 'cliente@test.local',
    ...overrides,
  };
}

function criarBancoFalso(estado) {
  return {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      if (sql.includes('FROM pedidos p')) return [[estado.pedido].filter(Boolean)];
      if (sql.includes('FROM pedido_itens')) return [estado.itens];
      if (sql.includes('UPDATE pedidos')) {
        estado.updates += 1;
        estado.pedido.mp_preference_id = params[0];
        estado.pedido.mp_checkout_url = params[1];
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
}

async function requisicao(app, path, token) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('rota Mercado Pago protege, valida e persiste apenas preferência válida', async (t) => {
  const originalQuery = db.query;
  const originalGetConnection = db.getConnection;
  const originalCreate = Preference.prototype.create;
  const app = express();
  app.use('/pagamentos', pagamentosRoutes);
  const token = jwt.sign({ id: 1, tipo: 'cliente' }, process.env.JWT_SECRET);

  const estado = {
    pedido: pedido(),
    itens: [{ produto_id: 1, variacao_id: 2, quantidade: 2, preco: '25.00', nome: 'Produto real' }],
    respostaSdk: { id: 'pref-100', init_point: 'https://checkout.test', sandbox_init_point: 'https://sandbox.test', external_reference: '100' },
    updates: 0,
    chamadasSdk: 0,
  };

  db.query = async () => [[{ id: 1, nome: 'Cliente Teste', email: 'cliente@test.local', tipo: 'cliente', ativo: 1 }]];
  db.getConnection = async () => criarBancoFalso(estado);
  Preference.prototype.create = async ({ body, requestOptions }) => {
    estado.chamadasSdk += 1;
    assert.equal(body.external_reference, '100');
    assert.equal(requestOptions.idempotencyKey, 'mercado-pago-preferencia:100');
    assert.equal(body.payment_methods.installments, 12);
    return estado.respostaSdk;
  };
  t.after(() => {
    db.query = originalQuery;
    db.getConnection = originalGetConnection;
    Preference.prototype.create = originalCreate;
  });

  let result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { pedidoId: 100, preferenceId: 'pref-100', checkoutUrl: 'https://sandbox.test', ambiente: 'teste' });
  assert.equal(estado.updates, 1);
  assert.equal(estado.pedido.pagamento, undefined);

  estado.pedido = pedido({ mp_preference_id: 'existente', mp_checkout_url: 'https://existente.test' });
  estado.chamadasSdk = 0;
  estado.updates = 0;
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { pedidoId: 100, preferenceId: 'existente', checkoutUrl: 'https://existente.test', ambiente: 'teste' });
  assert.equal(estado.chamadasSdk, 0);
  assert.equal(estado.updates, 0);

  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/invalido', token);
  assert.equal(result.status, 400);
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100');
  assert.equal(result.status, 401);

  estado.pedido = pedido({ usuario_id: 2 });
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 403);

  for (const status of ['pago', 'enviado', 'entregue', 'cancelado', 'expirado']) {
    estado.pedido = pedido({ status });
    result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
    assert.equal(result.status, 409);
  }

  estado.pedido = pedido({ expires_at: new Date(Date.now() - 1) });
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 409);

  estado.pedido = pedido();
  estado.itens = [{ produto_id: 1, quantidade: 1, preco: '49.99', nome: 'Produto real' }];
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 500);

  estado.itens = [{ produto_id: 1, quantidade: 2, preco: '25.00', nome: 'Produto real' }];
  estado.respostaSdk = { id: 'pref-100', init_point: 'https://checkout.test', external_reference: '999' };
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 500);
  assert.doesNotMatch(JSON.stringify(result.body), /token|segredo/i);

  for (const respostaIncompleta of [
    { init_point: 'https://checkout.test', external_reference: '100' },
    { id: 'pref-100', external_reference: '100' },
    { id: 'pref-100', sandbox_init_point: null, init_point: null, external_reference: '100' },
  ]) {
    estado.pedido = pedido();
    estado.updates = 0;
    estado.respostaSdk = respostaIncompleta;
    result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
    assert.equal(result.status, 500);
    assert.equal(estado.updates, 0);
  }

  estado.pedido = pedido();
  estado.updates = 0;
  Preference.prototype.create = async () => {
    throw new Error('token-secreto-nao-vazar');
  };
  result = await requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token);
  assert.equal(result.status, 500);
  assert.equal(estado.updates, 0);
  assert.doesNotMatch(JSON.stringify(result.body), /token-secreto-nao-vazar/);
});

test('duas requisições simultâneas reutilizam a primeira preferência persistida', async (t) => {
  const originalQuery = db.query;
  const originalGetConnection = db.getConnection;
  const originalCreate = Preference.prototype.create;
  const app = express();
  app.use('/pagamentos', pagamentosRoutes);
  const token = jwt.sign({ id: 1, tipo: 'cliente' }, process.env.JWT_SECRET);
  const estado = {
    pedido: pedido(),
    itens: [{ produto_id: 1, variacao_id: 2, quantidade: 2, preco: '25.00', nome: 'Produto real' }],
    updates: 0,
    chaves: [],
    chamadas: 0,
  };

  db.query = async () => [[{ id: 1, nome: 'Cliente Teste', email: 'cliente@test.local', tipo: 'cliente', ativo: 1 }]];
  db.getConnection = async () => criarBancoFalso(estado);
  Preference.prototype.create = async ({ requestOptions }) => {
    estado.chaves.push(requestOptions.idempotencyKey);
    estado.chamadas += 1;
    if (estado.chamadas === 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { id: 'pref-primeira', sandbox_init_point: 'https://primeira.test', external_reference: '100' };
    }
    return { id: 'pref-segunda', sandbox_init_point: 'https://segunda.test', external_reference: '100' };
  };
  t.after(() => {
    db.query = originalQuery;
    db.getConnection = originalGetConnection;
    Preference.prototype.create = originalCreate;
  });

  const [primeira, segunda] = await Promise.all([
    requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token),
    requisicao(app, '/pagamentos/mercado-pago/preferencia/100', token),
  ]);

  assert.equal(estado.chaves[0], 'mercado-pago-preferencia:100');
  assert.equal(estado.chaves[1], 'mercado-pago-preferencia:100');
  assert.equal(estado.updates, 1);
  assert.equal(primeira.body.preferenceId, segunda.body.preferenceId);
  assert.equal(estado.pedido.mp_preference_id, primeira.body.preferenceId);
});
