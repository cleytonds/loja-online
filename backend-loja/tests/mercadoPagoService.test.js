import assert from 'node:assert/strict';
import test from 'node:test';
import { Payment, Preference } from 'mercadopago';

process.env.MERCADO_PAGO_ACCESS_TOKEN ||= 'TEST-mercado-pago-access-token';

const {
  MercadoPagoServiceError,
  criarPreferencia,
  consultarPagamento,
} = await import('../src/services/mercadoPagoService.js');

test('criarPreferencia inclui payer e preserva os demais campos em produção', async (t) => {
  const originalCreate = Preference.prototype.create;
  const originalEnvironment = process.env.MP_ENVIRONMENT;
  let receivedPayload;

  process.env.MP_ENVIRONMENT = 'production';

  Preference.prototype.create = async (payload) => {
    receivedPayload = payload;
    return {
      id: 'pref_test',
      init_point: 'https://example.test/checkout',
      sandbox_init_point: 'https://sandbox.example.test/checkout',
      external_reference: '123',
      internal_metadata: { sdk_only: true },
    };
  };
  t.after(() => {
    Preference.prototype.create = originalCreate;
    if (originalEnvironment === undefined) delete process.env.MP_ENVIRONMENT;
    else process.env.MP_ENVIRONMENT = originalEnvironment;
  });

  const result = await criarPreferencia({
    pedidoId: 123,
    comprador: { email: 'cliente@example.test' },
    itens: [{ title: 'Produto', quantity: 1, unit_price: 50 }],
    valor: 50,
    backUrls: {
      success: 'https://loja.test/sucesso',
      failure: 'https://loja.test/falha',
      pending: 'https://loja.test/pendente',
    },
    notificationUrl: 'https://api.loja.test/webhooks/mercado-pago',
    paymentMethods: { installments: 12 },
    validade: {
      expirationDateFrom: '2026-07-17T10:00:00.000Z',
      expirationDateTo: '2026-07-17T10:10:00.000Z',
    },
    opcoes: {
      idempotencyKey: 'preferencia-123',
      timeout: 5000,
      headers: { 'X-Request-Source': 'dl-modas' },
    },
  });

  assert.deepEqual(result, {
    preferenceId: 'pref_test',
    checkoutUrl: 'https://example.test/checkout',
    sandboxCheckoutUrl: 'https://sandbox.example.test/checkout',
    externalReference: '123',
  });
  assert.deepEqual(receivedPayload.body.external_reference, '123');
  assert.equal(receivedPayload.body.metadata.pedido_id, '123');
  assert.equal(receivedPayload.body.metadata.valor_total, 50);
  assert.equal(receivedPayload.body.notification_url, 'https://api.loja.test/webhooks/mercado-pago');
  assert.deepEqual(receivedPayload.body.payment_methods, { installments: 12 });
  assert.deepEqual(receivedPayload.body.payer, { email: 'cliente@example.test' });
  assert.equal(receivedPayload.body.expires, true);
  assert.equal(receivedPayload.body.expiration_date_from, '2026-07-17T10:00:00.000Z');
  assert.equal(receivedPayload.body.expiration_date_to, '2026-07-17T10:10:00.000Z');
  assert.deepEqual(receivedPayload.requestOptions, {
    idempotencyKey: 'preferencia-123',
    timeout: 5000,
  });
  assert.equal('headers' in receivedPayload.requestOptions, false);
});

