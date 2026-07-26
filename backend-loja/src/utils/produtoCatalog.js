function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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
    estoque: Math.max(0, Math.floor(toNumber(variacao?.estoque))),
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
