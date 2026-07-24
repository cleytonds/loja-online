import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classificarResultadoReconciliacao,
  dadosRetornoSaoValidos,
  extrairParametrosRetornoPagamento,
  mensagemErroReconciliacao,
  mensagemResultadoReconciliacao,
  reconciliarRetornoPagamento,
} from '../src/utils/paymentReturn.js';

test('extrai retorno Mercado Pago dentro do hash do HashRouter', async () => {
  const parametros = extrairParametrosRetornoPagamento({
    hash: '#/pagamento/retorno?payment_id=123456&status=approved&external_reference=244',
  });
  assert.deepEqual(parametros, {
    paymentId: '123456', pedidoId: '244', status: 'approved', preferenceId: null,
  });
  assert.equal(dadosRetornoSaoValidos(parametros), true);

  const chamadas = [];
  const apiMock = {
    post: async (...args) => {
      chamadas.push(args);
      return { status: 200, data: { confirmado: true } };
    },
  };
  const resposta = await reconciliarRetornoPagamento(apiMock, {
    pedidoId: parametros.pedidoId, paymentId: parametros.paymentId, token: 'jwt-de-teste',
  });
  assert.equal(chamadas[0][0], '/pagamentos/mercado-pago/244/reconciliar');
  assert.deepEqual(chamadas[0][1], { payment_id: '123456' });
  assert.equal(chamadas[0][2].headers.Authorization, 'Bearer jwt-de-teste');
  assert.equal(mensagemResultadoReconciliacao(resposta.data.confirmado).titulo, 'Pagamento confirmado');
});

test('aceita collection_id e não reconcilia sem identificadores válidos', () => {
  const fallback = extrairParametrosRetornoPagamento({
    search: '?collection_id=654321&external_reference=244&collection_status=approved',
  });
  assert.equal(fallback.paymentId, '654321');
  assert.equal(fallback.pedidoId, '244');
  assert.equal(dadosRetornoSaoValidos(fallback), true);
  assert.equal(dadosRetornoSaoValidos(extrairParametrosRetornoPagamento({ hash: '#/pagamento/sucesso?external_reference=244' })), false);
});

for (const status of [401, 400, 500]) {
  test(`resposta ${status} mantém a tela em análise sem confirmar o pedido`, async () => {
    const apiMock = { post: async () => { throw { response: { status } }; } };
    await assert.rejects(() => reconciliarRetornoPagamento(apiMock, {
      pedidoId: '244', paymentId: '123456', token: 'jwt-de-teste',
    }));
    assert.equal(mensagemErroReconciliacao().titulo, 'Pagamento em análise');
  });
}

test('só libera entrega quando o backend persistiu pedido pago e Mercado Pago approved', () => {
  assert.equal(classificarResultadoReconciliacao({
    pedido: { status: 'pago', mp_status: 'approved', pagamento_confirmado_em: '2026-07-23 10:00:00' },
    resultado: { confirmado: true, mpStatus: 'approved' },
  }), 'aprovado');

  assert.equal(classificarResultadoReconciliacao({
    pedido: { status: 'pendente', mp_status: 'approved' },
    resultado: { confirmado: false, mpStatus: 'approved' },
  }), 'processando');

  assert.equal(classificarResultadoReconciliacao({ resultado: { mpStatus: 'pending' } }), 'processando');
  assert.equal(classificarResultadoReconciliacao({ resultado: { mpStatus: 'rejected' } }), 'recusado');
});
