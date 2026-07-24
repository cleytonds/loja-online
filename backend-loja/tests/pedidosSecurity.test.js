import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminUser, normalizeStatus, validarTransicaoStatus } from '../src/routes/pedidosSecurity.js';

const vencido = () => new Date(Date.now() - 60_000).toISOString();
const futuro = () => new Date(Date.now() + 60_000).toISOString();

test('permite pago vencido seguir para enviado e enviado para entregue', () => {
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'pago', novoStatus: 'enviado', expiresAt: vencido() }).allowed, true);
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'enviado', novoStatus: 'entregue', expiresAt: vencido() }).allowed, true);
});

test('bloqueia pedido pendente vencido, estados terminais e transição inválida', () => {
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'pendente', novoStatus: 'cancelado', expiresAt: vencido() }).statusCode, 403);
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'expirado', novoStatus: 'pago', expiresAt: futuro() }).statusCode, 409);
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'pago', novoStatus: 'entregue', expiresAt: futuro() }).statusCode, 400);
});

test('não permite confirmação manual de pagamento nem ação administrativa de cliente', () => {
  assert.equal(validarTransicaoStatus({ user: { tipo: 'admin' }, currentStatus: 'pendente', novoStatus: 'pago', expiresAt: futuro() }).allowed, true);
  assert.equal(validarTransicaoStatus({ user: { tipo: 'cliente' }, currentStatus: 'pago', novoStatus: 'enviado', expiresAt: futuro() }).statusCode, 403);
});

test('normaliza status e reconhece administrador', () => {
  assert.equal(normalizeStatus('  ENVIADO '), 'enviado');
  assert.equal(isAdminUser({ user: { tipo: 'admin' } }), true);
});
