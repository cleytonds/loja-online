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
  aceitarPagamentoReconciliado,
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

test('seleciona checkout estritamente pelo ambiente Mercado Pago e nunca aceita URL ausente', () => {
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: 'https://producao.test' }, 'sandbox'),
    'https://sandbox.test',
  );
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: null, checkoutUrl: 'https://producao.test' }, 'sandbox'),
    null,
  );
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: 'https://producao.test' }, 'production'),
    'https://producao.test',
  );
  assert.equal(
    selecionarCheckoutUrl({ sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: null }, 'production'),
    null,
  );
  assert.throws(
    () => selecionarCheckoutUrl({ checkoutUrl: 'https://producao.test' }, 'teste'),
    /MP_ENVIRONMENT inválido/,
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

test('aceita pagamento tardio uma vez e suporta o estado legado resolvida_atendimento', async () => {
  const state = {
    pedido: {
      id: 999, usuario_id: 7, status: 'expirado', total: '20.00', pagamento: 'mercado_pago',
      mp_payment_id: '555', pagamento_confirmado_em: null, reconciliacao_status: 'resolvida_atendimento',
      reconciliacao_motivo: 'Fixture legado',
    },
    estoque: 2,
    baixas: 0,
  };
  const connection = {
    query: async (sql, params = []) => {
      if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[state.pedido]];
      if (sql.includes('FROM pedido_itens')) return [[{ variacao_id: 4, quantidade: 1 }]];
      if (sql.includes('FROM produto_variacoes')) return [[{ id: 4, estoque: state.estoque }]];
      if (sql.includes('SET estoque = estoque -')) {
        state.estoque -= Number(params[0]);
        state.baixas += 1;
        return [{ affectedRows: 1 }];
      }
      if (sql.includes("SET status = 'pago'")) {
        state.pedido.status = 'pago';
        state.pedido.pagamento_confirmado_em = params[0];
        state.pedido.reconciliacao_status = 'resolvida_atendimento';
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
  const pagamento = { paymentId: '555', externalReference: '999', currencyId: 'BRL', valorPago: '20.00', collectorId: '1', status: 'approved', statusDetail: 'accredited', dataAprovacao: new Date() };

  const primeiro = await aceitarPagamentoReconciliado(connection, { pedidoId: 999, pagamento, adminId: 1 });
  const segundo = await aceitarPagamentoReconciliado(connection, { pedidoId: 999, pagamento, adminId: 1 });

  assert.deepEqual(primeiro, { pedidoId: 999, status: 'pago', idempotente: false });
  assert.deepEqual(segundo, { pedidoId: 999, status: 'pago', idempotente: true });
  assert.equal(state.estoque, 1);
  assert.equal(state.baixas, 1);
  assert.ok(state.pedido.pagamento_confirmado_em);
});

test('recusa dados operacionais inválidos sem baixar estoque', async () => {
  const criarCenario = () => {
    const state = { pedido: { id: 998, status: 'expirado', total: '20.00', pagamento: 'mercado_pago', mp_payment_id: '554', pagamento_confirmado_em: null, reconciliacao_status: 'pendente' }, estoque: 1, baixas: 0 };
    const connection = { query: async (sql) => {
      if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[state.pedido]];
      if (sql.includes('FROM pedido_itens')) return [[{ variacao_id: 4, quantidade: 1 }]];
      if (sql.includes('FROM produto_variacoes')) return [[{ id: 4, estoque: state.estoque }]];
      if (sql.includes('SET estoque = estoque -')) { state.baixas += 1; return [{ affectedRows: 1 }]; }
      throw new Error(`SQL inesperado: ${sql}`);
    } };
    return { state, connection };
  };
  const base = { paymentId: '554', externalReference: '998', currencyId: 'BRL', valorPago: '20.00', collectorId: '1', status: 'approved', dataAprovacao: new Date() };
  for (const overrides of [{ status: 'pending' }, { externalReference: '999' }, { valorPago: '19.99' }, { paymentId: '555' }, { dataAprovacao: null }, { dataAprovacao: 'invalida' }]) {
    const { state, connection } = criarCenario();
    await assert.rejects(() => aceitarPagamentoReconciliado(connection, { pedidoId: 998, pagamento: { ...base, ...overrides }, adminId: 1 }));
    assert.equal(state.baixas, 0);
    assert.equal(state.pedido.status, 'expirado');
  }
  const { state, connection } = criarCenario();
  state.estoque = 0;
  await assert.rejects(() => aceitarPagamentoReconciliado(connection, { pedidoId: 998, pagamento: base, adminId: 1 }));
  assert.equal(state.baixas, 0);

  const estorno = criarCenario();
  estorno.state.pedido.reconciliacao_status = 'resolvida_estorno';
  await assert.rejects(() => aceitarPagamentoReconciliado(estorno.connection, { pedidoId: 998, pagamento: base, adminId: 1 }));
  assert.equal(estorno.state.baixas, 0);
});
