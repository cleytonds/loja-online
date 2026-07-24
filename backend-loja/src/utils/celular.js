export function normalizarCelularBrasileiro(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return /^\d{2}9\d{8}$/.test(digitos) ? digitos : null;
}
