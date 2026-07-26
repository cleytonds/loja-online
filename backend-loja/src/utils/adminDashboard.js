export function buildVendasSeries(rows = []) {
  const agrupado = new Map();

  for (const row of rows) {
    const mes = String(row?.mes || '').trim();
    const total = Number(row?.total || 0);

    if (!mes) continue;

    const atual = agrupado.get(mes) || 0;
    agrupado.set(mes, atual + total);
  }

  return Array.from(agrupado.entries())
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}
