export function normalizeWhatsAppNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  return /^55\d{10,11}$/.test(digits) ? digits : '';
}

export function buildPixConfig(env = process.env) {
  const pixKey = typeof env?.PIX_KEY === 'string' && env.PIX_KEY.trim() ? env.PIX_KEY.trim() : '';
  const whatsappNumber = normalizeWhatsAppNumber(env?.WHATSAPP_NUMERO);

  return {
    pix_key: pixKey,
    whatsapp_number: whatsappNumber,
  };
}
