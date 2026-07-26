import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';

const { default: db } = await import('../src/config/database.js');
const {
  PRAZO_RESERVA_MERCADO_PAGO_MINUTOS,
  expirarPedidosPendentes,
  prazoReservaMinutos,
} = await import('../src/routes/pedidos.js');

function createExpirationConnection(state) {
  const podeExpirar = () => state.status === 'pendente'
    && state.vencido
    && state.mpStatus !== 'approved'
    && !state.pagamentoConfirmado;

  return {
    beginTransaction: async () => { state.begins += 1; },
    commit: async () => { state.commits += 1; },
    rollback: async () => { state.rollbacks += 1; },
    release: () => { state.releases += 1; },
    query: async (sql, params = []) => {
      if (sql.includes("SELECT id\nFROM pedidos")) {
        return [[podeExpirar() ? { id: state.id } : null].filter(Boolean)];
      }
      if (sql.includes('SELECT id\n          FROM pedidos')) {
        return [[podeExpirar() ? { id: state.id } : null].filter(Boolean)];
      }
      if (sql.includes("UPDATE pedidos\nSET status='expirado'")) {
        if (podeExpirar()) {
          state.status = 'expirado';
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }
      if (sql.includes('FROM pedido_itens')) return [state.itens];
      if (sql.includes('UPDATE produto_variacoes')) {
        state.estoqueDevolvido += Number(params[0]);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`SQL inesperado: ${sql}`);
    },
  };
}

async function withSchedulerState(t, state) {
  const originalGetConnection = db.getConnection;
  const connection = createExpirationConnection(state);
  db.getConnection = async () => connection;
  t.after(() => { db.getConnection = originalGetConnection; });
  await expirarPedidosPendentes();
  return state;
}

test('Mercado Pago usa prazo único de 10 minutos em Sandbox e produção', () => {
  assert.equal(PRAZO_RESERVA_MERCADO_PAGO_MINUTOS, 10);
  assert.equal(prazoReservaMinutos('mercado_pago', { MP_ENVIRONMENT: 'production' }), 10);
  assert.equal(prazoReservaMinutos('mercado_pago', { MP_ENVIRONMENT: 'sandbox' }), 10);
  assert.equal(prazoReservaMinutos('pix', { MP_ENVIRONMENT: 'sandbox' }), 10);
  assert.equal(prazoReservaMinutos('whatsapp', { MP_ENVIRONMENT: 'sandbox' }), 10);
});

test('pedido Mercado Pago antes de 10 minutos não expira nem devolve estoque', async (t) => {
  const state = {
    id: 900, status: 'pendente', vencido: false, itens: [{ variacao_id: 4, quantidade: 2 }],
    estoqueDevolvido: 0, begins: 0, commits: 0, rollbacks: 0, releases: 0,
  };
  await withSchedulerState(t, state);
  assert.equal(state.status, 'pendente');
  assert.equal(state.estoqueDevolvido, 0);
  assert.equal(state.begins, 0);
  assert.equal(state.releases, 1);
});

test('pedido Mercado Pago vencido expira e devolve estoque apenas uma vez em retries', async (t) => {
  const state = {
    id: 901, status: 'pendente', vencido: true, itens: [{ variacao_id: 5, quantidade: 3 }],
    estoqueDevolvido: 0, begins: 0, commits: 0, rollbacks: 0, releases: 0,
  };
  const originalGetConnection = db.getConnection;
  const connection = createExpirationConnection(state);
  db.getConnection = async () => connection;
  t.after(() => { db.getConnection = originalGetConnection; });

  await expirarPedidosPendentes();
  await expirarPedidosPendentes();

  assert.equal(state.status, 'expirado');
  assert.equal(state.estoqueDevolvido, 3);
  assert.equal(state.commits, 1);
  assert.equal(state.releases, 2);
});

test('scheduler não expira pedido já pago nem devolve estoque', async (t) => {
  const state = {
    id: 902, status: 'pago', vencido: true, itens: [{ variacao_id: 6, quantidade: 1 }],
    estoqueDevolvido: 0, begins: 0, commits: 0, rollbacks: 0, releases: 0,
  };
  await withSchedulerState(t, state);
  assert.equal(state.status, 'pago');
  assert.equal(state.estoqueDevolvido, 0);
  assert.equal(state.commits, 0);
});

test('scheduler não expira pedido pendente com aprovação Mercado Pago persistida', async (t) => {
  const state = {
    id: 904, status: 'pendente', vencido: true, mpStatus: 'approved', pagamentoConfirmado: false,
    itens: [{ variacao_id: 8, quantidade: 2 }], estoqueDevolvido: 0,
    begins: 0, commits: 0, rollbacks: 0, releases: 0,
  };
  await withSchedulerState(t, state);
  assert.equal(state.status, 'pendente');
  assert.equal(state.estoqueDevolvido, 0);
  assert.equal(state.commits, 0);
});

test('scheduler observa confirmação concorrente e não devolve a reserva', async (t) => {
  const state = {
    id: 903, status: 'pago', vencido: true, itens: [{ variacao_id: 7, quantidade: 4 }],
    estoqueDevolvido: 0, begins: 0, commits: 0, rollbacks: 0, releases: 0,
  };
  await withSchedulerState(t, state);
  assert.equal(state.status, 'pago');
  assert.equal(state.estoqueDevolvido, 0);
  assert.equal(state.begins, 0);
});
