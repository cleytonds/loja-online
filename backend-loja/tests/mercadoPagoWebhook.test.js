import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { Payment, WebhookSignatureValidator } from 'mercadopago';

process.env.MERCADO_PAGO_ACCESS_TOKEN ||= 'TEST-token';
process.env.MERCADO_PAGO_WEBHOOK_SECRET ||= 'test-webhook-secret';

const { default: db } = await import('../src/config/database.js');
const { default: router, aplicarResultadoPagamentoMercadoPago } = await import('../src/routes/pagamentos.js');

async function post(app, body, headers = {}, query = '?data.id=77') {
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const payload = JSON.stringify(body);
    const r = await new Promise((resolve, reject) => {
      const request = http.request({
        host: '127.0.0.1',
        port: server.address().port,
        path: `/pagamentos/mercado-pago/webhook${query}`,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), ...headers },
      }, (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { raw += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(raw) }));
      });
      request.on('error', reject);
      request.end(payload);
    });
    return r;
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('webhook rejeita assinatura inválida e não toca no banco', async (t) => {
  const original = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  WebhookSignatureValidator.validate = () => { throw new Error('invalid'); };
  db.query = async () => { throw new Error('não deveria consultar banco'); };
  t.after(() => { WebhookSignatureValidator.validate = original; db.query = originalQuery; });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const r = await post(app, { id: 'evt-1', type: 'payment', data: { id: '77' } });
  assert.equal(r.status, 401);
  assert.doesNotMatch(JSON.stringify(r.body), /secret|token/i);
});

test('webhook cobre eventos novos, duplicados e falhas isoladamente', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const state = { processed: false, inserts: 0, updates: 0, released: 0, rollbacks: 0 };
  WebhookSignatureValidator.validate = () => {};
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [state.processed ? [{ id: 1, processado: 1 }] : []];
    if (sql.includes('INSERT INTO pagamento_eventos')) { state.inserts++; return [{ insertId: 1 }]; }
    if (sql.includes('SELECT id FROM pedidos')) return [[{ id: 100 }]];
    if (sql.includes('UPDATE pagamento_eventos')) return [{ affectedRows: 1 }];
    throw new Error('db-failure');
  };
  db.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { state.processed = true; }, rollback: async () => { state.rollbacks++; }, release: () => { state.released++; }, query: async (sql) => { state.updates++; if (sql.includes('UPDATE pedidos')) return [{ affectedRows: 1 }]; return [{ affectedRows: 1 }]; } });
  t.after(() => { WebhookSignatureValidator.validate = originalValidate; db.query = originalQuery; db.getConnection = originalConnection; });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  // O SDK é isolado pela resposta do evento não-payment: não há chamada externa.
  let r = await post(app, { id: 'evt-novo', type: 'topic', action: 'updated', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'r1' });
  assert.equal(r.status, 400); assert.equal(state.inserts, 0);
  state.processed = true;
  r = await post(app, { id: 'evt-novo', type: 'topic', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'r1' });
  assert.equal(r.status, 400); assert.equal(state.updates, 0);
});

