import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import db from '../src/config/database.js';

let server;
let baseUrl;
let adminToken;
let clientToken;
let originalQuery;

function pedidosMockados(sql, params) {
  if (sql.includes('p.reconciliacao_status = ?')) {
    assert.match(sql, /WHERE p\.reconciliacao_status = \?/);
    assert.equal(params[0], 'pendente');
    if (sql.includes('SELECT COUNT(*) AS total FROM pedidos')) return [[{ total: 0 }]];
    return [[]];
  }

  const atuais = Array.isArray(params) && params.includes('pendente');
  const pedido = atuais
    ? { id: 21, usuario_id: 1, usuario_nome: 'Admin Teste', usuario_email: 'admin@test.local', usuario_celular: '11999999999', total: 50, status: 'pendente', pagamento: 'mercado_pago', created_at: new Date(), quantidade_produtos: 1, quantidade_pecas: 1 }
    : { id: 22, usuario_id: 2, usuario_nome: 'Cliente Teste', usuario_email: 'cliente@test.local', usuario_celular: '11888888888', total: 30, status: 'entregue', pagamento: 'pix', created_at: new Date(), quantidade_produtos: 1, quantidade_pecas: 1 };

  if (sql.includes('SELECT COUNT(*) AS total FROM pedidos')) return [[{ total: 1 }]];
  if (sql.includes('FROM pedido_itens pi')) return [[{ pedido_id: pedido.id, produto_id: 10, variacao_id: 20, quantidade: 1, preco: 50, nome: 'Produto Teste', tamanho: 'M', cor: 'Preto' }]];
  return [[pedido]];
}

