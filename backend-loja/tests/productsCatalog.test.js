import test from 'node:test';
import assert from 'node:assert/strict';

import { buildVariacaoPlan, normalizeVariacoesPayload } from '../src/utils/produtoCatalog.js';

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
    { tamanho: 'P', cor: 'Azul', preco: '10.50', estoque: '3' },
    { tamanho: 'M', cor: 'Verde', preco: '15', estoque: '2' },
  ];

  const normalized = normalizeVariacoesPayload(payload);

  assert.equal(normalized[0].preco, 10.5);
  assert.equal(normalized[0].estoque, 3);
  assert.equal(normalized[1].estoque, 2);
});
