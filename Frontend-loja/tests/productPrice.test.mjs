import assert from 'node:assert/strict';
import test from 'node:test';

import { obterPrecoParaExibicao, promocaoValida } from '../src/utils/precoPromocional.js';

test('reconhece somente promoções maiores que zero e menores que o preço normal', () => {
  assert.equal(promocaoValida(104.9, 59.9), true);
  assert.equal(promocaoValida(104.9, 0), false);
  assert.equal(promocaoValida(104.9, -1), false);
  assert.equal(promocaoValida(104.9, 104.9), false);
  assert.equal(promocaoValida(104.9, 120), false);
});

test('retorna preço normal isolado quando não existe promoção válida', () => {
  assert.deepEqual(
    obterPrecoParaExibicao({ variacao: { preco: '104.90', preco_promocional: null } }),
    { precoNormal: 104.9, precoPromocional: null, precoEfetivo: 104.9, temPromocao: false },
  );
});

test('retorna preço normal e promocional quando a promoção é válida', () => {
  assert.deepEqual(
    obterPrecoParaExibicao({ variacao: { preco: 104.9, preco_promocional: '59.90' } }),
    { precoNormal: 104.9, precoPromocional: 59.9, precoEfetivo: 59.9, temPromocao: true },
  );
});
