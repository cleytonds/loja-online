import { Payment, Preference } from 'mercadopago';
import { getMercadoPagoClient } from '../config/mercadoPago.js';

function getPreferenceClient() {
  return new Preference(getMercadoPagoClient());
}

function getPaymentClient() {
  return new Payment(getMercadoPagoClient());
}

class MercadoPagoServiceError extends Error {
  constructor(operation, cause) {
    super(`Não foi possível ${operation} no Mercado Pago.`);
    this.name = 'MercadoPagoServiceError';
    this.code = 'MERCADO_PAGO_SERVICE_ERROR';
    this.cause = cause;
    this.status = cause?.status ?? cause?.response?.status ?? cause?.api_response?.status;
    this.response = cause?.response;
    this.api_response = cause?.api_response;
  }
}

function criarOpcoesDeRequisicao({ idempotencyKey, timeout, headers: _headers } = {}) {
  const requestOptions = {};

  if (idempotencyKey) {
    requestOptions.idempotencyKey = idempotencyKey;
  }

  if (timeout !== undefined) {
    requestOptions.timeout = timeout;
  }

  // Headers permanecem reservados no contrato interno. O SDK atual não os
  // documenta em requestOptions, portanto não são encaminhados.

  return Object.keys(requestOptions).length > 0 ? requestOptions : undefined;
}

function normalizarPreferencia(preferencia) {
  return {
    preferenceId: preferencia.id ? String(preferencia.id) : null,
    checkoutUrl: preferencia.init_point ?? null,
    sandboxCheckoutUrl: preferencia.sandbox_init_point ?? null,
    externalReference: preferencia.external_reference ?? null,
  };
}

function normalizarPagamento(pagamento) {
  return {
    paymentId: pagamento.id !== undefined && pagamento.id !== null
      ? String(pagamento.id)
      : null,
    status: pagamento.status ?? null,
    statusDetail: pagamento.status_detail ?? null,
    externalReference: pagamento.external_reference ?? null,
    valorPago: pagamento.transaction_amount ?? null,
    currencyId: pagamento.currency_id ?? null,
    collectorId: pagamento.collector_id !== undefined && pagamento.collector_id !== null
      ? String(pagamento.collector_id)
      : null,
    dataCriacao: pagamento.date_created ?? null,
    dataAprovacao: pagamento.date_approved ?? null,
    metodoPagamento: pagamento.payment_method_id ?? pagamento.payment_method?.id ?? null,
  };
}

/**
 * Cria uma preferência do Checkout Pro a partir de dados já validados pela
 * camada chamadora. Não acessa banco, req/res, pedidos ou estoque.
 */
async function criarPreferencia({
  pedidoId,
  comprador,
  itens,
  valor,
  backUrls,
  notificationUrl,
  paymentMethods,
  validade,
  opcoes,
}) {
  try {
    if (!validade?.expirationDateFrom || !validade?.expirationDateTo) {
      throw new Error('Validade da preferência não configurada');
    }

    const body = {
      external_reference: String(pedidoId),
      items: itens,
      back_urls: backUrls,
      notification_url: notificationUrl,
      payment_methods: paymentMethods,
      expires: true,
      expiration_date_from: validade.expirationDateFrom,
      expiration_date_to: validade.expirationDateTo,
      metadata: {
        pedido_id: String(pedidoId),
        valor_total: valor,
      },
    };

    if (String(process.env.MP_ENVIRONMENT || 'production').trim().toLowerCase() !== 'sandbox') {
      body.payer = comprador;
    }

    const preferencia = await getPreferenceClient().create({
      body,
      requestOptions: criarOpcoesDeRequisicao(opcoes),
    });

    return normalizarPreferencia(preferencia);
  } catch (error) {
    throw new MercadoPagoServiceError('criar a preferência de pagamento', error);
  }
}

/**
 * Consulta um pagamento do Mercado Pago pelo identificador externo.
 * O resultado é retornado sem persistência ou alteração de estado local.
 */
async function consultarPagamento(paymentId, opcoes) {
  try {
    const pagamento = await getPaymentClient().get({
      id: String(paymentId),
      requestOptions: criarOpcoesDeRequisicao(opcoes),
    });

    return normalizarPagamento(pagamento);
  } catch (error) {
    throw new MercadoPagoServiceError('consultar o pagamento', error);
  }
}

export {
  MercadoPagoServiceError,
  criarPreferencia,
  consultarPagamento,
};
