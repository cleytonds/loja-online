import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MERCADO_PAGO_ACCESS_TOKEN ||= 'TEST-mercado-pago-access-token';

import 'dotenv/config';

const {
  montarItens,
  pedidoEstaPagavel,
  removerBarraFinal,
  selecionarCheckoutUrl,
  configurarMeiosPagamento,
  montarValidadePreferencia,
} = await import('../src/routes/pagamentos.js');

test('aceita somente pedido pendente e ainda não expirado para Mercado Pago', () => {
  assert.equal(pedidoEstaPagavel({ status: 'pendente', expires_at: new Date(Date.now() + 60_000) }), true);

  for (const status of ['aguardando_confirmacao', 'pago', 'enviado', 'entregue', 'cancelado', 'expirado']) {
    assert.equal(pedidoEstaPagavel({ status, expires_at: new Date(Date.now() + 60_000) }), false);
  }

  assert.equal(pedidoEstaPagavel({ status: 'pendente', expires_at: new Date(Date.now() - 60_000) }), false);
});

test('deriva a vigência oficial da preferência do mesmo expires_at do pedido', () => {
  const createdAt = new Date(Date.now());
  const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
  const validade = montarValidadePreferencia(expiresAt, createdAt);

  assert.equal(validade.expirationDateTo, expiresAt.toISOString());
  assert.equal(validade.expirationDateFrom, createdAt.toISOString());
  assert.equal(new Date(validade.expirationDateTo).getTime() - new Date(validade.expirationDateFrom).getTime(), 10 * 60 * 1000);
  assert.throws(
    () => montarValidadePreferencia(new Date(Date.now() - 1), createdAt),
    /expirado/,
  );
});

test('monta itens do banco em BRL e compara total em centavos', () => {
  const itens = montarItens([
    { produto_id: 10, variacao_id: 20, nome: 'Blusa', quantidade: 2, preco: '19.99' },
    { produto_id: 11, variacao_id: null, nome: 'Saia', quantidade: 1, preco: '10.02' },
  ], '50.00');

  assert.deepEqual(itens, [
    { id: '20', title: 'Blusa', quantity: 2, unit_price: 19.99, currency_id: 'BRL' },
    { id: '11', title: 'Saia', quantity: 1, unit_price: 10.02, currency_id: 'BRL' },
  ]);
});

test('bloqueia divergência entre itens e total e pedido sem itens', () => {
  assert.throws(
    () => montarItens([{ produto_id: 1, nome: 'Produto', quantidade: 1, preco: '10.00' }], '10.01'),
    /Divergência/,
  );
  assert.throws(() => montarItens([], '0.00'), /sem itens/);
  assert.throws(
    () => montarItens([{ produto_id: 1, nome: 'Produto', quantidade: 1, preco: '10.00' }], '0.00'),
    /Total inválido/,
  );
});

test('normaliza barras finais nas URLs configuradas', () => {
  assert.equal(removerBarraFinal('https://loja.test///'), 'https://loja.test');
});

test('seleciona URL sandbox em teste e nunca aceita URL ausente', () => {
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: 'https://producao.test' }, 'teste'),
    'https://sandbox.test',
  );
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: null, checkoutUrl: 'https://producao.test' }, 'teste'),
    'https://producao.test',
  );
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: null }, 'producao'),
    null,
  );
});

test('valida MP_MAX_INSTALLMENTS com padrão seguro entre 1 e 12', () => {
  assert.equal(configurarMeiosPagamento(undefined).installments, 12);
  assert.equal(configurarMeiosPagamento('1').installments, 1);
  assert.equal(configurarMeiosPagamento('6').installments, 6);
  assert.equal(configurarMeiosPagamento('12').installments, 12);
  assert.equal(configurarMeiosPagamento('0').installments, 12);
  assert.equal(configurarMeiosPagamento('-1').installments, 12);
  assert.equal(configurarMeiosPagamento('13').installments, 12);
  assert.equal(configurarMeiosPagamento('6.5').installments, 12);
  assert.equal(configurarMeiosPagamento('invalido').installments, 12);

  const configuracao = configurarMeiosPagamento('6');
  const excluidos = configuracao.excluded_payment_types.map(({ id }) => id);
  assert.deepEqual(excluidos, ['ticket', 'atm', 'debit_card', 'prepaid_card']);
  assert.equal(excluidos.includes('account_money'), false);
  assert.equal(excluidos.includes('bank_transfer'), false);
  assert.equal(excluidos.includes('credit_card'), false);
});