test('criarPreferencia omite payer somente em Sandbox e preserva os demais campos', async (t) => {
  const originalCreate = Preference.prototype.create;
  const originalEnvironment = process.env.MP_ENVIRONMENT;
  let receivedPayload;

  process.env.MP_ENVIRONMENT = 'sandbox';
  Preference.prototype.create = async (payload) => {
    receivedPayload = payload;
    return {
      id: 'pref_sandbox',
      sandbox_init_point: 'https://sandbox.example.test/checkout',
      external_reference: '456',
    };
  };
  t.after(() => {
    Preference.prototype.create = originalCreate;
    if (originalEnvironment === undefined) delete process.env.MP_ENVIRONMENT;
    else process.env.MP_ENVIRONMENT = originalEnvironment;
  });

  await criarPreferencia({
    pedidoId: 456,
    comprador: { name: 'Cliente Sandbox', email: 'cliente@example.test' },
    itens: [{ title: 'Produto', quantity: 1, unit_price: 39.9, currency_id: 'BRL' }],
    valor: 39.9,
    backUrls: {
      success: 'https://loja.test/sucesso',
      failure: 'https://loja.test/falha',
      pending: 'https://loja.test/pendente',
    },
    notificationUrl: 'https://api.loja.test/webhooks/mercado-pago',
    paymentMethods: { installments: 12 },
    validade: {
      expirationDateFrom: '2026-07-17T10:00:00.000Z',
      expirationDateTo: '2026-07-17T10:10:00.000Z',
    },
  });

  assert.equal('payer' in receivedPayload.body, false);
  assert.deepEqual(receivedPayload.body, {
    external_reference: '456',
    items: [{ title: 'Produto', quantity: 1, unit_price: 39.9, currency_id: 'BRL' }],
    back_urls: {
      success: 'https://loja.test/sucesso',
      failure: 'https://loja.test/falha',
      pending: 'https://loja.test/pendente',
    },
    notification_url: 'https://api.loja.test/webhooks/mercado-pago',
    payment_methods: { installments: 12 },
    expires: true,
    expiration_date_from: '2026-07-17T10:00:00.000Z',
    expiration_date_to: '2026-07-17T10:10:00.000Z',
    metadata: { pedido_id: '456', valor_total: 39.9 },
  });
});

test('consultarPagamento converte o identificador externo para string', async (t) => {
  const originalGet = Payment.prototype.get;
  let receivedPayload;

  Payment.prototype.get = async (payload) => {
    receivedPayload = payload;
    return {
      id: 987,
      status: 'approved',
      status_detail: 'accredited',
      external_reference: '123',
      transaction_amount: 50,
      currency_id: 'BRL',
      collector_id: 3546971935,
      date_created: '2026-07-16T10:00:00.000-03:00',
      date_approved: '2026-07-16T10:01:00.000-03:00',
      payment_method_id: 'pix',
      api_response: { status: 200 },
    };
  };
  t.after(() => {
    Payment.prototype.get = originalGet;
  });

  const result = await consultarPagamento(987, { timeout: 3000 });

  assert.deepEqual(result, {
    paymentId: '987',
    status: 'approved',
    statusDetail: 'accredited',
    externalReference: '123',
    valorPago: 50,
    currencyId: 'BRL',
    collectorId: '3546971935',
    dataCriacao: '2026-07-16T10:00:00.000-03:00',
    dataAprovacao: '2026-07-16T10:01:00.000-03:00',
    metodoPagamento: 'pix',
  });
  assert.deepEqual(receivedPayload, {
    id: '987',
    requestOptions: { timeout: 3000 },
  });
});

test('criarPreferencia padroniza falhas do SDK sem expor o erro original', async (t) => {
  const originalCreate = Preference.prototype.create;
  Preference.prototype.create = async () => {
    throw new Error('access_token=segredo-nao-deve-vazar');
  };
  t.after(() => {
    Preference.prototype.create = originalCreate;
  });

  await assert.rejects(
    criarPreferencia({
      pedidoId: 1,
      comprador: {},
      itens: [],
      valor: 0,
      backUrls: {},
      notificationUrl: 'https://api.loja.test/webhook',
      validade: {
        expirationDateFrom: '2026-07-17T10:00:00.000Z',
        expirationDateTo: '2026-07-17T10:10:00.000Z',
      },
    }),
    (error) => {
      assert.ok(error instanceof MercadoPagoServiceError);
      assert.equal(error.code, 'MERCADO_PAGO_SERVICE_ERROR');
      assert.doesNotMatch(error.message, /segredo-nao-deve-vazar/);
      return true;
    },
  );
});
