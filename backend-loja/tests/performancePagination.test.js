import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import db from '../src/config/database.js';

let server;
let baseUrl;
let adminToken;
let clientToken;

before(async () => {
  const [users] = await db.query(
    "SELECT id, tipo FROM usuarios WHERE ativo = 1 AND tipo IN ('admin', 'cliente')",
  );
  const admin = users.find((user) => user.tipo === 'admin');
  const client = users.find((user) => user.tipo === 'cliente');

  if (!admin || !client) throw new Error('Fixtures de admin e cliente ativos são necessárias');

  adminToken = jwt.sign({ id: admin.id, tipo: admin.tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });
  clientToken = jwt.sign({ id: client.id, tipo: client.tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  await db.end();
});

test('catálogo preserva array sem parâmetros e retorna metadados com paginação', async () => {
  const legacy = await fetch(`${baseUrl}/produtos`);
  assert.equal(legacy.status, 200);
  assert.ok(Array.isArray(await legacy.json()));

  const paged = await fetch(`${baseUrl}/produtos?page=1&limit=999`, {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  const body = await paged.json();

  assert.equal(paged.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.pagination.limit, 50);
  assert.match(paged.headers.get('cache-control') || '', /max-age=60/);
});

test('filtros de nome e categoria retornam somente produtos compatíveis', async () => {
  const catalog = await (await fetch(`${baseUrl}/produtos?page=1&limit=1`)).json();
  const product = catalog.data[0];
  if (!product) return;

  const response = await fetch(
    `${baseUrl}/produtos?page=1&limit=20&nome=${encodeURIComponent(product.nome)}&categoria=${encodeURIComponent(product.categoria_id)}`,
  );
  const body = await response.json();

  assert.ok(body.data.every((item) => item.nome.toLowerCase().includes(product.nome.toLowerCase())));
  assert.ok(body.data.every((item) => item.categoria_id === product.categoria_id));
});

test('estoque é administrativo e pedidos paginados preservam autorização', async () => {
  const adminStock = await fetch(`${baseUrl}/produtos/estoque`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const clientStock = await fetch(`${baseUrl}/produtos/estoque`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const adminOrders = await fetch(`${baseUrl}/pedidos?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const clientOrders = await fetch(`${baseUrl}/pedidos?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });

  assert.equal(adminStock.status, 200);
  assert.equal(clientStock.status, 403);
  assert.equal(adminOrders.status, 200);
  assert.equal(clientOrders.status, 403);
});

test('filtro administrativo de pedidos separa atuais e histórico pelo status real', async () => {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const atuaisResponse = await fetch(`${baseUrl}/pedidos?tipo=atuais&page=1&limit=50`, { headers });
  const historicoResponse = await fetch(`${baseUrl}/pedidos?tipo=historico&page=1&limit=50`, { headers });
  const atuais = await atuaisResponse.json();
  const historico = await historicoResponse.json();

  assert.equal(atuaisResponse.status, 200);
  assert.equal(historicoResponse.status, 200);
  assert.ok(atuais.data.every((pedido) => ['pendente', 'aguardando_confirmacao'].includes(pedido.status)));
  assert.ok(historico.data.every((pedido) =>
    ['pago', 'enviado', 'entregue', 'cancelado', 'expirado'].includes(pedido.status),
  ));
  assert.ok(atuais.data.every((pedido) => Array.isArray(pedido.itens)));
  assert.ok(historico.data.every((pedido) => Array.isArray(pedido.itens)));
});
