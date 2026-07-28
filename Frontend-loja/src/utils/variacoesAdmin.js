export function normalizarPrecoPromocional(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

export function validarPrecoPromocionalVariacao(preco, precoPromocional) {
  const promocional = normalizarPrecoPromocional(precoPromocional);
  if (promocional === null) return null;

  const precoNormal = Number(preco);
  if (!Number.isFinite(precoNormal) || precoNormal <= 0) {
    return 'Informe um preço normal válido antes de definir a promoção.';
  }

  if (!Number.isFinite(promocional) || promocional <= 0 || promocional >= precoNormal) {
    return 'O preço promocional deve ser maior que zero e menor que o preço normal.';
  }

  return null;
}

export function normalizarVariacaoParaEdicao(variacao) {
  return {
    ...variacao,
    preco_promocional: variacao?.preco_promocional ?? '',
    ativo: Number(variacao?.ativo) === 1 || variacao?.ativo === true,
  };
}
