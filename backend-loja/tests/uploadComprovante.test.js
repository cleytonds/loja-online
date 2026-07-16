import test from 'node:test';
import assert from 'node:assert/strict';

import { isImagemValida } from '../src/middlewares/uploadComprovante.js';

test('aceita sinais de imagem reais para jpeg, png e webp', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

  assert.equal(isImagemValida(jpeg), true);
  assert.equal(isImagemValida(png), true);
  assert.equal(isImagemValida(webp), true);
});

test('rejeita conteúdo não imagem', () => {
  const texto = Buffer.from('isso não é uma imagem');
  assert.equal(isImagemValida(texto), false);
});
