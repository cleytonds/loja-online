import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exigeComprovanteParaConfirmacao,
  isAdminUser,
  normalizeStatus,
  validarTransicaoStatus,
} from '../src/routes/pedidosSecurity.js';

test('identifica usuários não administradores', () => {
  assert.equal(isAdminUser({ user: { tipo: 'cliente' } }), false);
  assert.equal(isAdminUser({ user: { tipo: 'admin' } }), true);
});

test('normaliza status para minúsculas', () => {
  assert.equal(normalizeStatus('PAGO'), 'pago');
  assert.equal(normalizeStatus('  Enviado  '), 'enviado');
});

test('bloqueia alteração de status para pedido expirado mesmo que ainda esteja pendente', () => {
  const resultado = validarTransicaoStatus({
    user: { tipo: 'admin' },
    currentStatus: 'pendente',
    novoStatus: 'pago',
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  });

  assert.equal(resultado.allowed, false);
  assert.equal(resultado.statusCode, 403);
  assert.match(resultado.message, /expirado/i);
});

test('permite confirmação manual de pagamento para pedido pendente', () => {
  const resultado = validarTransicaoStatus({
    user: { tipo: 'admin' },
    currentStatus: 'pendente',
    novoStatus: 'pago',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(resultado.allowed, true);
  assert.equal(resultado.atual, 'pendente');
  assert.equal(resultado.novo, 'pago');
});

test('permite aprovação PIX somente a partir de aguardando_confirmacao', () => {
  const resultado = validarTransicaoStatus({
    user: { tipo: 'admin' },
    currentStatus: 'aguardando_confirmacao',
    novoStatus: 'pago',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(resultado.allowed, true);
  assert.equal(resultado.atual, 'aguardando_confirmacao');
  assert.equal(resultado.novo, 'pago');
});

test('permite reprovação PIX para pedidos aguardando_confirmacao', () => {
  const resultado = validarTransicaoStatus({
    user: { tipo: 'admin' },
    currentStatus: 'aguardando_confirmacao',
    novoStatus: 'cancelado',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(resultado.allowed, true);
  assert.equal(resultado.novo, 'cancelado');
});

test('exige comprovante somente para aprovação PIX aguardando confirmação', () => {
  assert.equal(
    exigeComprovanteParaConfirmacao({
      currentStatus: 'aguardando_confirmacao',
      novoStatus: 'pago',
    }),
    true,
  );
  assert.equal(
    exigeComprovanteParaConfirmacao({ currentStatus: 'pendente', novoStatus: 'pago' }),
    false,
  );
});

test('bloqueia cliente comum de confirmar pagamento', () => {
  const resultado = validarTransicaoStatus({
    user: { tipo: 'cliente' },
    currentStatus: 'pendente',
    novoStatus: 'pago',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(resultado.allowed, false);
  assert.equal(resultado.statusCode, 403);
});

for (const status of ['cancelado', 'pago', 'enviado', 'entregue', 'expirado']) {
  test(`bloqueia confirmação adicional de pagamento para pedido ${status}`, () => {
    const resultado = validarTransicaoStatus({
      user: { tipo: 'admin' },
      currentStatus: status,
      novoStatus: 'pago',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    assert.equal(resultado.allowed, false);
    if (['cancelado', 'entregue', 'expirado'].includes(status)) {
      assert.equal(resultado.statusCode, 409);
      assert.equal(resultado.message, 'Pedido finalizado não pode ser alterado.');
    }
  });
}
