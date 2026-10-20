import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';

const previousUploadDir = process.env.UPLOAD_DIR;
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dlmodas-replacement-'));
process.env.UPLOAD_DIR = testRoot;

const [{ default: router }, { default: db }] = await Promise.all([
  import('../src/routes/products.routes.js'),
  import('../src/config/database.js'),
]);
const updateRoute = router.stack.find((layer) => layer.route?.path === '/:id' && layer.route.methods.put);
const updateHandler = updateRoute.route.stack.at(-1).handle;

after(() => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  assert.equal(path.dirname(testRoot), path.resolve(os.tmpdir()));
  fs.rmSync(testRoot, { recursive: true, force: true });
});

function fixture() {
  const volume = fs.mkdtempSync(path.join(testRoot, 'volume-'));
  process.env.UPLOAD_DIR = volume;
  const directory = path.join(volume, 'produtos');
  fs.mkdirSync(directory);
  const oldPath = path.join(directory, 'anterior.jpg');
  const newPath = path.join(directory, 'nova.optimized.webp');
  fs.writeFileSync(oldPath, 'imagem antiga');
  fs.writeFileSync(newPath, 'novo upload');
  return {
    volume, directory, oldPath, newPath,
    req: {
      params: { id: '71' },
      body: {
        nome: 'Blusa', descricao: 'Teste', categoria: '1',
        variacoes: JSON.stringify([{ id: 31, tamanho: 'M', cor: 'Rosa', preco: 29.9, estoque: 2 }]),
      },
      files: [{ path: newPath, filename: 'nova.optimized.webp' }],
    },
    res: {
      statusCode: 200, body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    },
  };
}

async function withConnection({ oldUrls = ['/uploads/produtos/anterior.jpg'], failQuery, failCommit, failRollback, beforeCommit } = {}, execute) {
  const original = db.getConnection;
  const calls = { begin: 0, commit: 0, rollback: 0, release: 0, queries: [] };
  const connection = {
    async beginTransaction() { calls.begin += 1; },
    async commit() {
      calls.commit += 1;
      beforeCommit?.();
      if (failCommit) throw new Error('commit simulado');
    },
    async rollback() {
      calls.rollback += 1;
      if (failRollback) throw new Error('rollback simulado');
    },
    release() { calls.release += 1; },
    async query(sql, params) {
      calls.queries.push({ sql, params });
      if (failQuery?.test(sql)) throw new Error('query simulada');
      if (sql.includes('SELECT id, tamanho, cor')) {
        return [[{ id: 31, tamanho: 'M', cor: 'Rosa', preco: 29.9, estoque: 2, ativo: 1 }]];
      }
      if (sql.includes('SELECT id, url FROM produto_imagens')) {
        return [oldUrls.map((url, index) => ({ id: index + 1, url }))];
      }
      return [{ affectedRows: 1 }];
    },
  };
  db.getConnection = async () => connection;
  try {
    await execute(calls);
  } finally {
    db.getConnection = original;
  }
}

test('substituição usa o volume configurado e só remove a imagem antiga após commit', async () => {
  const { req, res, oldPath, newPath } = fixture();
  await withConnection({ beforeCommit() { assert.equal(fs.existsSync(oldPath), true); } }, async (calls) => {
    await updateHandler(req, res);
    assert.equal(calls.commit, 1);
    assert.equal(calls.rollback, 0);
    assert.equal(calls.release, 1);
    const insertion = calls.queries.find(({ sql }) => sql.includes('INSERT INTO produto_imagens'));
    assert.deepEqual(insertion.params, ['71', '/uploads/produtos/nova.optimized.webp', 1]);
  });
  assert.equal(res.statusCode, 200);
  assert.equal(fs.existsSync(oldPath), false);
  assert.equal(fs.existsSync(newPath), true);
});

