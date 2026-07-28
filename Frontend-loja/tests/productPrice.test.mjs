import assert from 'node:assert/strict';
import test from 'node:test';

import {
  obterDadosPrecoCarrinho,
  obterPrecoEfetivoCarrinho,
  obterPrecoParaExibicao,
  promocaoValida,
} from '../src/utils/precoPromocional.js';
import { iniciarCheckoutMercadoPago } from '../src/utils/mercadoPagoCheckout.js';

test('reconhece somente promoções maiores que zero e menores que o preço normal', () => {
  assert.equal(promocaoValida(104.9, 59.9), true);
  assert.equal(promocaoValida(104.9, 0), false);
  assert.equal(promocaoValida(104.9, -1), false);
  assert.equal(promocaoValida(104.9, 104.9), false);
  assert.equal(promocaoValida(104.9, 120), false);
});

test('preserva carrinhos legados e evita totais invalidos', () => {
  assert.equal(obterPrecoEfetivoCarrinho({ preco: '89.90' }), 89.9);
  assert.equal(obterPrecoEfetivoCarrinho({ preco: '89.90', preco_normal: null, preco_promocional: null, preco_efetivo: null }), 89.9);
  assert.equal(obterPrecoEfetivoCarrinho({ preco: '89.90', preco_normal: 'invalido', preco_promocional: 'erro', preco_efetivo: 'erro' }), 89.9);
  assert.equal(Number.isFinite(obterPrecoEfetivoCarrinho({})), true);
});

test('reagrupa variacao preservando preco legado e atualizando metadados visuais', () => {
  const anterior = { preco: 104.9, quantidade: 1, preco_normal: 104.9, preco_promocional: null, preco_efetivo: 104.9 };
  const reagrupado = {
    ...anterior,
    ...obterDadosPrecoCarrinho({ preco: 104.9, preco_promocional: 59.9 }),
    quantidade: anterior.quantidade + 1,
  };

  assert.equal(reagrupado.quantidade, 2);
  assert.equal(reagrupado.preco, 104.9);
  assert.deepEqual(
    { preco_normal: reagrupado.preco_normal, preco_promocional: reagrupado.preco_promocional, preco_efetivo: reagrupado.preco_efetivo },
    { preco_normal: 104.9, preco_promocional: 59.9, preco_efetivo: 59.9 },
  );
});

test('checkout mantem contrato legado sem metadados visuais', async () => {
  const chamadas = [];
  const dados = new Map();
  const storage = {
    getItem: (key) => dados.get(key) || null,
    setItem: (key, value) => dados.set(key, String(value)),
    removeItem: (key) => dados.delete(key),
  };
  const apiClient = {
    post: async (url, body) => {
      chamadas.push({ url, body });
      return url === '/pedidos'
        ? { data: { pedido_id: 77 } }
        : { data: { checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc' } };
    },
  };

  await iniciarCheckoutMercadoPago({
    apiClient,
    carrinho: [{ produto_id: 1, variacao_id: 2, quantidade: 3, preco: 104.9, preco_normal: 104.9, preco_promocional: 59.9, preco_efetivo: 59.9 }],
    storage,
    redirect: () => {},
  });

  assert.deepEqual(chamadas[0].body.itens, [{ produto_id: 1, variacao_id: 2, quantidade: 3, preco: 104.9 }]);
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

test('mantém no carrinho os metadados necessários para a apresentação promocional', () => {
  assert.deepEqual(
    obterDadosPrecoCarrinho({ preco: 104.9, preco_promocional: 59.9 }),
    { preco_normal: 104.9, preco_promocional: 59.9, preco_efetivo: 59.9 },
  );
});
