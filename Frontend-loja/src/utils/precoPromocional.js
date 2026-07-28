function paraNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function possuiNumeroValido(valor) {
  return valor !== null
    && valor !== undefined
    && valor !== ''
    && Number.isFinite(Number(valor));
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
  const precoNormal = paraNumero(possuiNumeroValido(variacao?.preco) ? variacao.preco : preco);
  const precoPromocional = variacao?.preco_promocional;
  const temPromocao = promocaoValida(precoNormal, precoPromocional);

  return {
    precoNormal,
    precoPromocional: temPromocao ? Number(precoPromocional) : null,
    precoEfetivo: temPromocao ? Number(precoPromocional) : precoNormal,
    temPromocao,
  };
}

export function obterDadosPrecoCarrinho(variacao) {
  const exibicao = obterPrecoParaExibicao({ variacao });

  return {
    preco_normal: exibicao.precoNormal,
    preco_promocional: exibicao.precoPromocional,
    preco_efetivo: exibicao.precoEfetivo,
  };
}

// O campo `preco` continua sendo a base de compatibilidade para carrinhos
// antigos. Metadados visuais jamais podem tornar os totais inválidos.
export function obterPrecoEfetivoCarrinho(item) {
  return obterPrecoParaExibicao({
    variacao: {
      preco: item?.preco_normal ?? item?.preco,
      preco_promocional: item?.preco_promocional,
    },
    preco: item?.preco,
  }).precoEfetivo;
}
