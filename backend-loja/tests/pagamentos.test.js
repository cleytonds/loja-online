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
  regularizarPedidoEntregue,
} = await import('../src/routes/pagamentos.js');

test('aceita somente pedido pendente e ainda não expirado para Mercado Pago', () => {
  assert.equal(
    pedidoEstaPagavel({ status: 'pendente', expires_at: new Date(Date.now() + 60_000) }),
    true,
  );

  for (const status of [
    'aguardando_confirmacao',
    'pago',
    'enviado',
    'entregue',
    'cancelado',
    'expirado',
  ]) {
    assert.equal(pedidoEstaPagavel({ status, expires_at: new Date(Date.now() + 60_000) }), false);
  }

  assert.equal(
    pedidoEstaPagavel({ status: 'pendente', expires_at: new Date(Date.now() - 60_000) }),
    false,
  );
});

test('deriva a vigência oficial da preferência do mesmo expires_at do pedido', () => {
  const createdAt = new Date(Date.now());
  const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
  const validade = montarValidadePreferencia(expiresAt, createdAt);

  assert.equal(validade.expirationDateTo, expiresAt.toISOString());
  assert.equal(validade.expirationDateFrom, createdAt.toISOString());
  assert.equal(
    new Date(validade.expirationDateTo).getTime() - new Date(validade.expirationDateFrom).getTime(),
    10 * 60 * 1000,
  );
  assert.throws(() => montarValidadePreferencia(new Date(Date.now() - 1), createdAt), /expirado/);
});

test('monta itens do banco em BRL e compara total em centavos', () => {
  const itens = montarItens(
    [
      { produto_id: 10, variacao_id: 20, nome: 'Blusa', quantidade: 2, preco: '19.99' },
      { produto_id: 11, variacao_id: null, nome: 'Saia', quantidade: 1, preco: '10.02' },
    ],
    '50.00',
  );

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
    selecionarCheckoutUrl(
      { sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: 'https://producao.test' },
      'sandbox',
    ),
    'https://sandbox.test',
  );
  assert.equal(
    selecionarCheckoutUrl(
      { sandboxCheckoutUrl: null, checkoutUrl: 'https://producao.test' },
      'sandbox',
    ),
    null,
  );
  assert.equal(
    selecionarCheckoutUrl(
      { sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: 'https://producao.test' },
      'production',
    ),
    'https://producao.test',
  );
  assert.equal(
    selecionarCheckoutUrl(
      { sandboxCheckoutUrl: 'https://sandbox.test', checkoutUrl: null },
      'production',
    ),
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
      id: 999,
      usuario_id: 7,
      status: 'expirado',
      total: '20.00',
      pagamento: 'mercado_pago',
      mp_payment_id: '555',
      pagamento_confirmado_em: null,
      reconciliacao_status: 'resolvida_atendimento',
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
  const pagamento = {
    paymentId: '555',
    externalReference: '999',
    currencyId: 'BRL',
    valorPago: '20.00',
    collectorId: '1',
    status: 'approved',
    statusDetail: 'accredited',
    dataAprovacao: new Date(),
  };

  const primeiro = await aceitarPagamentoReconciliado(connection, {
    pedidoId: 999,
    pagamento,
    adminId: 1,
  });
  const segundo = await aceitarPagamentoReconciliado(connection, {
    pedidoId: 999,
    pagamento,
    adminId: 1,
  });

  assert.deepEqual(primeiro, { pedidoId: 999, status: 'pago', idempotente: false });
  assert.deepEqual(segundo, { pedidoId: 999, status: 'pago', idempotente: true });
  assert.equal(state.estoque, 1);
  assert.equal(state.baixas, 1);
  assert.ok(state.pedido.pagamento_confirmado_em);
});

test('recusa dados operacionais inválidos sem baixar estoque', async () => {
  const criarCenario = () => {
    const state = {
      pedido: {
        id: 998,
        status: 'expirado',
        total: '20.00',
        pagamento: 'mercado_pago',
        mp_payment_id: '554',
        pagamento_confirmado_em: null,
        reconciliacao_status: 'pendente',
      },
      estoque: 1,
      baixas: 0,
    };
    const connection = {
      query: async (sql) => {
        if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[state.pedido]];
        if (sql.includes('FROM pedido_itens')) return [[{ variacao_id: 4, quantidade: 1 }]];
        if (sql.includes('FROM produto_variacoes')) return [[{ id: 4, estoque: state.estoque }]];
        if (sql.includes('SET estoque = estoque -')) {
          state.baixas += 1;
          return [{ affectedRows: 1 }];
        }
        throw new Error(`SQL inesperado: ${sql}`);
      },
    };
    return { state, connection };
  };
  const base = {
    paymentId: '554',
    externalReference: '998',
    currencyId: 'BRL',
    valorPago: '20.00',
    collectorId: '1',
    status: 'approved',
    dataAprovacao: new Date(),
  };
  for (const overrides of [
    { status: 'pending' },
    { externalReference: '999' },
    { valorPago: '19.99' },
    { paymentId: '555' },
    { dataAprovacao: null },
    { dataAprovacao: 'invalida' },
  ]) {
    const { state, connection } = criarCenario();
    await assert.rejects(() =>
      aceitarPagamentoReconciliado(connection, {
        pedidoId: 998,
        pagamento: { ...base, ...overrides },
        adminId: 1,
      }),
    );
    assert.equal(state.baixas, 0);
    assert.equal(state.pedido.status, 'expirado');
  }
  const { state, connection } = criarCenario();
  state.estoque = 0;
  await assert.rejects(() =>
    aceitarPagamentoReconciliado(connection, { pedidoId: 998, pagamento: base, adminId: 1 }),
  );
  assert.equal(state.baixas, 0);

  const estorno = criarCenario();
  estorno.state.pedido.reconciliacao_status = 'resolvida_estorno';
  await assert.rejects(() =>
    aceitarPagamentoReconciliado(estorno.connection, {
      pedidoId: 998,
      pagamento: base,
      adminId: 1,
    }),
  );
  assert.equal(estorno.state.baixas, 0);
});

