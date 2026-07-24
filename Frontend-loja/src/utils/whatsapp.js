export function normalizarNumeroWhatsApp(value) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!/^55\d{10,11}$/.test(digits)) {
    throw new Error('Atendimento via WhatsApp indisponível. Tente novamente mais tarde.');
  }

  return digits;
}

export function montarLinkWhatsApp({ numero, mensagem }) {
  const destino = normalizarNumeroWhatsApp(numero);
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirAtendimentoWhatsApp({ numero, mensagem, windowRef = window }) {
  const url = montarLinkWhatsApp({ numero, mensagem });

  if (typeof windowRef?.open === 'function') {
    const novaAba = windowRef.open(url, '_blank', 'noopener,noreferrer');
    if (novaAba) novaAba.opener = null;
  }

  return url;
}

export function pedidoPodeTratarEntrega(status) {
  return ['pago', 'enviado'].includes(String(status || '').trim().toLowerCase());
}

export function pedidoPodeCombinarEntregaMercadoPago(pedido) {
  return String(pedido?.status || '').trim().toLowerCase() === 'pago'
    && String(pedido?.pagamento || '').trim().toLowerCase() === 'mercado_pago'
    && String(pedido?.mp_status || '').trim().toLowerCase() === 'approved'
    && Boolean(pedido?.pagamento_confirmado_em);
}

export function montarMensagemEntregaPedido({ pedido, nomeCliente }) {
  const pedidoId = pedido?.pedido_id ?? pedido?.id;
  const itens = Array.isArray(pedido?.itens) ? pedido.itens : [];
  const formasPagamento = {
    mercado_pago: 'Mercado Pago',
    pix: 'PIX',
    cartao_credito: 'Cartão de Crédito',
    credit_card: 'Cartão de Crédito',
    whatsapp: 'WhatsApp',
  };
  const statusFormatado = String(pedido?.status || '').trim().toLowerCase();
  const pagamento = formasPagamento[String(pedido?.pagamento || '').trim().toLowerCase()] || 'Não informado';
  const total = Number(pedido?.total || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const linhasItens = itens.length
    ? itens.flatMap((item) => [
      `- ${item.nome || 'Produto'}`,
      `  Cor: ${item.cor || 'Não informada'}`,
      `  Tamanho: ${item.tamanho || 'Não informado'}`,
      `  Quantidade: ${Number(item.quantidade || 0)}`,
    ])
    : ['- Itens não informados'];

  return [
    'Olá! Meu pedido foi pago e gostaria de combinar a entrega.',
    '',
    `Pedido: #${pedidoId || 'não informado'}`,
    `Cliente: ${nomeCliente || 'Não informado'}`,
    `Valor: ${total}`,
    `Forma de pagamento: ${pagamento}`,
    `Status: ${statusFormatado ? `${statusFormatado.charAt(0).toUpperCase()}${statusFormatado.slice(1)}` : 'Não informado'}`,
    '',
    'Itens:',
    ...linhasItens,
    '',
    'Gostaria de combinar a entrega, por favor.',
  ].join('\n');
}

// Compatibilidade temporária com telas legadas: abre somente atendimento,
// sem criar pedido, alterar status ou iniciar pagamento.
export function montarUrlWhatsApp({ pedido, numero, windowRef = window }) {
  const pedidoId = pedido?.pedido_id ?? pedido?.id;
  const mensagem = pedidoId
    ? `Olá! Estou com uma dúvida sobre o pedido #${pedidoId}.`
    : 'Olá! Tenho uma dúvida sobre uma compra na DL Modas.';

  return abrirAtendimentoWhatsApp({ numero, mensagem, windowRef });
}
