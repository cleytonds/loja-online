function paraNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function promocaoValida(precoNormal, precoPromocional) {
  const normal = Number(precoNormal);
  const promocional = Number(precoPromocional);

  return Number.isFinite(normal)
    && Number.isFinite(promocional)
    && promocional > 0
    && promocional < normal;
}

export function obterPrecoParaExibicao({ variacao, preco } = {}) {
  const precoNormal = paraNumero(variacao?.preco ?? preco);
  const precoPromocional = variacao?.preco_promocional;
  const temPromocao = promocaoValida(precoNormal, precoPromocional);

  return {
    precoNormal,
    precoPromocional: temPromocao ? Number(precoPromocional) : null,
    precoEfetivo: temPromocao ? Number(precoPromocional) : precoNormal,
    temPromocao,
  };
}
