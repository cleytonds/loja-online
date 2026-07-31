import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';

const [{ default: router }, { default: db }] = await Promise.all([
  import('../src/routes/pedidos.js'),
  import('../src/config/database.js'),
]);

const createOrder = router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.post)
  .route.stack.at(-1).handle;

function responseSpy() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function criarPedidoComPreco({ preco, precoPromocional }) {
  const original = db.getConnection;
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FROM pedidos WHERE usuario_id')) return [[]];
      if (sql.includes('FROM produto_variacoes')) {
        return [[{ preco, preco_promocional: precoPromocional, estoque: 5 }]];
      }
      if (sql.includes('INSERT INTO pedidos')) return [{ insertId: 99 }];
      return [{ affectedRows: 1 }];
    },
  };
  db.getConnection = async () => connection;

  try {
    const res = responseSpy();
    await createOrder({
      user: { id: 7 },
      body: { itens: [{ produto_id: 10, variacao_id: 20, quantidade: 2 }], pagamento: 'mercado_pago' },
      get(name) { return name === 'X-Idempotency-Key' ? '123e4567-e89b-12d3-a456-426614174000' : undefined; },
    }, res);
    return { res, queries };
  } finally {
    db.getConnection = original;
  }
}

test('pedido salva o preço promocional efetivo e preserva o preço histórico', async () => {
  const { res, queries } = await criarPedidoComPreco({ preco: 100, precoPromocional: 80 });
  const item = queries.find(({ sql }) => sql.includes('INSERT INTO pedido_itens'));

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 160);
  assert.equal(item.params.at(-1), 80);
});

test('pedido sem promoção válida salva o preço normal', async () => {
  const { res, queries } = await criarPedidoComPreco({ preco: 100, precoPromocional: null });
  const item = queries.find(({ sql }) => sql.includes('INSERT INTO pedido_itens'));

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 200);
  assert.equal(item.params.at(-1), 100);
});

test('preço de pedido antigo permanece no item, independente da promoção atual', () => {
  const itemHistorico = { preco: 80, quantidade: 1 };
  const variacaoAtual = { preco: 100, preco_promocional: null };
  const source = fs.readFileSync(new URL('../src/routes/pedidos.js', import.meta.url), 'utf8');

  assert.equal(itemHistorico.preco, 80);
  assert.equal(variacaoAtual.preco, 100);
  assert.match(source, /pi\.preco/);
});
