import test from 'node:test';
import assert from 'node:assert/strict';
import { celularBrasileiroValido, formatarCelularBrasileiro, somenteDigitosCelular } from '../src/utils/celular.js';

test('aplica mascara e envia somente os onze digitos do celular', () => {
  assert.equal(formatarCelularBrasileiro('81999999999'), '(81) 99999-9999');
  assert.equal(somenteDigitosCelular('(81) 99999-9999'), '81999999999');
  assert.equal(celularBrasileiroValido('81999999999'), true);
});

test('rejeita celular incompleto', () => {
  assert.equal(celularBrasileiroValido('8199999999'), false);
});