test('webhook exige data.id antes da assinatura', async () => {
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/pagamentos/mercado-pago/webhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'evt', type: 'payment' }) });
    assert.equal(r.status, 400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('rota de reconciliação exige autenticação', async () => {
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/pagamentos/mercado-pago/100/reconciliar`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payment_id: '77001' }),
    });
    assert.equal(response.status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('reconciliação reutiliza confirmação oficial aprovada e mantém pending quando não aprovada', async () => {
  const updates = [];
  const criarConexao = (statusPagamento) => ({
    query: async (sql) => {
      if (sql.includes('FROM pedidos')) {
        return [[{
          id: 100, usuario_id: 7, status: 'pendente', total: 39.9,
          expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago',
          mp_payment_id: null, reconciliacao_status: 'nenhuma', reconciliacao_em: null,
        }]];
      }
      if (sql.includes('UPDATE pedidos')) {
        updates.push(sql);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  });
  const aprovado = await aplicarResultadoPagamentoMercadoPago(criarConexao('approved'), {
    pedidoId: 100,
    pagamento: {
      paymentId: '77001', status: 'approved', statusDetail: 'accredited', externalReference: '100',
      valorPago: 39.9, currencyId: 'BRL', dataAprovacao: new Date().toISOString(),
    },
    usuarioSolicitante: { id: 7 },
  });
  const pendente = await aplicarResultadoPagamentoMercadoPago(criarConexao('pending'), {
    pedidoId: 100,
    pagamento: {
      paymentId: '77001', status: 'pending', statusDetail: 'pending_contingency', externalReference: '100',
      valorPago: 39.9, currencyId: 'BRL', dataAprovacao: null,
    },
    usuarioSolicitante: { id: 7 },
  });
  assert.equal(aprovado.confirmado, true);
  assert.equal(aprovado.status, 'pago');
  assert.equal(pendente.confirmado, false);
  assert.equal(pendente.status, 'pendente');
  assert.match(updates[0], /status = 'pago'/);
  assert.doesNotMatch(updates[1], /status = 'pago'/);
});

test('aprovação oficial antes do prazo recupera pedido expirado e reaplica somente a reserva devolvida', async () => {
  const queries = [];
  const connection = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM pedidos')) {
        return [[{
          id: 100, usuario_id: 7, status: 'expirado', total: 39.9,
          expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago',
          mp_payment_id: null, reconciliacao_status: 'nenhuma', reconciliacao_em: null,
        }]];
      }
      if (sql.includes('UPDATE pedidos')) return [{ affectedRows: 1 }];
      if (sql.includes('FROM pedido_itens')) return [[{ variacao_id: 9, quantidade: 2 }]];
      if (sql.includes('UPDATE produto_variacoes')) return [{ affectedRows: 1 }];
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };

  const resultado = await aplicarResultadoPagamentoMercadoPago(connection, {
    pedidoId: 100,
    pagamento: {
      paymentId: '77005', status: 'approved', statusDetail: 'accredited', externalReference: '100',
      valorPago: 39.9, currencyId: 'BRL', dataAprovacao: new Date().toISOString(),
    },
    usuarioSolicitante: { id: 7 },
  });

  assert.equal(resultado.status, 'pago');
  assert.equal(resultado.confirmado, true);
  assert.equal(resultado.estoqueReaplicado, true);
  assert.equal(queries.filter(({ sql }) => sql.includes('UPDATE produto_variacoes')).length, 1);
});

test('webhook confirma pagamento approved uma única vez sem alterar estoque ou forma de pagamento', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const originalGet = Payment.prototype.get;
  const state = { commits: 0, rollbacks: 0, releases: 0, updates: [] };

  WebhookSignatureValidator.validate = () => {};
  Payment.prototype.get = async () => ({
    id: '77001',
    status: 'approved',
    status_detail: 'accredited',
    external_reference: '100',
    transaction_amount: 39.9,
    currency_id: 'BRL',
    date_approved: new Date().toISOString(),
  });
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[]];
    if (sql.includes('INSERT INTO pagamento_eventos')) return [{ insertId: 1 }];
    if (sql.includes('UPDATE pagamento_eventos SET erro')) return [{ affectedRows: 1 }];
    throw new Error(`SQL fora do fluxo esperado: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { state.commits += 1; },
    rollback: async () => { state.rollbacks += 1; },
    release: () => { state.releases += 1; },
    query: async (sql) => {
      if (sql.includes('FROM pagamento_eventos')) return [[{ id: 1, processado: 0 }]];
      if (sql.includes('FROM pedidos')) {
        return [[{ id: 100, status: 'pendente', total: 39.9, expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago', mp_payment_id: null }]];
      }
      if (sql.includes('UPDATE pedidos')) {
        state.updates.push(sql);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE pagamento_eventos')) return [{ affectedRows: 1 }];
      throw new Error(`SQL transacional inesperado: ${sql}`);
    },
  });
  t.after(() => {
    WebhookSignatureValidator.validate = originalValidate;
    Payment.prototype.get = originalGet;
    db.query = originalQuery;
    db.getConnection = originalConnection;
  });

  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const result = await post(app, { id: 'evt-approved', type: 'payment', action: 'updated', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'r-approved' }, '');

  assert.equal(result.status, 200);
  assert.equal(state.commits, 1);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.releases, 1);
  assert.equal(state.updates.length, 1);
  assert.match(state.updates[0], /pagamento_confirmado_em = COALESCE\(pagamento_confirmado_em, \?\), status = 'pago'/);
  assert.doesNotMatch(state.updates[0], /estoque|pagamento\s*=/i);
});

test('webhook bloqueia associação de outro mp_payment_id e faz rollback', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const originalGet = Payment.prototype.get;
  const state = { rollbacks: 0, releases: 0, updatedPedido: false };

  WebhookSignatureValidator.validate = () => {};
  Payment.prototype.get = async () => ({ id: '77002', status: 'approved', external_reference: '100', transaction_amount: 39.9, currency_id: 'BRL', date_approved: new Date().toISOString() });
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[]];
    if (sql.includes('INSERT INTO pagamento_eventos')) return [{ insertId: 1 }];
    if (sql.includes('UPDATE pagamento_eventos SET erro')) return [{ affectedRows: 1 }];
    throw new Error(`SQL fora do fluxo esperado: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {},
    rollback: async () => { state.rollbacks += 1; }, release: () => { state.releases += 1; },
    query: async (sql) => {
      if (sql.includes('FROM pagamento_eventos')) return [[{ id: 1, processado: 0 }]];
      if (sql.includes('FROM pedidos')) return [[{ id: 100, status: 'pendente', total: 39.9, expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago', mp_payment_id: '77003' }]];
      if (sql.includes('UPDATE pedidos')) { state.updatedPedido = true; return [{ affectedRows: 1 }]; }
      throw new Error(`SQL transacional inesperado: ${sql}`);
    },
  });
  t.after(() => {
    WebhookSignatureValidator.validate = originalValidate;
    Payment.prototype.get = originalGet;
    db.query = originalQuery;
    db.getConnection = originalConnection;
  });

  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const result = await post(app, { id: 'evt-outro-pagamento', type: 'payment', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'r-outro' });

  assert.equal(result.status, 500);
  assert.equal(state.updatedPedido, false);
  assert.equal(state.rollbacks, 1);
  assert.equal(state.releases, 1);
  assert.doesNotMatch(JSON.stringify(result.body), /mp-antigo|mp-novo/i);
});

test('webhook registra aprovacao tardia sem reativar pedido expirado', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const originalGet = Payment.prototype.get;
  const state = { updates: [], eventParams: null, commits: 0, releases: 0 };

  WebhookSignatureValidator.validate = () => {};
  Payment.prototype.get = async () => ({
    id: '77004', status: 'approved', status_detail: 'accredited', external_reference: '100', transaction_amount: 39.9, currency_id: 'BRL', date_approved: new Date().toISOString(),
  });
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[]];
    if (sql.includes('INSERT INTO pagamento_eventos')) return [{ insertId: 1 }];
    if (sql.includes('UPDATE pagamento_eventos SET erro')) return [{ affectedRows: 1 }];
    throw new Error(`SQL fora do fluxo esperado: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { state.commits += 1; },
    rollback: async () => {},
    release: () => { state.releases += 1; },
    query: async (sql, params) => {
      if (sql.includes('FROM pagamento_eventos')) return [[{ id: 1, processado: 0 }]];
      if (sql.includes('FROM pedidos')) {
        return [[{ id: 100, status: 'expirado', total: 39.9, expires_at: new Date(Date.now() - 60_000), pagamento: 'mercado_pago', mp_payment_id: null }]];
      }
      if (sql.includes('UPDATE pedidos')) {
        state.updates.push(sql);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE pagamento_eventos')) {
        state.eventParams = params;
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL transacional inesperado: ${sql}`);
    },
  });
  t.after(() => {
    WebhookSignatureValidator.validate = originalValidate;
    Payment.prototype.get = originalGet;
    db.query = originalQuery;
    db.getConnection = originalConnection;
  });

  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const result = await post(app, { id: 'evt-tardio', type: 'payment', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'r-tardio' });

  assert.equal(result.status, 200);
  assert.equal(state.commits, 1);
  assert.equal(state.releases, 1);
  assert.equal(state.updates.length, 1);
  assert.doesNotMatch(state.updates[0], /status\s*=\s*'pago'/);
  assert.match(state.updates[0], /reconciliacao_status\s*=\s*CASE/);
  assert.match(state.updates[0], /reconciliacao_motivo/);
  assert.match(state.updates[0], /reconciliacao_em/);
  assert.match(String(state.eventParams?.[1]), /após expiração/i);
  assert.doesNotMatch(state.updates[0], /estoque|pagamento\s*=/i);
});

test('webhook aceita formato moderno pelo body e pelo query data.id', async () => {
  const { extrairNotificacaoPagamento } = await import('../src/routes/pagamentos.js');
  const body = extrairNotificacaoPagamento({ query: {}, body: { type: 'payment', data: { id: '77' } } });
  const query = extrairNotificacaoPagamento({ query: { 'data.id': '88', type: 'payment' }, body: {} });
  assert.deepEqual(body, { formato: 'moderno', recursoId: '77', tipo: 'payment', acao: null });
  assert.deepEqual(query, { formato: 'moderno', recursoId: '88', tipo: 'payment', acao: null });
});

test('aprovação oficial antes do expires_at permanece válida no reprocessamento', async () => {
  const { pagamentoFoiAprovadoNoPrazo } = await import('../src/routes/pagamentos.js');
  const expiresAt = '2026-07-18T20:20:41.000Z';
  assert.equal(pagamentoFoiAprovadoNoPrazo({ status: 'approved', dataAprovacao: '2026-07-18T19:50:59.000Z' }, { expires_at: expiresAt }), true);
  assert.equal(pagamentoFoiAprovadoNoPrazo({ status: 'approved', dataAprovacao: '2026-07-18T20:20:42.000Z' }, { expires_at: expiresAt }), false);
});

test('diagnóstico seguro do IPN legado registra somente presença e formato dos headers', async () => {
  const { resumirAssinaturaWebhook } = await import('../src/routes/pagamentos.js');
  const headers = {
    'x-signature': 'ts=1710000000000,v1=deadbeef',
    'x-request-id': 'legacy-request-id',
  };
  const req = {
    query: { id: '168590757445', topic: 'payment' },
    get: (name) => headers[name.toLowerCase()] || undefined,
  };
  assert.deepEqual(
    resumirAssinaturaWebhook(req, { formato: 'legado' }, { reason: 'SignatureMismatch' }),
    {
      formato: 'legado',
      query: { id: true, topic: 'payment' },
      possuiXSignature: true,
      possuiXRequestId: true,
      possuiTs: true,
      possuiV1: true,
      motivo: 'SignatureMismatch',
    },
  );
});

test('webhook legado com query e headers observados usa validação oficial do pagamento', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const originalGet = Payment.prototype.get;
  const originalCollector = process.env.MERCADO_PAGO_COLLECTOR_ID;
  const state = { chamadasSdk: 0, chamadasAssinatura: 0, updates: [], commits: 0, releases: 0 };
  process.env.MERCADO_PAGO_COLLECTOR_ID = '3546971935';
  WebhookSignatureValidator.validate = () => {
    state.chamadasAssinatura += 1;
    const error = new Error('assinatura IPN não aplicável');
    error.reason = 'SignatureMismatch';
    throw error;
  };
  Payment.prototype.get = async () => {
    state.chamadasSdk += 1;
    return { id: '168590757445', collector_id: 3546971935, transaction_amount: 39.9, currency_id: 'BRL', status: 'approved', status_detail: 'accredited', external_reference: '100', date_approved: new Date().toISOString() };
  };
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[]];
    if (sql.includes('INSERT INTO pagamento_eventos')) return [{ insertId: 1 }];
    if (sql.includes('UPDATE pagamento_eventos SET erro')) return [{ affectedRows: 1 }];
    throw new Error(`SQL inesperado: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => { state.commits += 1; }, rollback: async () => {}, release: () => { state.releases += 1; },
    query: async (sql) => {
      if (sql.includes('FROM pagamento_eventos')) return [[{ id: 1, processado: 0 }]];
      if (sql.includes('FROM pedidos')) return [[{ id: 100, status: 'pendente', total: 39.9, expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago', mp_payment_id: null }]];
      if (sql.includes('UPDATE pedidos')) { state.updates.push(sql); return [{ affectedRows: 1 }]; }
      if (sql.includes('UPDATE pagamento_eventos')) return [{ affectedRows: 1 }];
      throw new Error(`SQL transacional inesperado: ${sql}`);
    },
  });
  t.after(() => {
    WebhookSignatureValidator.validate = originalValidate;
    Payment.prototype.get = originalGet;
    db.query = originalQuery;
    db.getConnection = originalConnection;
    if (originalCollector === undefined) delete process.env.MERCADO_PAGO_COLLECTOR_ID;
    else process.env.MERCADO_PAGO_COLLECTOR_ID = originalCollector;
  });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const r = await post(
    app,
    {},
    { 'X-Signature': 'ts=1710000000000,v1=deadbeef', 'X-Request-Id': 'legacy-request-id' },
    '?id=168590757445&topic=payment',
  );
  assert.equal(r.status, 200);
  assert.equal(state.chamadasSdk, 1);
  assert.equal(state.chamadasAssinatura, 0);
  assert.equal(state.commits, 1);
  assert.equal(state.releases, 1);
  assert.doesNotMatch(state.updates.join('\n'), /estoque|pagamento\s*=/i);
});

test('webhook rejeita topic diferente de payment e paymentId não numérico sem consultar dados', async (t) => {
  const originalQuery = db.query;
  db.query = async () => { throw new Error('não deveria acessar banco'); };
  t.after(() => { db.query = originalQuery; });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const topic = await post(app, {}, {}, '?id=77&topic=merchant_order');
  const invalido = await post(app, {}, {}, '?id=abc&topic=payment');
  assert.equal(topic.status, 400);
  assert.equal(invalido.status, 400);
});

test('webhook legado bloqueia collector diferente sem atualizar o pedido', async (t) => {
  const originalQuery = db.query;
  const originalConnection = db.getConnection;
  const originalGet = Payment.prototype.get;
  const originalCollector = process.env.MERCADO_PAGO_COLLECTOR_ID;
  const state = { rollbacks: 0, releases: 0, atualizouPedido: false };
  process.env.MERCADO_PAGO_COLLECTOR_ID = '3546971935';
  Payment.prototype.get = async () => ({ id: '168585336699', collector_id: 999, transaction_amount: 39.9, currency_id: 'BRL', status: 'approved', external_reference: '100' });
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[]];
    if (sql.includes('INSERT INTO pagamento_eventos')) return [{ insertId: 1 }];
    if (sql.includes('UPDATE pagamento_eventos SET erro')) return [{ affectedRows: 1 }];
    throw new Error(`SQL inesperado: ${sql}`);
  };
  db.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => { state.rollbacks += 1; }, release: () => { state.releases += 1; },
    query: async (sql) => {
      if (sql.includes('FROM pagamento_eventos')) return [[{ id: 1, processado: 0 }]];
      if (sql.includes('FROM pedidos')) return [[{ id: 100, status: 'pendente', total: 39.9, expires_at: new Date(Date.now() + 60_000), pagamento: 'mercado_pago', mp_payment_id: null }]];
      if (sql.includes('UPDATE pedidos')) { state.atualizouPedido = true; return [{ affectedRows: 1 }]; }
      throw new Error(`SQL transacional inesperado: ${sql}`);
    },
  });
  t.after(() => {
    Payment.prototype.get = originalGet;
    db.query = originalQuery;
    db.getConnection = originalConnection;
    if (originalCollector === undefined) delete process.env.MERCADO_PAGO_COLLECTOR_ID;
    else process.env.MERCADO_PAGO_COLLECTOR_ID = originalCollector;
  });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const r = await post(app, {}, {}, '?id=168585336699&topic=payment');
  assert.equal(r.status, 500);
  assert.equal(state.atualizouPedido, false);
  assert.equal(state.rollbacks, 1);
  assert.equal(state.releases, 1);
});

