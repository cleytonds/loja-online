import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pedidosRoutePath = new URL('../src/routes/pedidos.js', import.meta.url);
const adminPagePath = new URL('../../Frontend-loja/src/pages/Admin.jsx', import.meta.url);

async function lerRotaPedidos() {
  return readFile(pedidosRoutePath, 'utf8');
}

test('listagem administrativa separa atuais e histórico por status real', async () => {
  const source = await lerRotaPedidos();

  assert.match(source, /atuais:\s*\['pendente', 'aguardando_confirmacao', 'pago', 'enviado'\]/);
  assert.match(source, /historico:\s*\['entregue', 'cancelado', 'expirado'\]/);
  assert.match(source, /COALESCE\(resumo\.quantidade_produtos, 0\) AS quantidade_produtos/);
  assert.match(source, /COALESCE\(resumo\.quantidade_pecas, 0\) AS quantidade_pecas/);
});

test('listagem agrega itens em lote e preserva paginação opcional', async () => {
  const source = await lerRotaPedidos();

  assert.match(source, /WHERE pi\.pedido_id IN \(\$\{placeholders\}\)/);
  assert.match(source, /const pagination = getPagination\(req\.query\)/);
  assert.match(source, /SELECT COUNT\(\*\) AS total FROM pedidos p\$\{whereSql\}/);
});

test('detalhes administrativos exigem administrador e validam o identificador', async () => {
  const source = await lerRotaPedidos();
  const detailsStart = source.indexOf("router.get('/:id/detalhes'");
  const detailsEnd = source.indexOf("router.put('/:id/status'", detailsStart);
  const detailsRoute = source.slice(detailsStart, detailsEnd);

  assert.ok(detailsStart >= 0);
  assert.match(detailsRoute, /if \(!isAdminUser\(req\)\)[\s\S]*?status\(403\)/);
  assert.match(detailsRoute, /Number\.parseInt\(req\.params\.id, 10\)/);
  assert.match(detailsRoute, /status\(400\)/);
});

test('detalhes são somente leitura, não expõem segredo e evitam duplicação por imagens', async () => {
  const source = await lerRotaPedidos();
  const detailsStart = source.indexOf("router.get('/:id/detalhes'");
  const detailsEnd = source.indexOf("router.put('/:id/status'", detailsStart);
  const detailsRoute = source.slice(detailsStart, detailsEnd);

  assert.match(detailsRoute, /LEFT JOIN produto_imagens img ON img\.id = \([\s\S]*?imagem\.is_principal = 1/);
  assert.match(detailsRoute, /return res\.json\(\{ \.\.\.pedido, itens \}\)/);
  assert.doesNotMatch(detailsRoute, /\bUPDATE\b|\bINSERT\b|\bDELETE\b/i);
  assert.doesNotMatch(detailsRoute, /\bsenha\b|token_redefinicao/i);
});

test('painel administrativo consome os contratos de listagem e detalhes', async () => {
  const source = await readFile(adminPagePath, 'utf8');

  assert.match(source, /\/pedidos\?tipo=\$\{tipo\}/);
  assert.match(source, /\/pedidos\/\$\{id\}\/detalhes/);
  assert.match(source, /quantidade_produtos/);
  assert.match(source, /quantidade_pecas/);
  assert.match(source, /Ver detalhes/);
});
