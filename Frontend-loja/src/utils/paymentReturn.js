function normalizarBusca(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  return texto.startsWith('?') ? texto.slice(1) : texto;
}

/**
 * O Mercado Pago devolve a query dentro do fragmento em aplicações HashRouter.
 * React Router a expõe em location.search nas versões atuais, mas o fallback do
 * hash mantém a leitura correta em navegadores e retornos legados.
 */
export function extrairParametrosRetornoPagamento({ search = '', hash = '' } = {}) {
  const buscaDoHash = String(hash || '').split('?').slice(1).join('?');
  const parametros = new URLSearchParams(normalizarBusca(search) || buscaDoHash);

  return {
    paymentId: parametros.get('payment_id') || parametros.get('collection_id'),
    pedidoId: parametros.get('external_reference'),
    status: parametros.get('status') || parametros.get('collection_status'),
    preferenceId: parametros.get('preference_id'),
  };
}

export function dadosRetornoSaoValidos({ paymentId, pedidoId }) {
  return /^\d+$/.test(String(paymentId || '')) && /^\d+$/.test(String(pedidoId || ''));
}

export async function reconciliarRetornoPagamento(apiClient, { pedidoId, paymentId, token }) {
  const url = `/pagamentos/mercado-pago/${pedidoId}/reconciliar`;
  return apiClient.post(
    url,
    { payment_id: String(paymentId) },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
}

export function mensagemResultadoReconciliacao(confirmado) {
  return confirmado
    ? { titulo: 'Pagamento confirmado', texto: 'Seu pagamento foi confirmado com segurança e o pedido já está atualizado.' }
    : { titulo: 'Pagamento em análise', texto: 'Recebemos o retorno, mas o pagamento ainda não está confirmado para este pedido.' };
}

export function mensagemErroReconciliacao() {
  return {
    titulo: 'Pagamento em análise',
    texto: 'A confirmação segura do pagamento ainda está sendo processada. Acompanhe o pedido em Minha Conta.',
  };
}

export function classificarResultadoReconciliacao({ pedido, resultado } = {}) {
  const statusPedido = String(pedido?.status || resultado?.status || '').trim().toLowerCase();
  const statusMercadoPago = String(pedido?.mp_status || resultado?.mpStatus || '').trim().toLowerCase();
  const confirmado = Boolean(pedido?.pagamento_confirmado_em) || Boolean(resultado?.confirmado);

  if (statusPedido === 'pago' && statusMercadoPago === 'approved' && confirmado) {
    return 'aprovado';
  }

  if (['pending', 'in_process', 'in_mediation'].includes(statusMercadoPago)) {
    return 'processando';
  }

  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(statusMercadoPago)) {
    return 'recusado';
  }

  return 'processando';
}
