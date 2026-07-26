import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { removerImagensProduto, validarImagensProduto } from '../src/middlewares/uploadProduto.js';

const assinaturas = {
  'foto.jpg': Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  'foto.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'foto.webp': Buffer.from('RIFFxxxxWEBP', 'ascii'),
};

async function validarArquivo(nome, buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlmodas-upload-'));
  const filePath = path.join(dir, nome);
  fs.writeFileSync(filePath, buffer);
  const req = { files: [{ path: filePath, originalname: nome }] };
  const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let nextCalled = false;

  validarImagensProduto(req, res, () => { nextCalled = true; });
  fs.rmSync(dir, { recursive: true, force: true });
  return { nextCalled, res, filePath };
}

for (const [nome, assinatura] of Object.entries(assinaturas)) {
  test(`aceita ${path.extname(nome).slice(1).toUpperCase()} válido no upload de produto`, async () => {
    const resultado = await validarArquivo(nome, assinatura);
    assert.equal(resultado.nextCalled, true);
    assert.equal(resultado.res.statusCode, null);
  });
}

test('bloqueia conteúdo falso disfarçado de JPG e remove o arquivo', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlmodas-upload-'));
  const filePath = path.join(dir, 'falso.jpg');
  fs.writeFileSync(filePath, 'não é imagem');
  const req = { files: [{ path: filePath, originalname: 'falso.jpg' }] };
  const res = { statusCode: null, status(code) { this.statusCode = code; return this; }, json() { return this; } };

  validarImagensProduto(req, res, () => assert.fail('arquivo falso não pode avançar'));
  assert.equal(res.statusCode, 400);
  assert.equal(fs.existsSync(filePath), false);
  removerImagensProduto(req.files);
  fs.rmSync(dir, { recursive: true, force: true });
});
