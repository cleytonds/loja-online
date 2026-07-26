import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pagePath = new URL('../src/pages/VerificarCodigo.jsx', import.meta.url);

async function source() {
  return readFile(pagePath, 'utf8');
}

test('reenvio usa botão sem submit e estados independentes', async () => {
  const page = await source();

  assert.match(page, /const \[confirmando, setConfirmando\] = useState\(false\)/);
  assert.match(page, /const \[reenviando, setReenviando\] = useState\(false\)/);
  assert.match(page, /type="button"[\s\S]*onClick=\{reenviarCodigo\}/);
  assert.match(page, /event\?\.preventDefault\(\)/);
  assert.match(page, /event\?\.stopPropagation\(\)/);
  assert.match(page, /setReenviando\(false\)/);
  assert.match(page, /reenviando \? 'Reenviando\.\.\.'/);
  assert.match(page, /if \(status === 404\) return 'Página não encontrada\.'/);
  assert.match(page, /status >= 500/);
  assert.match(page, /Erro de conexão\. Verifique sua internet e tente novamente\./);
});

test('confirmação permanece submit e exige código antes da API', async () => {
  const page = await source();

  assert.match(page, /<form className="auth-form" onSubmit=\{confirmar\}>/);
  assert.match(page, /type="submit"/);
  assert.match(page, /if \(!codigoNormalizado\)/);
  assert.match(page, /api\.post\('\/auth\/verificar-codigo', \{ email, codigo: codigoNormalizado \}\)/);
  assert.match(page, /confirmando \? 'Confirmando\.\.\.'/);
});

test('as rotas de confirmar e reenviar permanecem separadas', async () => {
  const page = await source();
  const confirmar = page.slice(page.indexOf('async function confirmar'), page.indexOf('return ('));
  const reenviar = page.slice(page.indexOf('async function reenviarCodigo'), page.indexOf('async function confirmar'));

  assert.match(confirmar, /\/auth\/verificar-codigo/);
  assert.doesNotMatch(confirmar, /\/auth\/reenviar-codigo/);
  assert.match(reenviar, /\/auth\/reenviar-codigo/);
  assert.doesNotMatch(reenviar, /\/auth\/verificar-codigo/);
});
