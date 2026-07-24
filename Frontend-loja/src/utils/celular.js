export function somenteDigitosCelular(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, 11);
}

export function formatarCelularBrasileiro(valor) {
  const digitos = somenteDigitosCelular(valor);
  if (digitos.length <= 2) return digitos ? `(${digitos}` : '';
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function celularBrasileiroValido(valor) {
  return /^\d{2}9\d{8}$/.test(somenteDigitosCelular(valor));
}