for (const [stage, options] of [
  ['consulta inicial', { failQuery: /UPDATE produtos/ }],
  ['inserção de imagem', { failQuery: /INSERT INTO produto_imagens/ }],
  ['commit', { failCommit: true }],
  ['rollback', { failQuery: /INSERT INTO produto_imagens/, failRollback: true }],
]) {
  test(`falha na ${stage} preserva imagem antiga e limpa todos os novos uploads`, async (t) => {
    t.mock.method(console, 'log', () => {});
    const { req, res, directory, oldPath, newPath } = fixture();
    const secondPath = path.join(directory, 'segunda.optimized.webp');
    fs.writeFileSync(secondPath, 'segundo upload');
    req.files.push({ path: secondPath, filename: 'segunda.optimized.webp' });
    await withConnection(options, async (calls) => {
      await updateHandler(req, res);
      assert.equal(calls.rollback, 1);
      assert.equal(calls.release, 1);
    });
    assert.equal(res.statusCode, 500);
    assert.equal(fs.existsSync(oldPath), true);
    assert.equal(fs.existsSync(newPath), false);
    assert.equal(fs.existsSync(secondPath), false);
  });
}

test('URLs fora de /uploads/produtos ou com traversal nunca são removidas', async () => {
  const { req, res, volume, directory, oldPath, newPath } = fixture();
  const outsidePath = path.join(volume, 'protegida.jpg');
  const nestedDirectory = path.join(directory, 'nested');
  fs.mkdirSync(nestedDirectory);
  const nestedPath = path.join(nestedDirectory, 'protegida.jpg');
  fs.writeFileSync(outsidePath, 'preservar');
  fs.writeFileSync(nestedPath, 'preservar');
  await withConnection({ oldUrls: [
    '/uploads/produtos/anterior.jpg',
    '/uploads/produtos/../protegida.jpg',
    '/uploads/produtos/..\\protegida.jpg',
    '/uploads/produtos/nested/protegida.jpg',
    '/uploads/produtos/..',
    'https://cdn.example.com/uploads/produtos/protegida.jpg',
    '/uploads/produtos/protegida.jpg?download=1',
    '/uploads/produtos/protegida.jpg:stream',
    null,
  ] }, async () => updateHandler(req, res));
  assert.equal(res.statusCode, 200);
  assert.equal(fs.existsSync(oldPath), false);
  assert.equal(fs.existsSync(newPath), true);
  assert.equal(fs.existsSync(outsidePath), true);
  assert.equal(fs.existsSync(nestedPath), true);
});

test('edição sem novos uploads mantém arquivos e referências de imagem existentes', async () => {
  const { req, res, oldPath } = fixture();
  req.files = [];
  await withConnection({}, async (calls) => {
    await updateHandler(req, res);
    assert.equal(calls.commit, 1);
    assert.equal(calls.queries.some(({ sql }) => sql.includes('produto_imagens')), false);
  });
  assert.equal(res.statusCode, 200);
  assert.equal(fs.existsSync(oldPath), true);
});

test('falha ao remover arquivo antigo após commit preserva o novo upload confirmado', async () => {
  const { req, res, oldPath, newPath } = fixture();
  fs.unlinkSync(oldPath);
  fs.mkdirSync(oldPath);
  await withConnection({}, async (calls) => {
    await updateHandler(req, res);
    assert.equal(calls.commit, 1);
    assert.equal(calls.rollback, 0);
  });
  assert.equal(res.statusCode, 200);
  assert.equal(fs.existsSync(newPath), true);
});

test('ID inválido e JSON inválido limpam novos uploads antes de abrir conexão', async (t) => {
  t.mock.method(console, 'log', () => {});
  const original = db.getConnection;
  let connections = 0;
  db.getConnection = async () => { connections += 1; throw new Error('não deveria conectar'); };
  try {
    for (const invalidCase of ['id', 'json']) {
      const { req, res, oldPath, newPath } = fixture();
      if (invalidCase === 'id') req.params.id = 'inválido';
      else req.body.variacoes = '{';
      await updateHandler(req, res);
      assert.equal(res.statusCode, invalidCase === 'id' ? 400 : 500);
      assert.equal(fs.existsSync(oldPath), true);
      assert.equal(fs.existsSync(newPath), false);
    }
    assert.equal(connections, 0);
  } finally {
    db.getConnection = original;
  }
});

test('retorno antecipado por conflito limpa novos uploads e preserva imagens antigas', async () => {
  const { req, res, oldPath, newPath } = fixture();
  req.body.variacoes = '[]';
  await withConnection({}, async (calls) => {
    await updateHandler(req, res);
    assert.equal(calls.commit, 0);
    assert.equal(calls.rollback, 1);
    assert.equal(calls.release, 1);
  });
  assert.equal(res.statusCode, 409);
  assert.equal(fs.existsSync(oldPath), true);
  assert.equal(fs.existsSync(newPath), false);
});
