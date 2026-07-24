import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';

const [{ default: router }, { default: db }] = await Promise.all([
  import('../src/routes/products.routes.js'),
  import('../src/config/database.js'),
]);

const createRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.post);
const createHandler = createRoute.route.stack.at(-1).handle;

function responseSpy() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function requestWithFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlmodas-product-'));
  const filePath = path.join(dir, 'produto.jpg');
  fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
  return {
    dir,
    req: {
      body: {
        nome: 'Produto teste', preco: '29.90', descricao: 'Teste', categoria: '1',
        variacoes: JSON.stringify([{ tamanho: 'M', cor: 'Rosa', preco: 29.9, estoque: 2 }]),
      },
      files: [{ path: filePath, filename: 'produto.jpg', originalname: 'produto.jpg' }],
    },
  };
}

async function comConexaoFake({ failAt } = {}, executar) {
  const original = db.getConnection;
  const calls = { begin: 0, commit: 0, rollback: 0, release: 0, query: 0 };
  const connection = {
    async beginTransaction() { calls.begin += 1; },
    async commit() { calls.commit += 1; },
    async rollback() { calls.rollback += 1; },
    release() { calls.release += 1; },
    async query() {
      calls.query += 1;
      if (calls.query === failAt) throw new Error('falha simulada');
      if (calls.query === 1) return [{ insertId: 71 }];
      return [{ affectedRows: 1 }];
    },
  };
  db.getConnection = async () => connection;
  try {
    await executar(calls);
  } finally {
    db.getConnection = original;
  }
}

test('criação de produto confirma produto, imagens e variações em uma transação', async () => {
  const { dir, req } = requestWithFile();
  const res = responseSpy();
  try {
    await comConexaoFake({}, async (calls) => {
      await createHandler(req, res);
      assert.equal(calls.begin, 1);
      assert.equal(calls.commit, 1);
      assert.equal(calls.rollback, 0);
      assert.equal(calls.release, 1);
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Produto criado com sucesso');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

for (const [stage, failAt] of [['produto', 1], ['imagem', 2], ['variação', 3]]) {
  test(`falha ao inserir ${stage} faz rollback, limpa upload e libera conexão`, async () => {
    const { dir, req } = requestWithFile();
    const res = responseSpy();
    try {
      await comConexaoFake({ failAt }, async (calls) => {
        await createHandler(req, res);
        assert.equal(calls.begin, 1);
        assert.equal(calls.commit, 0);
        assert.equal(calls.rollback, 1);
        assert.equal(calls.release, 1);
      });
      assert.equal(res.statusCode, 500);
      assert.equal(fs.existsSync(req.files[0].path), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