before(async () => {
  originalQuery = db.query;
  db.query = async (sql, params = []) => {
    if (sql.includes('SELECT id, nome, email, tipo, ativo FROM usuarios')) {
      const id = Number(params[0]);
      return [[{ id, nome: id === 1 ? 'Admin Teste' : 'Cliente Teste', email: 'teste@test.local', tipo: id === 1 ? 'admin' : 'cliente', ativo: 1 }]];
    }

    if (sql.includes('FROM pedido_itens pi')) {
      if (sql.includes('img.url AS imagem_principal')) {
        assert.match(sql, /LEFT JOIN produto_imagens img/);
        return [[{ pedido_id: Number(params[0]), produto_id: 10, variacao_id: 20, quantidade: 1, preco: 50, nome: 'Produto Teste', imagem_principal: '/uploads/produtos/teste.jpg', tamanho: 'M', cor: 'Preto' }]];
      }
      return [[{ pedido_id: Number(params[0]), produto_id: 10, variacao_id: 20, quantidade: 1, preco: 50, nome: 'Produto Teste', tamanho: 'M', cor: 'Preto' }]];
    }
    if (sql.includes('WHERE p.id = ?')) {
      return [[{
        id: Number(params[0]),
        usuario_id: 1,
        total: 50,
        status: 'pago',
        pagamento: 'mercado_pago',
        created_at: new Date(),
        pagamento_confirmado_em: new Date(),
        mp_payment_id: '123456',
        usuario_nome: 'Admin Teste',
        usuario_email: 'admin@test.local',
        usuario_celular: '11999999999',
        endereco_rua: 'Rua Teste',
        endereco_numero: '10',
        endereco_bairro: 'Centro',
        endereco_cidade: 'Recife',
        endereco_estado: 'PE',
        endereco_cep: '50000-000',
      }]];
    }
    if (sql.includes('FROM produto_variacoes pv')) return [[]];
    if (sql.includes('FROM produtos p')) {
      if (sql.includes('SELECT COUNT(*) AS total')) return [[{ total: 1 }]];
      return [[{ id: 10, nome: 'Produto Teste', categoria_id: 7, variacoes: [] }]];
    }
    if (sql.includes('FROM produto_variacoes') && sql.includes('ativo = 1')) {
      return [[{ id: 20, produto_id: 10, tamanho: 'M', cor: 'Preto', preco: 50, estoque: 5 }]];
    }
    if (sql.includes('FROM pedidos p')) return pedidosMockados(sql, params);

    throw new Error(`SQL não mapeado no teste: ${sql}`);
  };

  adminToken = jwt.sign({ id: 1, tipo: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  clientToken = jwt.sign({ id: 2, tipo: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test('histórico do cliente usa GET /pedidos/meus e retorna itens com imagem principal', async () => {
  const response = await fetch(`${baseUrl}/pedidos/meus`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  assert.equal(body[0].id, 22);
  assert.equal(body[0].itens[0].imagem_principal, '/uploads/produtos/teste.jpg');
});

test('rota individual inexistente retorna 404 sem expor dados de pedidos', async () => {
  const response = await fetch(`${baseUrl}/pedidos/meus/2`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });

  assert.equal(response.status, 404);
});

after(async () => {
  db.query = originalQuery;
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
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
  const response = await fetch(
    `${baseUrl}/produtos?page=1&limit=20&nome=${encodeURIComponent(product.nome)}&categoria=${encodeURIComponent(product.categoria_id)}`,
  );
  const body = await response.json();

  assert.ok(body.data.every((item) => item.nome.toLowerCase().includes(product.nome.toLowerCase())));
  assert.ok(body.data.every((item) => item.categoria_id === product.categoria_id));
});

test('estoque é administrativo e pedidos paginados preservam autorização', async () => {
  const adminStock = await fetch(`${baseUrl}/produtos/estoque`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const clientStock = await fetch(`${baseUrl}/produtos/estoque`, { headers: { Authorization: `Bearer ${clientToken}` } });
  const adminOrders = await fetch(`${baseUrl}/pedidos?page=1&limit=1`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const clientOrders = await fetch(`${baseUrl}/pedidos?page=1&limit=1`, { headers: { Authorization: `Bearer ${clientToken}` } });

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
  assert.ok(atuais.data.every((pedido) => ['pendente', 'pago'].includes(pedido.status)));
  assert.ok(historico.data.every((pedido) => ['enviado', 'entregue'].includes(pedido.status)));
  assert.ok(atuais.data.every((pedido) => Number.isInteger(pedido.quantidade_produtos)));
  assert.ok(historico.data.every((pedido) => Number.isInteger(pedido.quantidade_pecas)));
  assert.ok(atuais.data.every((pedido) => Array.isArray(pedido.itens)));
  assert.ok(historico.data.every((pedido) => Array.isArray(pedido.itens)));
});

test('fila administrativa de reconciliação filtra pendências e mantém paginação', async () => {
  const response = await fetch(`${baseUrl}/pedidos?reconciliacao_status=pendente&page=1&limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, 0);
  assert.equal(body.pagination.page, 1);
  assert.equal(body.pagination.total, 0);
});

test('somente admin resolve reconciliação sem alterar status ou estoque', async (t) => {
  const originalGetConnection = db.getConnection;
  const state = { updates: [], commits: 0 };
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { state.commits += 1; },
    rollback: async () => {},
    release: () => {},
    query: async (sql, params) => {
      if (sql.includes('SELECT id, reconciliacao_status')) return [[{ id: 21, reconciliacao_status: 'pendente' }]];
      if (sql.includes('UPDATE pedidos')) {
        state.updates.push({ sql, params });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL de reconciliação não mapeado: ${sql}`);
    },
  });
  t.after(() => { db.getConnection = originalGetConnection; });

  const clientResponse = await fetch(`${baseUrl}/pedidos/21/reconciliacao`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${clientToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ resolucao: 'resolvida_estorno' }),
  });
  assert.equal(clientResponse.status, 403);

  const adminResponse = await fetch(`${baseUrl}/pedidos/21/reconciliacao`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ resolucao: 'resolvida_estorno', observacao: 'Estorno confirmado' }),
  });
  const body = await adminResponse.json();

  assert.equal(adminResponse.status, 200);
  assert.equal(body.reconciliacao_status, 'resolvida_estorno');
  assert.equal(state.commits, 1);
  assert.equal(state.updates.length, 1);
  assert.doesNotMatch(state.updates[0].sql, /SET\s+status\s*=|estoque/i);
});

test('detalhes administrativos retornam cliente, endereço e itens sem dados sensíveis', async () => {
  const response = await fetch(`${baseUrl}/pedidos/21/detalhes`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.id, 21);
  assert.equal(body.usuario_email, 'admin@test.local');
  assert.equal(body.endereco_rua, 'Rua Teste');
  assert.ok(Array.isArray(body.itens));
  assert.equal('senha' in body, false);
  assert.equal('token_redefinicao' in body, false);
});

test('detalhes administrativos permanecem restritos a administrador', async () => {
  const response = await fetch(`${baseUrl}/pedidos/21/detalhes`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });

  assert.equal(response.status, 403);
});
