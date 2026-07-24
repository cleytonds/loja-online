import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCelularBrasileiro } from '../src/utils/celular.js';

test('normaliza celular brasileiro para somente digitos', () => {
  assert.equal(normalizarCelularBrasileiro('(81) 99999-9999'), '81999999999');
  assert.equal(normalizarCelularBrasileiro('81999999999'), '81999999999');
});

test('rejeita celular ausente, incompleto ou fora do padrao movel brasileiro', () => {
  assert.equal(normalizarCelularBrasileiro(''), null);
  assert.equal(normalizarCelularBrasileiro('(81) 9999-9999'), null);
  assert.equal(normalizarCelularBrasileiro('819999999999'), null);
  assert.equal(normalizarCelularBrasileiro('81888888888'), null);
});
