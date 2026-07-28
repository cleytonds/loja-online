import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizarPrecoPromocional,
  normalizarVariacaoParaEdicao,
  validarPrecoPromocionalVariacao,
} from '../src/utils/variacoesAdmin.js';

test('aceita promoção vazia e normaliza o campo para remoção da promoção', () => {
  assert.equal(normalizarPrecoPromocional(''), null);
  assert.equal(normalizarPrecoPromocional('   '), null);
  assert.equal(validarPrecoPromocionalVariacao('100', ''), null);
});

test('aceita promoção válida e rejeita valores inválidos no formulário administrativo', () => {
  assert.equal(validarPrecoPromocionalVariacao('100', '80'), null);
  assert.match(validarPrecoPromocionalVariacao('100', '0'), /maior que zero/);
  assert.match(validarPrecoPromocionalVariacao('100', '100'), /menor que o preço normal/);
  assert.match(validarPrecoPromocionalVariacao('100', '120'), /menor que o preço normal/);
  assert.match(validarPrecoPromocionalVariacao('100', 'invalido'), /maior que zero/);
});

test('normaliza variação administrativa mantendo o status e campo promocional editável', () => {
  const ativa = normalizarVariacaoParaEdicao({ id: 1, ativo: 1, preco_promocional: null });
  const inativa = normalizarVariacaoParaEdicao({ id: 2, ativo: 0, preco_promocional: 79.9 });

  assert.deepEqual(ativa, { id: 1, ativo: true, preco_promocional: '' });
  assert.deepEqual(inativa, { id: 2, ativo: false, preco_promocional: 79.9 });
});
