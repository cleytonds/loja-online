function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

export function promocaoEhValida(preco, precoPromocional) {
  const precoNormal = Number(preco);
  const promocional = Number(precoPromocional);

  return Number.isFinite(precoNormal)
    && Number.isFinite(promocional)
    && promocional > 0
    && promocional < precoNormal;
}

export function obterPrecoEfetivo({ preco, preco_promocional: precoPromocional } = {}) {
  return promocaoEhValida(preco, precoPromocional)
    ? Number(precoPromocional)
    : Number(preco);
}

export function validarPrecoPromocional(variacao) {
  const preco = Number(variacao?.preco);
  const precoPromocional = variacao?.preco_promocional;

  if (!Number.isFinite(preco) || preco < 0) {
    const error = new Error('Preço normal da variação é inválido');
    error.statusCode = 400;
    throw error;
  }

  if (precoPromocional === null || precoPromocional === undefined) return;

  if (!promocaoEhValida(preco, precoPromocional)) {
    const error = new Error('Preço promocional deve ser maior que zero e menor que o preço normal');
    error.statusCode = 400;
    throw error;
  }
}

export function normalizeVariacoesPayload(variacoes) {
  if (!Array.isArray(variacoes)) {
    return [];
  }

  return variacoes.map((variacao) => ({
    ...variacao,
    tamanho: String(variacao?.tamanho ?? '').trim(),
    cor: String(variacao?.cor ?? '').trim(),
    preco: toNumber(variacao?.preco),
    preco_promocional: toOptionalNumber(variacao?.preco_promocional),
    estoque: Math.max(0, Math.floor(toNumber(variacao?.estoque))),
    ativo: variacao?.ativo,
    id: variacao?.id ? Number(variacao.id) : undefined,
  }));
}

export function buildVariacaoPlan(currentVariacoes = [], incomingVariacoes = []) {
  const currentIds = new Set(currentVariacoes.map((item) => Number(item.id)).filter(Boolean));
  const incomingIds = new Set(
    incomingVariacoes.map((item) => Number(item.id)).filter(Boolean),
  );

  const updates = incomingVariacoes.filter((item) => Number(item.id));
  const inserts = incomingVariacoes.filter((item) => !Number(item.id));
  const deletions = [...currentIds].filter((id) => !incomingIds.has(id));

  return { updates, inserts, deletions };
}
