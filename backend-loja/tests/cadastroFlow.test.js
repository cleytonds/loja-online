import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authRoutesPath = new URL('../src/routes/authRoutes.js', import.meta.url);
const emailPath = new URL('../src/utils/email.js', import.meta.url);
const cadastroPath = new URL('../../Frontend-loja/src/pages/Cadastro.jsx', import.meta.url);
const verificarCodigoPath = new URL('../../Frontend-loja/src/pages/VerificarCodigo.jsx', import.meta.url);

test('cadastro confirma sucesso somente depois do envio de e-mail', async () => {
  const source = await readFile(authRoutesPath, 'utf8');
  const catchEmail = source.indexOf('catch (erroEmail)');
  const respostaFalha = source.indexOf('res.status(503)', catchEmail);
  const respostaSucesso = source.indexOf('res.status(201)', catchEmail);

  assert.ok(catchEmail >= 0);
  assert.ok(respostaFalha > catchEmail);
  assert.ok(respostaSucesso > respostaFalha);
  assert.match(source, /cadastroPendente:\s*true/);
  assert.match(source, /podeReenviarCodigo:\s*true/);
});

test('e-mail pendente retorna orientação de reenvio em vez de nova criação', async () => {
  const source = await readFile(authRoutesPath, 'utf8');

  assert.match(source, /Number\(usuarios\[0\]\.ativo\)\s*!==\s*1/);
  assert.match(source, /res\.status\(409\)/);
  assert.match(source, /Reenvie o c[oó]digo para continuar/);
});

test('SMTP possui timeout curto para não bloquear cadastro por um minuto', async () => {
  const source = await readFile(emailPath, 'utf8');

  assert.match(source, /const SMTP_TIMEOUT_MS = 12000/);
  assert.match(source, /connectionTimeout:\s*SMTP_TIMEOUT_MS/);
  assert.match(source, /greetingTimeout:\s*SMTP_TIMEOUT_MS/);
  assert.match(source, /socketTimeout:\s*SMTP_TIMEOUT_MS/);
});

test('cadastro sempre libera loading e encaminha conta pendente para verificação', async () => {
  const source = await readFile(cadastroPath, 'utf8');

  assert.match(source, /finally\s*\{\s*setLoading\(false\);\s*\}/s);
  assert.match(source, /resposta\?\.cadastroPendente\s*&&\s*resposta\?\.podeReenviarCodigo/);
  assert.match(source, /navigate\('\/verificar'/);
});

test('tela de verificação recebe o aviso e mantém a ação de reenviar código', async () => {
  const source = await readFile(verificarCodigoPath, 'utf8');

  assert.match(source, /location\.state\?\.aviso/);
  assert.match(source, /auth\/reenviar-codigo/);
});
