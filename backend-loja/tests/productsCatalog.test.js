import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildVariacaoPlan,
  normalizeVariacoesPayload,
  obterPrecoEfetivo,
  promocaoEhValida,
  validarPrecoPromocional,
} from '../src/utils/produtoCatalog.js';

test('separa variações existentes, novas e removidas', () => {
  const current = [
    { id: 1, tamanho: 'P', cor: 'Azul', preco: 10, estoque: 5 },
    { id: 2, tamanho: 'M', cor: 'Vermelho', preco: 12, estoque: 2 },
  ];

  const incoming = [
    { id: 1, tamanho: 'P', cor: 'Azul', preco: 11, estoque: 4 },
    { tamanho: 'G', cor: 'Preto', preco: 14, estoque: 1 },
  ];

  const plan = buildVariacaoPlan(current, incoming);

  assert.deepEqual(plan.updates, [
    { id: 1, tamanho: 'P', cor: 'Azul', preco: 11, estoque: 4 },
  ]);
  assert.deepEqual(plan.inserts, [
    { tamanho: 'G', cor: 'Preto', preco: 14, estoque: 1 },
  ]);
  assert.deepEqual(plan.deletions, [2]);
});

test('normaliza payload de variações para valores numéricos', () => {
  const payload = [
    { tamanho: 'P', cor: 'Azul', preco: '10.50', estoque: '3', ativo: false },
    { tamanho: 'M', cor: 'Verde', preco: '15', estoque: '2' },
  ];

  const normalized = normalizeVariacoesPayload(payload);

  assert.equal(normalized[0].preco, 10.5);
  assert.equal(normalized[0].estoque, 3);
  assert.equal(normalized[0].ativo, false);
  assert.equal(normalized[1].estoque, 2);
});

test('aceita promoção válida e calcula o preço efetivo da variação', () => {
  const variacao = normalizeVariacoesPayload([
    { tamanho: 'M', cor: 'Rosa', preco: '120.00', preco_promocional: '89.90', estoque: '2' },
  ])[0];

  validarPrecoPromocional(variacao);
  assert.equal(promocaoEhValida(variacao.preco, variacao.preco_promocional), true);
  assert.equal(obterPrecoEfetivo(variacao), 89.9);
});

for (const precoPromocional of ['0', '-1', '100', '120']) {
  test(`rejeita promoção inválida (${precoPromocional})`, () => {
    const variacao = normalizeVariacoesPayload([
      { tamanho: 'M', cor: 'Rosa', preco: '100', preco_promocional: precoPromocional, estoque: '2' },
    ])[0];

    assert.throws(() => validarPrecoPromocional(variacao), /Preço promocional/);
  });
}

test('sem promoção válida, mantém o preço normal como efetivo', () => {
  assert.equal(obterPrecoEfetivo({ preco: 79.9, preco_promocional: null }), 79.9);
  assert.equal(obterPrecoEfetivo({ preco: 79.9, preco_promocional: 99.9 }), 79.9);
});
