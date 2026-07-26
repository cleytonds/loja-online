export const PRAZO_RESERVA_PADRAO_MINUTOS = 10;
export const PRAZO_RESERVA_MERCADO_PAGO_MINUTOS = 10;

export function prazoReservaMinutos(pagamento) {
  if (pagamento !== 'mercado_pago') return PRAZO_RESERVA_PADRAO_MINUTOS;
  return PRAZO_RESERVA_MERCADO_PAGO_MINUTOS;
}