test('regularização do pedido 111 registra auditoria, não mexe no estoque e é idempotente', async () => {
  const anterior = process.env.MERCADO_PAGO_COLLECTOR_ID;
  process.env.MERCADO_PAGO_COLLECTOR_ID = '1';
  try {
    const state = {
      pedido: {
        id: 111,
        status: 'pendente',
        total: '390.00',
        expires_at: new Date('2026-11-17T16:33:21.000Z'),
        pagamento: 'mercado_pago',
        mp_payment_id: '9001',
        mp_status: 'approved',
        mp_status_detail: 'accredited',
        pagamento_confirmado_em: null,
        reconciliacao_status: 'pendente',
        reconciliacao_motivo: 'Pagamento aprovado após expiração',
      },
      auditorias: [],
      estoqueQueries: 0,
      updates: 0,
    };
    const connection = {
      query: async (sql, params = []) => {
        if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[state.pedido]];
        if (sql.includes('produto_variacoes') || sql.includes('pedido_itens')) {
          state.estoqueQueries++;
          throw new Error('Estoque não pode ser alterado');
        }
        if (sql.includes('INSERT INTO pagamento_eventos')) {
          state.auditorias.push({ id: params[0], payload: JSON.parse(params[2]) });
          return [{ affectedRows: 1 }];
        }
        if (sql.includes("SET status = 'entregue'")) {
          state.updates++;
          state.pedido.status = 'entregue';
          state.pedido.pagamento_confirmado_em = params[0];
          state.pedido.reconciliacao_status = 'resolvida_atendimento';
          return [{ affectedRows: 1 }];
        }
        throw new Error(`SQL inesperado: ${sql}`);
      },
    };
    const pagamento = {
      paymentId: '9001',
      externalReference: '111',
      currencyId: 'BRL',
      valorPago: '390.00',
      collectorId: '1',
      status: 'approved',
      statusDetail: 'accredited',
      dataAprovacao: '2026-11-17T12:33:22.000-04:00',
    };
    const dados = {
      pedidoId: 111,
      pagamento,
      adminId: 7,
      entregaConfirmada: true,
      estoqueConferido: true,
      evidenciaTipo: 'conferencia_operacional',
      evidenciaReferencia: 'conferencia-loja-111',
      motivo: 'Entrega e estoque confirmados pela administracao',
    };
    assert.deepEqual(await regularizarPedidoEntregue(connection, dados), {
      pedidoId: 111,
      status: 'entregue',
      idempotente: false,
    });
    assert.deepEqual(await regularizarPedidoEntregue(connection, dados), {
      pedidoId: 111,
      status: 'entregue',
      idempotente: true,
    });
    assert.equal(state.estoqueQueries, 0);
    assert.equal(state.updates, 1);
    assert.equal(state.auditorias.length, 1);
    assert.equal(state.auditorias[0].payload.estado_anterior.status, 'pendente');
    assert.equal(state.auditorias[0].payload.declaracao_operacional.verificacao_tecnica, false);
    assert.equal(
      state.auditorias[0].payload.declaracao_operacional.reserva_legada_comprovada,
      false,
    );
  } finally {
    if (anterior === undefined) delete process.env.MERCADO_PAGO_COLLECTOR_ID;
    else process.env.MERCADO_PAGO_COLLECTOR_ID = anterior;
  }
});

