import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import sharp from 'sharp';

process.env.DB_HOST ||= '127.0.0.1';
process.env.DB_PORT ||= '3306';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';

const previousUploadDir = process.env.UPLOAD_DIR;
const volume = fs.mkdtempSync(path.join(os.tmpdir(), 'dlmodas-multipart-'));
process.env.UPLOAD_DIR = volume;

const [{ default: router }, { default: db }] = await Promise.all([
  import('../src/routes/products.routes.js'),
  import('../src/config/database.js'),
]);
const directory = path.join(volume, 'produtos');
const existingFilename = 'existente.jpg';
const existingPath = path.join(directory, existingFilename);
const jpeg = await sharp({
  create: { width: 1200, height: 1600, channels: 3, background: '#b52f54' },
}).jpeg({ quality: 98, chromaSubsampling: '4:4:4' }).toBuffer();
fs.writeFileSync(existingPath, jpeg);

const createRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.post);
// Keep the real upload/validation/optimization/transaction chain, with authentication outside this test.
const uploadHandlers = createRoute.route.stack.slice(2, -1).map((layer) => layer.handle);
const createHandler = createRoute.route.stack.at(-1).handle;
const validVariations = [{ tamanho: 'M', cor: 'Rosa', preco: 29.9, estoque: 2 }];

afterEach(() => {
  assert.deepEqual(fs.readFileSync(existingPath), jpeg);
  for (const filename of fs.readdirSync(directory)) {
    if (filename !== existingFilename) fs.unlinkSync(path.join(directory, filename));
  }
});

after(() => {
  if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDir;
  assert.equal(path.dirname(volume), path.resolve(os.tmpdir()));
  fs.rmSync(volume, { recursive: true, force: true });
});

async function postMultipart({ variations = validVariations, files = [{ name: 'blusa.jpg', bytes: jpeg }] } = {}) {
  let uploads = null;
  const app = express();
  app.post('/produtos', ...uploadHandlers, (req, res, next) => {
    uploads = req.files.map(({ filename, path: filePath, mimetype, size }) => ({
      filename, path: filePath, mimetype, size, existedBeforeTransaction: fs.existsSync(filePath),
    }));
    next();
  }, createHandler);
  app.use((error, req, res, next) => res.status(500).json({ erro: error.message }));

  const form = new FormData();
  form.append('nome', 'Blusa de teste');
  form.append('preco', '29.90');
  form.append('descricao', 'Upload multipart de teste');
  form.append('categoria', '1');
  form.append('variacoes', JSON.stringify(variations));
  for (const file of files) {
    form.append('imagens', new Blob([file.bytes], { type: 'image/jpeg' }), file.name);
  }

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/produtos`, { method: 'POST', body: form });
    return { status: response.status, body: await response.json(), uploads };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function withDatabase({ failAtVariations = false } = {}, execute) {
  const originalGetConnection = db.getConnection;
  const originalQuery = db.query;
  const calls = { connections: 0, begin: 0, commit: 0, rollback: 0, release: 0, queries: [] };
  db.getConnection = async () => {
    calls.connections += 1;
    return {
      async beginTransaction() { calls.begin += 1; },
      async commit() { calls.commit += 1; },
      async rollback() { calls.rollback += 1; },
      release() { calls.release += 1; },
      async query(sql, params) {
        calls.queries.push({ sql, params });
        if (failAtVariations && sql.includes('INSERT INTO produto_variacoes')) {
          throw new Error('Falha de transação simulada');
        }
        return sql.includes('INSERT INTO produtos') ? [{ insertId: 71 }] : [{ affectedRows: 1 }];
      },
    };
  };
  db.query = async () => assert.fail('O teste não pode consultar banco fora da conexão fake');
  try {
    await execute(calls);
  } finally {
    db.getConnection = originalGetConnection;
    db.query = originalQuery;
  }
}

function assertOptimizedUpload(upload) {
  assert.match(upload.filename, /^[0-9a-f-]+\.optimized\.webp$/);
  assert.equal(upload.mimetype, 'image/webp');
  assert.equal(upload.existedBeforeTransaction, true);
  assert.ok(upload.size < jpeg.length);
}

test('multipart salva WebP e grava no banco a URL do arquivo realmente otimizado', async () => {
  await withDatabase({}, async (calls) => {
    const result = await postMultipart();
    assert.equal(result.status, 200);
    assert.equal(result.body.message, 'Produto criado com sucesso');
    const [upload] = result.uploads;
    assertOptimizedUpload(upload);
    const imageQuery = calls.queries.find(({ sql }) => sql.includes('INSERT INTO produto_imagens'));
    assert.deepEqual(imageQuery.params, [71, `/uploads/produtos/${upload.filename}`, 1]);
    assert.deepEqual(fs.readdirSync(directory).sort(), [existingFilename, upload.filename].sort());
    const metadata = await sharp(fs.readFileSync(upload.path)).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 1600);
    assert.equal(calls.commit, 1);
    assert.equal(calls.rollback, 0);
    assert.equal(calls.release, 1);
  });
});

test('falha de decode em lote multipart limpa todos os uploads e não abre conexão', async () => {
  await withDatabase({}, async (calls) => {
    const result = await postMultipart({ files: [
      { name: 'blusa.jpg', bytes: jpeg },
      { name: 'corrompida.jpg', bytes: Buffer.from([0xff, 0xd8, 0xff, 0x00]) },
    ] });
    assert.equal(result.status, 400);
    assert.equal(result.uploads, null);
    assert.equal(calls.connections, 0);
    assert.deepEqual(fs.readdirSync(directory), [existingFilename]);
  });
});

test('rollback da criação remove os novos arquivos já otimizados', async (t) => {
  t.mock.method(console, 'error', () => {});
  await withDatabase({ failAtVariations: true }, async (calls) => {
    const result = await postMultipart();
    assert.equal(result.status, 500);
    assertOptimizedUpload(result.uploads[0]);
    assert.equal(fs.existsSync(result.uploads[0].path), false);
    assert.equal(calls.begin, 1);
    assert.equal(calls.commit, 0);
    assert.equal(calls.rollback, 1);
    assert.equal(calls.release, 1);
    assert.deepEqual(fs.readdirSync(directory), [existingFilename]);
  });
});

for (const [name, variations] of [
  ['sem variações', []],
  ['com todas as variações inativas', [{ ...validVariations[0], ativo: false }]],
]) {
  test(`retorno 400 ${name} remove o upload otimizado sem consultar banco`, async () => {
    await withDatabase({}, async (calls) => {
      const result = await postMultipart({ variations });
      assert.equal(result.status, 400);
      assertOptimizedUpload(result.uploads[0]);
      assert.equal(fs.existsSync(result.uploads[0].path), false);
      assert.equal(calls.connections, 0);
      assert.deepEqual(fs.readdirSync(directory), [existingFilename]);
    });
  });
}
