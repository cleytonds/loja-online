import test from 'node:test';
import assert from 'node:assert/strict';

import { buildVendasSeries } from '../src/utils/adminDashboard.js';
import { isAdmin } from '../src/middlewares/isAdmin.js';

test('agrega vendas mensais em formato compatível com o dashboard', () => {
  const rows = [
    { mes: '2026-07', total: 120 },
    { mes: '2026-07', total: 80 },
    { mes: '2026-06', total: 50 },
  ];

  assert.deepEqual(buildVendasSeries(rows), [
    { mes: '2026-06', total: 50 },
    { mes: '2026-07', total: 200 },
  ]);
});

test('bloqueia acesso administrativo para usuário comum e permite para admin', () => {
  let nextCalled = 0;

  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  const adminReq = { user: { tipo: 'admin' } };
  const clienteReq = { user: { tipo: 'cliente' } };

  isAdmin(adminReq, res, () => {
    nextCalled += 1;
  });

  assert.equal(nextCalled, 1);
  assert.equal(res.statusCode, null);

  const clienteRes = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  isAdmin(clienteReq, clienteRes, () => {
    nextCalled += 1;
  });

  assert.equal(clienteRes.statusCode, 403);
  assert.equal(nextCalled, 1);
});
