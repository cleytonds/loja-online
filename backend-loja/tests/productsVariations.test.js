import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';

const [{ default: router }, { default: db }] = await Promise.all([
  import('../src/routes/products.routes.js'),
  import('../src/config/database.js'),
]);

test('gerenciamento de variações não contém exclusão física', () => {
  const source = fs.readFileSync(new URL('../src/routes/products.routes.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /DELETE\s+FROM\s+produto_variacoes/i);
});

test('criação e edição rejeitam promoção inválida com 400 antes de usar o banco', async () => {
  const original = db.getConnection;
  let conexoes = 0;
  db.getConnection = async () => {
    conexoes += 1;
    throw new Error('Não deveria abrir conexão para preço inválido');
  };

  const variacoesInvalidas = JSON.stringify([
    { tamanho: 'M', cor: 'Rosa', preco: '100', preco_promocional: '100', estoque: '2' },
  ]);

  try {
    const createRes = responseSpy();
    await handler('post', '/')({ body: { variacoes: variacoesInvalidas }, files: [] }, createRes);
    assert.equal(createRes.statusCode, 400);
    assert.match(createRes.body.error, /Preço promocional/);

    const updateRes = responseSpy();
    await handler('put', '/:id')({
      params: { id: '10' }, body: { variacoes: variacoesInvalidas }, files: [],
    }, updateRes);
    assert.equal(updateRes.statusCode, 400);
    assert.match(updateRes.body.error, /Preço promocional/);
    assert.equal(conexoes, 0);
  } finally {
    db.getConnection = original;
  }
});

function handler(method, path) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  return layer.route.stack.at(-1).handle;
}

function responseSpy() {
  return {
    statusCode: 200,
    body: null,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function withConnection(rows, execute) {
  const original = db.getConnection;
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params) {
      queries.push({ sql, params });
      if (/SELECT id, ativo, estoque/.test(sql)) return [rows];
      return [{ affectedRows: 1 }];
    },
  };
  db.getConnection = async () => connection;
  try {
    await execute(queries);
  } finally {
    db.getConnection = original;
  }
}

test('inativação preserva estoque e não emite DELETE físico', async () => {
  const res = responseSpy();
  await withConnection([
    { id: 1, ativo: 1, estoque: 7 },
    { id: 2, ativo: 1, estoque: 3 },
  ], async (queries) => {
    await handler('patch', '/:produtoId/variacoes/:variacaoId/status')({
      params: { produtoId: '10', variacaoId: '1' }, body: { ativo: false }, user: { tipo: 'admin' },
    }, res);

    const update = queries.find(({ sql }) => sql.startsWith('UPDATE produto_variacoes'));
    assert.match(update.sql, /SET ativo = \?/);
    assert.doesNotMatch(update.sql, /estoque\s*=/i);
    assert.doesNotMatch(update.sql, /preco_promocional\s*=/i);
    assert.equal(update.params[0], 0);
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.estoque, 7);
});

test('reativação altera somente ativo e mantém estoque existente', async () => {
  const res = responseSpy();
  await withConnection([
    { id: 1, ativo: 0, estoque: 9 },
    { id: 2, ativo: 1, estoque: 3 },
  ], async (queries) => {
    await handler('patch', '/:produtoId/variacoes/:variacaoId/status')({
      params: { produtoId: '10', variacaoId: '1' }, body: { ativo: true }, user: { tipo: 'admin' },
    }, res);

    const update = queries.find(({ sql }) => sql.startsWith('UPDATE produto_variacoes'));
    assert.equal(update.params[0], 1);
    assert.doesNotMatch(update.sql, /estoque\s*=/i);
    assert.doesNotMatch(update.sql, /preco_promocional\s*=/i);
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.estoque, 9);
});

test('edição que inativa uma variação preserva o estoque já registrado', async () => {
  const original = db.getConnection;
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT id, tamanho, cor, preco, preco_promocional, estoque, ativo')) {
        return [[{
          id: 1, tamanho: 'M', cor: 'Rosa', preco: 100, preco_promocional: null, estoque: 7, ativo: 1,
        }, {
          id: 2, tamanho: 'G', cor: 'Rosa', preco: 100, preco_promocional: null, estoque: 4, ativo: 1,
        }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  db.getConnection = async () => connection;

  try {
    const res = responseSpy();
    await handler('put', '/:id')({
      params: { id: '10' },
      body: {
        nome: 'Blusa', descricao: 'Teste', categoria: '1',
        variacoes: JSON.stringify([{
          id: 1, tamanho: 'M', cor: 'Rosa', preco: 100, preco_promocional: null, estoque: 0, ativo: false,
        }, {
          id: 2, tamanho: 'G', cor: 'Rosa', preco: 100, preco_promocional: null, estoque: 4, ativo: true,
        }]),
      },
      files: [],
    }, res);

    const update = queries.find(({ sql }) => sql.includes('UPDATE produto_variacoes') && sql.includes('preco_promocional'));
    assert.equal(update.params[4], 7);
    assert.equal(update.params[5], 0);
    assert.equal(res.statusCode, 200);
  } finally {
    db.getConnection = original;
  }
});

test('bloqueia inativação da última variação ativa', async () => {
  const res = responseSpy();
  await withConnection([{ id: 1, ativo: 1, estoque: 7 }], async (queries) => {
    await handler('patch', '/:produtoId/variacoes/:variacaoId/status')({
      params: { produtoId: '10', variacaoId: '1' }, body: { ativo: false }, user: { tipo: 'admin' },
    }, res);
    assert.equal(queries.some(({ sql }) => sql.startsWith('UPDATE produto_variacoes')), false);
  });

  assert.equal(res.statusCode, 409);
  assert.equal(
    res.body.erro,
    'Este produto precisa possuir pelo menos uma variação ativa. Ative outra variação antes de inativar esta.',
  );
});

test('catálogo público consulta somente variações ativas', async () => {
  const original = db.query;
  const queries = [];
  db.query = async (sql) => {
    queries.push(sql);
    if (sql.includes('FROM produtos p')) return [[{ id: 10, nome: 'Blusa', ativo: 1 }]];
    if (sql.includes('FROM produto_variacoes')) return [[{ id: 2, produto_id: 10, ativo: 1, preco: 100, preco_promocional: 80, preco_efetivo: 80, estoque: 2 }]];
    return [[]];
  };

  try {
    const res = responseSpy();
    await handler('get', '/')({ query: {} }, res);
    const queryVariacoes = queries.find((sql) => sql.includes('FROM produto_variacoes'));
    assert.match(queryVariacoes, /WHERE ativo = 1/);
    assert.equal(res.body[0].variacoes[0].id, 2);
  } finally {
    db.query = original;
  }
});

test('consulta administrativa inclui variações inativas e preços efetivos', async () => {
  const original = db.query;
  const queries = [];
  db.query = async (sql) => {
    queries.push(sql);
    if (sql.includes('FROM produtos p')) return [[{ id: 10, nome: 'Blusa' }]];
    if (sql.includes('FROM produto_imagens')) return [[]];
    return [[{ id: 1, ativo: 0, preco: 100, preco_promocional: 80, preco_efetivo: 80, estoque: 4 }]];
  };

  try {
    const res = responseSpy();
    await handler('get', '/admin/:id')({ params: { id: '10' }, user: { tipo: 'admin' } }, res);
    const queryVariacoes = queries.find((sql) => sql.includes('FROM produto_variacoes'));
    assert.doesNotMatch(queryVariacoes, /AND ativo = 1/);
    assert.equal(res.body.variacoes[0].ativo, 0);
    assert.equal(res.body.variacoes[0].preco_efetivo, 80);
  } finally {
    db.query = original;
  }
});