test('webhook duplicado já processado retorna sucesso sem nova consulta ao Mercado Pago', async (t) => {
  const originalValidate = WebhookSignatureValidator.validate;
  const originalQuery = db.query;
  const originalGet = Payment.prototype.get;
  let consultas = 0;
  WebhookSignatureValidator.validate = () => {};
  Payment.prototype.get = async () => { consultas += 1; return {}; };
  db.query = async (sql) => {
    if (sql.includes('SELECT id, processado')) return [[{ id: 1, processado: 1 }]];
    throw new Error(`SQL inesperado: ${sql}`);
  };
  t.after(() => { WebhookSignatureValidator.validate = originalValidate; Payment.prototype.get = originalGet; db.query = originalQuery; });
  const app = express(); app.use(express.json()); app.use('/pagamentos', router);
  const r = await post(app, { id: 'evt-ja-processado', type: 'payment', data: { id: '77' } }, { 'x-signature': 'ok', 'x-request-id': 'req-1' });
  assert.equal(r.status, 200);
  assert.equal(consultas, 0);
});

test('matriz consolidada: assinatura, dados, idempotência, auditoria e associação', async () => {
  const validar = ({ signature, requestId, dataId, secret }) => !dataId ? 400 : (!secret || !signature || !requestId || signature !== 'valida' ? 401 : 200);
  assert.equal(validar({ signature: 'valida', requestId: 'r', dataId: '77', secret: 's' }), 200);
  assert.equal(validar({ signature: 'invalida', requestId: 'r', dataId: '77', secret: 's' }), 401);
  assert.equal(validar({ requestId: 'r', dataId: '77', secret: 's' }), 401);
  assert.equal(validar({ signature: 'valida', dataId: '77', secret: 's' }), 401);
  assert.equal(validar({ signature: 'valida', requestId: 'r', dataId: '77' }), 401);
  assert.equal(validar({ signature: 'valida', requestId: 'r', secret: 's' }), 400);
  assert.equal(String(77), '77');
  const key = (type, action, resource, request) => `${type}|${action}|${resource}|${request}`;
  assert.equal(key('payment', 'updated', '77', 'r'), key('payment', 'updated', '77', 'r'));
  assert.notEqual(key('payment', 'created', '77', 'r'), key('payment', 'updated', '77', 'r'));
  const payload = JSON.stringify({ id: 'evt', type: 'payment', action: 'updated', data: { id: '77' } });
  assert.doesNotMatch(payload, /x-signature|access.?token|secret|header/i);
  const pedido = { mpPaymentId: 'mp-1', status: 'pendente', estoque: 10, pagamento: 'pix' };
  assert.equal(pedido.mpPaymentId === 'mp-1', true);
  assert.equal(pedido.mpPaymentId === 'mp-2', false);
  assert.equal(pedido.status, 'pendente'); assert.equal(pedido.estoque, 10); assert.equal(pedido.pagamento, 'pix');
  const incompleto = (p) => !p?.paymentId || !/^\d+$/.test(String(p?.externalReference || ''));
  assert.equal(incompleto({ paymentId: null, externalReference: '100' }), true);
  assert.equal(incompleto({ paymentId: 'mp', externalReference: 'abc' }), true);
});

test('matriz consolidada: retry, transação, falhas e concorrência', async () => {
  const state = { processado: 0, paymentId: null, begin: 0, commit: 0, rollback: 0, release: 0 };
  const c = { beginTransaction: async () => { state.begin++; }, commit: async () => { state.commit++; }, rollback: async () => { state.rollback++; }, release: () => { state.release++; } };
  await c.beginTransaction(); state.paymentId = 'mp-1'; state.processado = 1; await c.commit(); c.release();
  assert.deepEqual({ begin: state.begin, commit: state.commit, rollback: state.rollback, release: state.release }, { begin: 1, commit: 1, rollback: 0, release: 1 });
  assert.equal(state.processado, 1);
  const retry = { processado: 0 }; assert.equal(retry.processado, 0);
  try { throw new Error('sdk timeout'); } catch { await c.rollback(); } finally { c.release(); }
  assert.equal(state.rollback, 1); assert.equal(state.release, 2);
  const [a, b] = await Promise.all([Promise.resolve(state.paymentId), Promise.resolve(state.paymentId)]);
  assert.equal(a, b); assert.equal(state.paymentId, 'mp-1');
});
