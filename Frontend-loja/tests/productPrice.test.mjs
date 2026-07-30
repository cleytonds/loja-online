import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  obterDadosPrecoCarrinho,
  obterClassesPreco,
  obterPrecoEfetivoCarrinho,
  obterPrecoParaExibicao,
  promocaoValida,
} from '../src/utils/precoPromocional.js';

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

test('Carrinho usa preços efetivos e preserva o checkout direto atual', () => {
  const carrinho = fs.readFileSync(new URL('../src/pages/Carrinho.jsx', import.meta.url), 'utf8');

  assert.match(carrinho, /import ProductPrice from ['"]\.\.\/components\/ProductPrice\.jsx['"];?/);
  assert.match(carrinho, /import \{ obterPrecoEfetivoCarrinho \} from ['"]\.\.\/utils\/precoPromocional\.js['"];?/);
  assert.match(carrinho, /obterPrecoEfetivoCarrinho\(item\) \* \(Number\(item\.quantidade\) \|\| 0\)/);
  assert.match(carrinho, /<ProductPrice\s+className="item-preco-unitario"[\s\S]*preco: item\.preco_normal \?\? item\.preco,[\s\S]*preco_promocional: item\.preco_promocional,/);
  assert.match(carrinho, /<ProductPrice preco=\{precoEfetivo \* \(Number\(item\.quantidade\) \|\| 0\)\} \/>/);
  assert.match(carrinho, /<span>Subtotal<\/span>\s*<ProductPrice preco=\{total\} \/>/);
  assert.match(carrinho, /<span>Total<\/span>\s*<ProductPrice preco=\{total\} \/>/);

  assert.match(carrinho, /api\.post\(\s*['"]\/pedidos['"]/);
  assert.match(carrinho, /\/pagamentos\/mercado-pago\/preferencia\/\$\{pedidoId\}/);
  assert.match(carrinho, /limparCarrinho\(\);\s*window\.location\.assign\(checkoutUrl\);/);
  assert.doesNotMatch(carrinho, /mercadoPagoCheckout|iniciarCheckoutMercadoPago|recuperarTentativaCheckout|checkoutPendente|checkoutEmAndamento/);
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

test('contrato visual mantém preços promocionais lado a lado, com normal riscado e promocional destacado', () => {
  const css = fs.readFileSync(new URL('../src/components/ProductPrice.css', import.meta.url), 'utf8');

  assert.match(css, /\.product-price\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.product-price\s*\{[\s\S]*align-items:\s*baseline/);
  assert.match(css, /\.product-price__normal\s*\{[\s\S]*text-decoration:\s*line-through/);
  assert.match(css, /\.product-price__promotional\s*\{[\s\S]*font-size:\s*1\.14em/);
  assert.match(css, /\.product-price\s*\{[\s\S]*color:\s*var\(--gold-dark/);
  assert.match(css, /\.product-price--promotion\s*\{[\s\S]*color:\s*var\(--primary-dark/);
});

test('preco sem promocao usa somente a classe normal para null, vazio e valores invalidos', () => {
  for (const precoPromocional of [null, '', undefined, 0, 'invalido']) {
    const exibicao = obterPrecoParaExibicao({ variacao: { preco: 60, preco_promocional: precoPromocional } });
    assert.equal(exibicao.temPromocao, false);
    assert.equal(obterClassesPreco(exibicao), 'product-price');
    assert.doesNotMatch(obterClassesPreco(exibicao), /product-price--promotion/);
  }
});

test('preco promocional valido aplica classe promocional para os dois valores lado a lado', () => {
  const exibicao = obterPrecoParaExibicao({ variacao: { preco: 100, preco_promocional: 95 } });
  assert.equal(obterClassesPreco(exibicao), 'product-price product-price--promotion');
});

test('Home não importa nem renderiza ProductPrice, enquanto Produtos continua usando o componente', () => {
  const home = fs.readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  const produtos = fs.readFileSync(new URL('../src/pages/produtos.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(home, /ProductPrice/);
  assert.doesNotMatch(home, /preco_base|produto\.preco/);
  assert.match(produtos, /ProductPrice/);
});
