import test from 'node:test';
import assert from 'node:assert/strict';

import {
  abrirAtendimentoWhatsApp,
  montarMensagemEntregaPedido,
  pedidoPodeTratarEntrega,
} from './whatsapp.js';

test('exibe tratamento de entrega apenas para pedidos pagos ou enviados', () => {
  assert.equal(pedidoPodeTratarEntrega('pago'), true);
  assert.equal(pedidoPodeTratarEntrega('enviado'), true);
  assert.equal(pedidoPodeTratarEntrega('pendente'), false);
  assert.equal(pedidoPodeTratarEntrega('expirado'), false);
  assert.equal(pedidoPodeTratarEntrega('cancelado'), false);
  assert.equal(pedidoPodeTratarEntrega('entregue'), false);
});

test('gera URL de atendimento codificada sem alterar pedido', () => {
  const mensagem = montarMensagemEntregaPedido({
    nomeCliente: 'Dayane Ferreira',
    pedido: {
      id: 228,
      total: 60,
      status: 'pago',
      pagamento: 'mercado_pago',
      itens: [{ nome: 'Short saia completo', cor: 'jeans', tamanho: '40', quantidade: 1 }],
    },
  });
  const chamadas = [];
  const url = abrirAtendimentoWhatsApp({
    numero: '5511999999999',
    mensagem,
    windowRef: { open: (...args) => { chamadas.push(args); return {}; } },
  });

  assert.match(mensagem, /Pedido: #228/);
  assert.match(mensagem, /Cliente: Dayane Ferreira/);
  assert.match(mensagem, /Forma de pagamento: Mercado Pago/);
  assert.match(mensagem, /Quantidade: 1/);
  assert.equal(url, `https://wa.me/5511999999999?text=${encodeURIComponent(mensagem)}`);
  assert.deepEqual(chamadas[0].slice(1), ['_blank', 'noopener,noreferrer']);
});
