import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_TTL_MS,
  assinaturaCarrinho,
  criarBloqueioPagamentoPorPedido,
  concluirTentativaCheckout,
  iniciarCheckoutMercadoPago,
  obterOuCriarTentativaCheckout,
  recuperarTentativaCheckout,
  validarCheckoutUrl,
} from '../src/utils/mercadoPagoCheckout.js';

function storageFake() {
  const dados = new Map();
  return { getItem: (key) => dados.get(key) || null, setItem: (key, value) => dados.set(key, String(value)), removeItem: (key) => dados.delete(key) };
}

const carrinho = [{ produto_id: 1, variacao_id: 2, quantidade: 1, preco: 39.9 }];
const urlValida = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=abc';

test('assinatura do carrinho é determinística e muda com quantidade ou variação', () => {
  assert.equal(assinaturaCarrinho(carrinho), assinaturaCarrinho([...carrinho].reverse()));
  assert.notEqual(assinaturaCarrinho(carrinho), assinaturaCarrinho([{ ...carrinho[0], quantidade: 2 }]));
  assert.notEqual(assinaturaCarrinho(carrinho), assinaturaCarrinho([{ ...carrinho[0], variacao_id: 3 }]));
});

test('tentativa preserva a mesma chave em retry, descarta carrinho incompatível e expira', () => {
  const storage = storageFake();
  const primeira = obterOuCriarTentativaCheckout(carrinho, { storage, now: 100, createKey: () => 'chave-estavel-1' });
  const retry = obterOuCriarTentativaCheckout(carrinho, { storage, now: 200, createKey: () => 'nao-deve-usar' });
  assert.equal(retry.idempotencyKey, primeira.idempotencyKey);
  const alterada = obterOuCriarTentativaCheckout([{ ...carrinho[0], quantidade: 2 }], { storage, now: 300, createKey: () => 'chave-nova-2' });
  assert.equal(alterada.idempotencyKey, 'chave-nova-2');
  assert.equal(recuperarTentativaCheckout({ storage, now: 300 + CHECKOUT_TTL_MS + 1 }), null);
});

test('checkout reutiliza pedido após timeout, persiste pedidoId e não limpa o carrinho', async () => {
  const storage = storageFake();
  const chamadas = [];
  const api = { post: async (url, body, config) => {
    chamadas.push({ url, body, config });
    if (url === '/pedidos' && chamadas.filter((item) => item.url === '/pedidos').length === 1) throw new Error('timeout');
    if (url === '/pedidos') return { data: { pedido_id: 44 } };
    return { data: { checkoutUrl: urlValida } };
  } };
  await assert.rejects(iniciarCheckoutMercadoPago({ apiClient: api, carrinho, token: 'token-nao-persistido', storage, redirect: () => {} }));
  await iniciarCheckoutMercadoPago({ apiClient: api, carrinho, token: 'token-nao-persistido', storage, redirect: () => {} });
  assert.equal(chamadas.filter((item) => item.url === '/pedidos').length, 2);
  assert.equal(chamadas[0].config.headers['X-Idempotency-Key'], chamadas[1].config.headers['X-Idempotency-Key']);
  assert.equal(recuperarTentativaCheckout({ storage }).pedidoId, 44);
  assert.equal(chamadas.at(-1).url, '/pagamentos/mercado-pago/preferencia/44');
});

test('aceita somente URL HTTPS oficial do Mercado Pago e preserva tentativa quando redirecionamento falha', async () => {
  assert.equal(validarCheckoutUrl(urlValida), urlValida);
  assert.equal(validarCheckoutUrl('javascript:alert(1)'), null);
  assert.equal(validarCheckoutUrl('data:text/html,oi'), null);
  assert.equal(validarCheckoutUrl(''), null);
  assert.equal(validarCheckoutUrl('https://exemplo.com/checkout'), null);

  const storage = storageFake();
  const api = { post: async (url) => url === '/pedidos' ? { data: { pedido_id: 45 } } : { data: { checkoutUrl: urlValida } } };
  await assert.rejects(iniciarCheckoutMercadoPago({ apiClient: api, carrinho, storage, redirect: () => { throw new Error('navegação bloqueada'); } }));
  const tentativa = recuperarTentativaCheckout({ storage });
  assert.equal(tentativa.pedidoId, 45);
  assert.equal(tentativa.etapa, 'falha_redirecionamento');
  assert.equal(JSON.stringify(tentativa).includes('token'), false);
});

test('conclusão limpa apenas a tentativa correspondente ao pedido retornado', () => {
  const storage = storageFake();
  const momento = Date.now();
  obterOuCriarTentativaCheckout(carrinho, { storage, now: momento, createKey: () => 'chave-estavel-3' });
  const tentativa = recuperarTentativaCheckout({ storage, now: momento });
  storage.setItem('mercado_pago_checkout_pendente_v1', JSON.stringify({ ...tentativa, pedidoId: 90 }));
  assert.equal(concluirTentativaCheckout(91, { storage }), false);
  assert.equal(concluirTentativaCheckout(90, { storage }), true);
  assert.equal(recuperarTentativaCheckout({ storage, now: momento }), null);
});

test('bloqueio síncrono evita clique duplo no mesmo pedido e mantém pedidos independentes', () => {
  const bloqueio = criarBloqueioPagamentoPorPedido();
  assert.equal(bloqueio.bloquear(101), true);
  assert.equal(bloqueio.bloquear(101), false);
  assert.equal(bloqueio.bloquear(202), true);
});

test('falha de preferência ou URL inválida libera somente o pedido correspondente para nova tentativa', () => {
  const bloqueio = criarBloqueioPagamentoPorPedido();
  assert.equal(bloqueio.bloquear(101), true);
  bloqueio.liberar(101);
  assert.equal(bloqueio.bloquear(101), true);
  assert.equal(bloqueio.bloquear(202), true);
  bloqueio.liberar(101);
  assert.equal(bloqueio.bloquear(202), false);
});
