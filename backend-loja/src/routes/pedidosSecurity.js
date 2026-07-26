export function isAdminUser(req) {
  return req?.user?.tipo === 'admin';
}

export function normalizeStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function exigeComprovanteParaConfirmacao({ currentStatus, novoStatus }) {
  return (
    normalizeStatus(currentStatus) === 'aguardando_confirmacao' &&
    normalizeStatus(novoStatus) === 'pago'
  );
}

export function validarTransicaoStatus({ user, currentStatus, novoStatus, expiresAt }) {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(novoStatus);

  if (!isAdminUser({ user })) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Ação não permitida',
    };
  }

  if (!next) {
    return {
      allowed: false,
      statusCode: 400,
      message: 'Status inválido',
    };
  }

  if (['entregue', 'cancelado', 'expirado'].includes(current)) {
    return {
      allowed: false,
      statusCode: 409,
      message: 'Pedido finalizado não pode ser alterado.',
    };
  }

  if (current === next) {
    return {
      allowed: false,
      statusCode: 400,
      message: 'Transição de status não permitida',
      atual: current,
      novo: next,
    };
  }

  const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

  if (expiresAtDate && !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() < Date.now()) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Pedido expirado não pode ser alterado',
    };
  }

  if (next === 'cancelado' && current !== 'aguardando_confirmacao') {
    return {
      allowed: false,
      statusCode: 400,
      message: 'Reprovação PIX só é permitida para pedidos aguardando confirmação',
    };
  }

  const allowedTransitions = {
    // Pedidos WhatsApp são confirmados manualmente, sem comprovante PIX.
    pendente: ['pago', 'cancelado'],
    aguardando_confirmacao: ['pago', 'cancelado'],
    pago: ['enviado'],
    enviado: ['entregue'],
    entregue: [],
    cancelado: [],
    expirado: [],
  };

  const allowedNext = allowedTransitions[current] || [];

  if (!allowedNext.includes(next)) {
    return {
      allowed: false,
      statusCode: 400,
      message: 'Transição de status não permitida',
    };
  }

  return {
    allowed: true,
    atual: current,
    novo: next,
  };
}
