import { MercadoPagoConfig } from 'mercadopago';

function requireMercadoPagoAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken || String(accessToken).trim() === '') {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não definido no servidor');
  }

  return String(accessToken).trim();
}

function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: requireMercadoPagoAccessToken(),
  });
}

export { getMercadoPagoClient };
