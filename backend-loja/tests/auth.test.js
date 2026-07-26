import test from 'node:test';
import assert from 'node:assert/strict';

import { montarUsuarioAutenticado, validarPayloadToken } from '../src/middlewares/auth.js';

test('aceita payloads com id e tipo válidos', () => {
  assert.equal(validarPayloadToken({ id: 7, tipo: 'cliente' }), true);
  assert.equal(validarPayloadToken({ id: 0, tipo: 'cliente' }), false);
  assert.equal(validarPayloadToken({ tipo: 'cliente' }), false);
});

test('rejeita usuário inativo ou com tipo inconsistente', () => {
  const usuarioAtivo = { id: 7, tipo: 'cliente', ativo: 1 };
  const usuarioInativo = { id: 7, tipo: 'cliente', ativo: 0 };

  assert.deepEqual(montarUsuarioAutenticado({ id: 7, tipo: 'cliente' }, usuarioAtivo), {
    id: 7,
    nome: undefined,
    email: undefined,
    tipo: 'cliente',
    ativo: 1,
  });

  assert.equal(montarUsuarioAutenticado({ id: 7, tipo: 'cliente' }, usuarioInativo), null);
  assert.equal(montarUsuarioAutenticado({ id: 7, tipo: 'admin' }, usuarioAtivo), null);
});