test('regularização do pedido 111 rejeita dados e estados inconsistentes sem escrever no banco', async () => {
  const anterior = process.env.MERCADO_PAGO_COLLECTOR_ID;
  process.env.MERCADO_PAGO_COLLECTOR_ID = '1';
  try {
    const criar = (overrides = {}) => {
      const pedido = {
        id: 111,
        status: 'pendente',
        total: '390.00',
        expires_at: new Date('2026-11-01T10:00:00Z'),
        pagamento: 'mercado_pago',
        mp_payment_id: '9002',
        mp_status: 'approved',
        pagamento_confirmado_em: null,
        reconciliacao_status: 'pendente',
        ...overrides,
      };
      let escritas = 0;
      return {
        pedido,
        get escritas() {
          return escritas;
        },
        connection: {
          query: async (sql) => {
            if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[pedido]];
            escritas++;
            throw new Error(`Escrita inesperada: ${sql}`);
          },
        },
      };
    };
    const base = {
      paymentId: '9002',
      externalReference: '111',
      currencyId: 'BRL',
      valorPago: '390.00',
      collectorId: '1',
      status: 'approved',
      dataAprovacao: '2026-11-01T10:05:00Z',
    };
    const dados = {
      pedidoId: 111,
      adminId: 7,
      entregaConfirmada: true,
      estoqueConferido: true,
      evidenciaTipo: 'conferencia_operacional',
      evidenciaReferencia: 'conferencia-loja-111',
      motivo: 'Entrega e estoque confirmados pela administracao',
    };
    const pagamentosInvalidos = [
      { status: 'pending' },
      { paymentId: '9003' },
      { externalReference: '112' },
      { valorPago: '389.99' },
      { currencyId: 'USD' },
      { collectorId: '2' },
      { dataAprovacao: '2026-11-01T09:55:00Z' },
      { dataAprovacao: null },
    ];
    for (const alteracoes of pagamentosInvalidos) {
      const c = criar();
      await assert.rejects(() =>
        regularizarPedidoEntregue(c.connection, {
          ...dados,
          pagamento: { ...base, ...alteracoes },
        }),
      );
      assert.equal(c.escritas, 0);
    }
    for (const estado of [
      { status: 'expirado' },
      { status: 'cancelado' },
      { reconciliacao_status: 'resolvida_estorno' },
      { pagamento_confirmado_em: new Date() },
    ]) {
      const c = criar(estado);
      await assert.rejects(() =>
        regularizarPedidoEntregue(c.connection, { ...dados, pagamento: base }),
      );
      assert.equal(c.escritas, 0);
    }
    const c = criar();
    await assert.rejects(() =>
      regularizarPedidoEntregue(c.connection, {
        ...dados,
        pagamento: base,
        evidenciaReferencia: '',
      }),
    );
    assert.equal(c.escritas, 0);
    await assert.rejects(
      () => regularizarPedidoEntregue(c.connection, { ...dados, pedidoId: 112, pagamento: base }),
      /não autorizada/,
    );
    assert.equal(c.escritas, 0);
  } finally {
    if (anterior === undefined) delete process.env.MERCADO_PAGO_COLLECTOR_ID;
    else process.env.MERCADO_PAGO_COLLECTOR_ID = anterior;
  }
});

test('falha de auditoria impede a atualização do pedido 111', async () => {
  const anterior = process.env.MERCADO_PAGO_COLLECTOR_ID;
  process.env.MERCADO_PAGO_COLLECTOR_ID = '1';
  try {
    const pedido = {
      id: 111,
      status: 'pendente',
      total: '390.00',
      expires_at: new Date('2026-11-01T10:00:00Z'),
      pagamento: 'mercado_pago',
      mp_payment_id: '9004',
      mp_status: 'approved',
      pagamento_confirmado_em: null,
      reconciliacao_status: 'pendente',
    };
    let atualizacoes = 0;
    const connection = {
      query: async (sql) => {
        if (sql.includes('FROM pedidos WHERE id = ? FOR UPDATE')) return [[pedido]];
        if (sql.includes('INSERT INTO pagamento_eventos'))
          throw new Error('Falha simulada de auditoria');
        if (sql.includes("SET status = 'entregue'")) {
          atualizacoes++;
          return [{ affectedRows: 1 }];
        }
        throw new Error(`SQL inesperado: ${sql}`);
      },
    };
    await assert.rejects(
      () =>
        regularizarPedidoEntregue(connection, {
          pedidoId: 111,
          adminId: 7,
          entregaConfirmada: true,
          estoqueConferido: true,
          evidenciaTipo: 'conferencia_operacional',
          evidenciaReferencia: 'conferencia-loja-111',
          motivo: 'Entrega confirmada pela administracao',
          pagamento: {
            paymentId: '9004',
            externalReference: '111',
            currencyId: 'BRL',
            valorPago: '390.00',
            collectorId: '1',
            status: 'approved',
            dataAprovacao: '2026-11-01T10:05:00Z',
          },
        }),
      /Falha simulada/,
    );
    assert.equal(atualizacoes, 0);
    assert.equal(pedido.status, 'pendente');
  } finally {
    if (anterior === undefined) delete process.env.MERCADO_PAGO_COLLECTOR_ID;
    else process.env.MERCADO_PAGO_COLLECTOR_ID = anterior;
  }
});
