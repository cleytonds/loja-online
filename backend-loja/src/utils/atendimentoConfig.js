export function normalizeWhatsAppNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^55\d{10,11}$/.test(digits) ? digits : '';
}

export function buildAtendimentoConfig(env = process.env) {
  return { whatsappNumber: normalizeWhatsAppNumber(env?.WHATSAPP_NUMERO) };
}
