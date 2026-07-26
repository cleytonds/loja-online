import test from 'node:test';
import assert from 'node:assert/strict';
import { isImagemValida } from '../src/utils/imageMagic.js';

test('aceita assinaturas JPEG, PNG e WEBP e rejeita conteúdo inválido', () => {
  assert.equal(isImagemValida(Buffer.from([0xff, 0xd8, 0xff])), true);
  assert.equal(isImagemValida(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(isImagemValida(Buffer.from('RIFFxxxxWEBP', 'ascii')), true);
  assert.equal(isImagemValida(Buffer.from('arquivo texto')), false);
});
