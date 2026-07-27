const CHECKOUT_STORAGE_KEY = 'mercado_pago_checkout_pendente_v1';
export const CHECKOUT_TTL_MS = 15 * 60 * 1000;

// Set síncrono reutilizável para impedir duas tentativas da mesma preferência
// antes que o React consiga atualizar o estado visual do botão.
export function criarBloqueioPagamentoPorPedido() {
  const bloqueados = new Set();
  return {
    bloquear(pedidoId) {
      const chave = String(pedidoId);
      if (bloqueados.has(chave)) return false;
      bloqueados.add(chave);
      return true;
    },
    liberar(pedidoId) {
      bloqueados.delete(String(pedidoId));
    },
  };
}

function storagePadrao() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function agora() {
  return Date.now();
}

function criarChaveIdempotencia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `checkout-${agora()}-${Math.random().toString(36).slice(2)}`;
}

function normalizarItens(carrinho) {
  return (Array.isArray(carrinho) ? carrinho : [])
    .map((item) => ({
      produto_id: Number(item?.produto_id),
      variacao_id: Number(item?.variacao_id),
      quantidade: Number(item?.quantidade),
      preco: Number(item?.preco || 0),
    }))
    .filter((item) => Number.isSafeInteger(item.produto_id) && item.produto_id > 0
      && Number.isSafeInteger(item.variacao_id) && item.variacao_id > 0
      && Number.isSafeInteger(item.quantidade) && item.quantidade > 0)
    .sort((a, b) => a.produto_id - b.produto_id || a.variacao_id - b.variacao_id);
}

export function assinaturaCarrinho(carrinho) {
  return JSON.stringify(normalizarItens(carrinho));
}

function tentativaValida(tentativa, agoraMs = agora()) {
  return tentativa
    && typeof tentativa === 'object'
    && typeof tentativa.idempotencyKey === 'string'
    && tentativa.idempotencyKey.length >= 8
    && typeof tentativa.cartSignature === 'string'
    && Number.isFinite(Number(tentativa.criadoEm))
    && agoraMs - Number(tentativa.criadoEm) <= CHECKOUT_TTL_MS;
}

export function recuperarTentativaCheckout({ storage = storagePadrao(), now = agora() } = {}) {
  if (!storage) return null;
  try {
    const tentativa = JSON.parse(storage.getItem(CHECKOUT_STORAGE_KEY) || 'null');
    if (tentativaValida(tentativa, now)) return tentativa;
  } catch {
    // Estado local inválido nunca deve impedir um novo checkout.
  }
  storage.removeItem(CHECKOUT_STORAGE_KEY);
  return null;
}

export function salvarTentativaCheckout(tentativa, { storage = storagePadrao() } = {}) {
  if (!storage) return tentativa;
  const segura = {
    pedidoId: tentativa.pedidoId ? Number(tentativa.pedidoId) : null,
    idempotencyKey: String(tentativa.idempotencyKey),
    cartSignature: String(tentativa.cartSignature),
    etapa: String(tentativa.etapa || 'iniciado'),
    criadoEm: Number(tentativa.criadoEm),
    atualizadoEm: agora(),
  };
  storage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(segura));
  return segura;
}

export function limparTentativaCheckout({ storage = storagePadrao() } = {}) {
  storage?.removeItem(CHECKOUT_STORAGE_KEY);
}

export function obterOuCriarTentativaCheckout(carrinho, { storage = storagePadrao(), now = agora(), createKey = criarChaveIdempotencia } = {}) {
  const cartSignature = assinaturaCarrinho(carrinho);
  const existente = recuperarTentativaCheckout({ storage, now });
  if (existente && existente.cartSignature === cartSignature) return existente;

  if (existente) limparTentativaCheckout({ storage });
  return salvarTentativaCheckout({
    pedidoId: null,
    idempotencyKey: createKey(),
    cartSignature,
    etapa: 'iniciado',
    criadoEm: now,
  }, { storage });
}

export function salvarPedidoNaTentativa(tentativa, pedidoId, { storage = storagePadrao() } = {}) {
  if (!Number.isSafeInteger(Number(pedidoId)) || Number(pedidoId) <= 0) {
    throw new Error('Não foi possível identificar o pedido criado.');
  }
  return salvarTentativaCheckout({ ...tentativa, pedidoId: Number(pedidoId), etapa: 'pedido_criado' }, { storage });
}

function hostMercadoPago(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'mercadopago.com'
    || host.endsWith('.mercadopago.com')
    || host === 'mercadopago.com.br'
    || host.endsWith('.mercadopago.com.br');
}

export function validarCheckoutUrl(checkoutUrl) {
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) return null;
  try {
    const url = new URL(checkoutUrl.trim());
    return url.protocol === 'https:' && hostMercadoPago(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function obterCheckoutUrlPedido(apiClient, pedidoId) {
  const resposta = await apiClient.post(`/pagamentos/mercado-pago/preferencia/${pedidoId}`);
  const checkoutUrl = validarCheckoutUrl(resposta?.data?.checkoutUrl);
  if (!checkoutUrl) throw new Error('Não foi possível abrir o pagamento com segurança. Tente novamente.');
  return checkoutUrl;
}

export function redirecionarParaCheckout(checkoutUrl, redirect = (url) => window.location.assign(url)) {
  const urlSegura = validarCheckoutUrl(checkoutUrl);
  if (!urlSegura) throw new Error('Não foi possível abrir o pagamento com segurança. Tente novamente.');
  redirect(urlSegura);
  return urlSegura;
}

export async function iniciarCheckoutMercadoPago({ apiClient, carrinho, token, storage = storagePadrao(), redirect, now, createKey }) {
  let tentativa = obterOuCriarTentativaCheckout(carrinho, { storage, now, createKey });
  let pedidoId = tentativa.pedidoId;

  if (!pedidoId) {
    const resposta = await apiClient.post('/pedidos', {
      itens: normalizarItens(carrinho),
      pagamento: 'mercado_pago',
    }, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Idempotency-Key': tentativa.idempotencyKey,
      },
    });
    pedidoId = Number(resposta?.data?.pedido_id);
    tentativa = salvarPedidoNaTentativa(tentativa, pedidoId, { storage });
  }

  const checkoutUrl = await obterCheckoutUrlPedido(apiClient, pedidoId);
  tentativa = salvarTentativaCheckout({ ...tentativa, etapa: 'redirecionando' }, { storage });
  try {
    redirecionarParaCheckout(checkoutUrl, redirect);
  } catch (error) {
    salvarTentativaCheckout({ ...tentativa, etapa: 'falha_redirecionamento' }, { storage });
    throw error;
  }
  return { pedidoId, checkoutUrl, tentativa };
}

export function concluirTentativaCheckout(pedidoId, { storage = storagePadrao() } = {}) {
  const tentativa = recuperarTentativaCheckout({ storage });
  if (!tentativa || Number(tentativa.pedidoId) !== Number(pedidoId)) return false;
  limparTentativaCheckout({ storage });
  return true;
}
