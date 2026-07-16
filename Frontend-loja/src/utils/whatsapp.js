function formatarValor(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

export function normalizarNumeroWhatsApp(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!/^55\d{10,11}$/.test(digits)) {
    throw new Error('WhatsApp da loja não está configurado corretamente. Tente novamente mais tarde.');
  }

  return digits;
}

export function montarMensagemWhatsApp({ pedido, itens = [], numero }) {
  const pedidoId = pedido?.pedido_id ?? pedido?.id ?? '';
  const valor = pedido?.valor ?? pedido?.total ?? pedido?.valor_total ?? 0;
  const listaItens = Array.isArray(itens) && itens.length > 0 ? itens : pedido?.itens || [];

  const itensTexto = listaItens
    .map((item) => {
      const nome = item?.nome || 'Produto';
      const tamanho = item?.tamanho || '-';
      const cor = item?.cor || '-';
      const quantidade = Number(item?.quantidade || 0);
      const preco = Number(item?.preco || 0);
      const valorItem = preco * quantidade;

      return `- ${nome} (${tamanho} / ${cor}) x${quantidade} = ${formatarValor(valorItem)}`;
    })
    .join('\n');

  return [
    'NOVO PEDIDO FINALIZAR WHATSAPP - DL MODAS',
    '',
    `Pedido: #${pedidoId}`,
    '',
    'Valor:',
    formatarValor(valor),
    '',
    'PRODUTOS:',
    itensTexto || 'Nenhum item informado',
    '',
    'Status:',
    'Aguardando confirmação',
    '',
    'Cliente aguardando para finalizar o pagamento via WhatsApp.',
  ].join('\n');
}

export function montarUrlWhatsApp({ pedido, itens = [], numero, windowRef = window }) {
  const mensagem = montarMensagemWhatsApp({ pedido, itens, numero });
  const destino = normalizarNumeroWhatsApp(numero);
  const url = `https://wa.me/${destino}?text=${encodeURIComponent(mensagem)}`;

  if (typeof windowRef?.open === 'function') {
    windowRef.open(url, '_blank');
  }

  return url;
}
