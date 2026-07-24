import express from 'express';
import crypto from 'crypto';
import { WebhookSignatureValidator } from 'mercadopago';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';
import { consultarPagamento, criarPreferencia } from '../services/mercadoPagoService.js';
import { publicApiUrl } from '../config/runtime.js';

const router = express.Router();
const STATUS_PAGAVEIS = new Set(['pendente']);
const MP_MAX_INSTALLMENTS_DEFAULT = 12;
const MP_MAX_INSTALLMENTS_LIMIT = 12;

function configurarMeiosPagamento(valorConfigurado) {
  const valor = String(valorConfigurado || '').trim();
  const installments = /^\d+$/.test(valor) && Number(valor) > 0 && Number(valor) <= MP_MAX_INSTALLMENTS_LIMIT
    ? Number(valor)
    : MP_MAX_INSTALLMENTS_DEFAULT;

  return {
    // Prioriza credit_card e bank_transfer (PIX), excluindo tipos offline,
    // débito e pré-pago quando suportados pelo Checkout Pro. "Dinheiro em
    // conta" não pode ser excluído e pode aparecer para usuários logados.
    // Validar os meios efetivos em sandbox antes da produção.
    excluded_payment_types: [
      { id: 'ticket' },
      { id: 'atm' },
      { id: 'debit_card' },
      { id: 'prepaid_card' },
    ],
    installments,
  };
}

function removerBarraFinal(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function urlsCheckout() {
  const frontUrl = removerBarraFinal(process.env.FRONT_URL);
  const backendUrl = publicApiUrl(process.env);

  if (!frontUrl || !backendUrl) {
    throw new Error('URLs de Mercado Pago não configuradas');
  }

  return {
    backUrls: {
      success: `${frontUrl}/#/pagamento/sucesso`,
      pending: `${frontUrl}/#/pagamento/pendente`,
      failure: `${frontUrl}/#/pagamento/falhou`,
    },
    notificationUrl: `${backendUrl}/pagamentos/mercado-pago/webhook`,
  };
}

function redigirTextoDiagnostico(value) {
  const texto = String(value || '');

  if (/(?:access[_-]?token|authorization|token|secret|password)/i.test(texto)) {
    return '[REDACTED]';
  }

  return texto;
}

function resumirRespostaErro(value) {
  if (!value) return null;

  if (typeof value !== 'object') {
    return redigirTextoDiagnostico(value);
  }

  return {
    status: value.status ?? value.statusCode ?? null,
    message: value.message ? redigirTextoDiagnostico(value.message) : null,
    cause: value.cause ? redigirTextoDiagnostico(value.cause) : null,
  };
}

function diagnosticoSeguroErro(error) {
  const diagnostico = {
    name: error?.name || 'Error',
    message: redigirTextoDiagnostico(error?.message || 'Erro sem mensagem'),
    status: error?.status ?? error?.response?.status ?? error?.api_response?.status ?? null,
    cause: error?.cause?.message
      ? redigirTextoDiagnostico(error.cause.message)
      : (error?.cause ? redigirTextoDiagnostico(error.cause) : null),
    response: resumirRespostaErro(error?.response),
    api_response: resumirRespostaErro(error?.api_response),
  };

  if (process.env.NODE_ENV !== 'production' && error?.stack) {
    diagnostico.stack = redigirTextoDiagnostico(error.stack);
  }

  return diagnostico;
}

function paraCentavos(valor) {
  const numero = Number(valor);
  const centavos = Math.round(numero * 100);

  if (!Number.isFinite(numero) || !Number.isSafeInteger(centavos) || centavos < 0) {
    throw new Error('Valor monetário inválido no pedido');
  }

  return centavos;
}

function selecionarCheckoutUrl(preferencia, ambiente) {
  const checkoutUrl = ambiente === 'teste'
    ? (preferencia.sandboxCheckoutUrl || preferencia.checkoutUrl)
    : preferencia.checkoutUrl;

  return typeof checkoutUrl === 'string' && checkoutUrl.trim() ? checkoutUrl : null;
}

function pedidoEstaPagavel(pedido) {
  if (!STATUS_PAGAVEIS.has(String(pedido.status || '').trim().toLowerCase())) {
    return false;
  }

  return !pedido.expires_at || new Date(pedido.expires_at).getTime() > Date.now();
}

function montarValidadePreferencia(expiresAt, createdAt) {
  const expirationDateTo = new Date(expiresAt);
  const expirationDateFrom = new Date(createdAt);

  if (
    Number.isNaN(expirationDateTo.getTime())
    || Number.isNaN(expirationDateFrom.getTime())
    || expirationDateTo.getTime() <= Date.now()
    || expirationDateFrom.getTime() >= expirationDateTo.getTime()
  ) {
    throw new Error('Prazo de pagamento inválido ou expirado');
  }

  return {
    expirationDateFrom: expirationDateFrom.toISOString(),
    expirationDateTo: expirationDateTo.toISOString(),
  };
}

function respostaPreferencia(pedido, ambiente) {
  return {
    pedidoId: Number(pedido.id),
    preferenceId: pedido.mp_preference_id,
    checkoutUrl: pedido.mp_checkout_url,
    ambiente,
  };
}

function montarItens(itens, total) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Pedido sem itens');
  }

  const totalPedidoCentavos = paraCentavos(total);

  if (totalPedidoCentavos <= 0) {
    throw new Error('Total inválido no pedido');
  }

  let somaCentavos = 0;

  const itensMercadoPago = itens.map((item) => {
    const quantidade = Number(item.quantidade);
    const precoCentavos = paraCentavos(item.preco);

    if (!Number.isFinite(Number(item.preco)) || !Number.isSafeInteger(quantidade) || quantidade <= 0) {
      throw new Error('Quantidade inválida no item do pedido');
    }

    somaCentavos += precoCentavos * quantidade;

    return {
      id: String(item.variacao_id || item.produto_id),
      title: item.nome,
      quantity: quantidade,
      unit_price: precoCentavos / 100,
      currency_id: 'BRL',
    };
  });

  if (somaCentavos !== totalPedidoCentavos) {
    throw new Error('Divergência entre itens e total do pedido');
  }

  return itensMercadoPago;
}

async function carregarPedidoParaPreferencia(connection, pedidoId) {
  const [pedidos] = await connection.query(
    `SELECT p.id, p.usuario_id, p.status, p.total, p.created_at, p.expires_at,
            p.mp_preference_id, p.mp_checkout_url, u.nome, u.email
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.id = ?
     FOR UPDATE`,
    [pedidoId],
  );

  return pedidos[0] || null;
}

router.post('/mercado-pago/preferencia/:pedidoId', verificarToken, async (req, res) => {
  const pedidoId = Number(req.params.pedidoId);

  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ erro: 'Pedido inválido' });
  }

  const ambiente = process.env.NODE_ENV === 'production' ? 'producao' : 'teste';
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const pedido = await carregarPedidoParaPreferencia(connection, pedidoId);

    if (!pedido) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Pedido não encontrado' });
    }

    if (Number(pedido.usuario_id) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    if (!pedidoEstaPagavel(pedido)) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido não está disponível para pagamento' });
    }

    if (pedido.mp_preference_id && pedido.mp_checkout_url) {
      await connection.commit();
      return res.json(respostaPreferencia(pedido, ambiente));
    }

    const [itens] = await connection.query(
      `SELECT pi.produto_id, pi.variacao_id, pi.quantidade, pi.preco, pr.nome
       FROM pedido_itens pi
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE pi.pedido_id = ?
       ORDER BY pi.id ASC`,
      [pedidoId],
    );

    const itensMercadoPago = montarItens(itens, pedido.total);
    const validade = montarValidadePreferencia(pedido.expires_at, pedido.created_at);
    await connection.commit();
    connection.release();
    connection = null;

    const { backUrls, notificationUrl } = urlsCheckout();
    const preferencia = await criarPreferencia({
      pedidoId,
      comprador: { name: pedido.nome, email: pedido.email },
      itens: itensMercadoPago,
      valor: Number(pedido.total),
      backUrls,
      notificationUrl,
      paymentMethods: configurarMeiosPagamento(process.env.MP_MAX_INSTALLMENTS),
      validade,
      opcoes: { idempotencyKey: `mercado-pago-preferencia:${pedidoId}` },
    });

    const checkoutUrl = selecionarCheckoutUrl(preferencia, ambiente);

    if (
      !preferencia.preferenceId
      || !checkoutUrl
      || preferencia.externalReference !== String(pedidoId)
    ) {
      throw new Error('Resposta inválida ao criar preferência Mercado Pago');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const pedidoAtual = await carregarPedidoParaPreferencia(connection, pedidoId);

    if (!pedidoAtual || Number(pedidoAtual.usuario_id) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido atualizado durante o pagamento' });
    }

    if (!pedidoEstaPagavel(pedidoAtual)) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido não está disponível para pagamento' });
    }

    if (pedidoAtual.mp_preference_id && pedidoAtual.mp_checkout_url) {
      await connection.commit();
      return res.json(respostaPreferencia(pedidoAtual, ambiente));
    }

    const [updateResult] = await connection.query(
      `UPDATE pedidos
       SET mp_preference_id = ?, mp_checkout_url = ?
       WHERE id = ? AND mp_preference_id IS NULL AND mp_checkout_url IS NULL`,
      [preferencia.preferenceId, checkoutUrl, pedidoId],
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido atualizado durante o pagamento' });
    }

    await connection.commit();
    return res.json({
      pedidoId,
      preferenceId: preferencia.preferenceId,
      checkoutUrl,
      ambiente,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // noop
      }
    }

    console.error('Erro ao criar preferência Mercado Pago:', diagnosticoSeguroErro(error));
    return res.status(500).json({ erro: 'Não foi possível iniciar o pagamento' });
  } finally {
    if (connection) connection.release();
  }
});

function webhookSecret() {
  const secret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('Webhook Mercado Pago não configurado');
  return secret;
}

function pagamentoFoiAprovado(status) {
  return String(status || '').trim().toLowerCase() === 'approved';
}

function idPagamentoValido(value) {
  return /^\d+$/.test(String(value ?? '').trim());
}

function extrairNotificacaoPagamento(req) {
  const idModerno = req.query['data.id'] ?? req.body?.data?.id;
  const tipoModerno = req.body?.type ?? req.query.type;

  if (idModerno !== undefined && idModerno !== null && String(idModerno).trim() !== '') {
    return {
      formato: 'moderno',
      recursoId: String(idModerno).trim(),
      tipo: tipoModerno ? String(tipoModerno).trim() : null,
      acao: req.body?.action ?? req.query.action ?? null,
    };
  }

  const idLegado = req.query.id;
  const topicLegado = req.query.topic;
  if (idLegado !== undefined && idLegado !== null && String(idLegado).trim() !== '') {
    return {
      formato: 'legado',
      recursoId: String(idLegado).trim(),
      tipo: topicLegado ? String(topicLegado).trim() : null,
      acao: req.body?.action ?? req.query.action ?? null,
    };
  }

  return null;
}

function headersAssinaturaWebhook(req) {
  return {
    xSignature: req.headers?.['x-signature'] || req.get('x-signature'),
    xRequestId: req.headers?.['x-request-id'] || req.get('x-request-id'),
  };
}

function resumirAssinaturaWebhook(req, notificacao, erro = null) {
  const { xSignature, xRequestId } = headersAssinaturaWebhook(req);
  const assinatura = String(xSignature || '');
  const partes = assinatura.split(',').map((parte) => parte.trim());

  return {
    formato: notificacao.formato,
    query: notificacao.formato === 'moderno'
      ? { dataId: Boolean(req.query['data.id']), type: req.query.type || null }
      : { id: Boolean(req.query.id), topic: req.query.topic || null },
    possuiXSignature: Boolean(assinatura),
    possuiXRequestId: Boolean(xRequestId),
    possuiTs: partes.some((parte) => /^ts=\d+$/i.test(parte)),
    possuiV1: partes.some((parte) => /^v1=[a-f0-9]+$/i.test(parte)),
    motivo: erro?.reason || null,
  };
}

function validarPagamentoConsultado(pagamento, pedido, exigirCollector) {
  if (!pagamento?.paymentId || !idPagamentoValido(pagamento.paymentId)) {
    throw new Error('Pagamento Mercado Pago inválido');
  }

  if (pagamento.externalReference !== String(pedido.id)) {
    throw new Error('Pedido não corresponde ao pagamento');
  }

  if (String(pagamento.currencyId || '').toUpperCase() !== 'BRL') {
    throw new Error('Moeda do pagamento Mercado Pago inválida');
  }

  if (paraCentavos(pagamento.valorPago) !== paraCentavos(pedido.total)) {
    throw new Error('Valor do pagamento Mercado Pago não corresponde ao pedido');
  }

  if (exigirCollector) {
    const collectorEsperado = String(process.env.MERCADO_PAGO_COLLECTOR_ID || '').trim();
    if (!idPagamentoValido(collectorEsperado)) {
      throw new Error('MERCADO_PAGO_COLLECTOR_ID não configurado para notificação legada');
    }

    if (String(pagamento.collectorId || '') !== collectorEsperado) {
      throw new Error('Collector Mercado Pago não corresponde à loja');
    }
  }
}

function pagamentoFoiAprovadoNoPrazo(pagamento, pedido) {
  if (!pagamentoFoiAprovado(pagamento?.status)) return false;

  if (!pedido.expires_at) return true;

  const aprovadoEm = new Date(pagamento.dataAprovacao).getTime();
  const expiraEm = new Date(pedido.expires_at).getTime();
  return Number.isFinite(aprovadoEm) && Number.isFinite(expiraEm) && aprovadoEm <= expiraEm;
}

function pedidoPodeSerConfirmadoPorMercadoPago(pedido, pagamento) {
  const status = String(pedido.status || '').trim().toLowerCase();
  return (
    ['pendente', 'expirado'].includes(status)
    && pagamentoFoiAprovadoNoPrazo(pagamento, pedido)
  );
}

async function reaplicarReservaDeEstoque(connection, pedidoId) {
  const [itens] = await connection.query(
    `SELECT variacao_id, quantidade
     FROM pedido_itens
     WHERE pedido_id = ?
     ORDER BY variacao_id ASC`,
    [pedidoId],
  );

  for (const item of itens) {
    const [updateEstoque] = await connection.query(
      `UPDATE produto_variacoes
       SET estoque = estoque - ?
       WHERE id = ? AND estoque >= ?`,
      [item.quantidade, item.variacao_id, item.quantidade],
    );

    if (updateEstoque.affectedRows !== 1) {
      throw new Error('Estoque insuficiente para restaurar reserva do pedido aprovado');
    }
  }
}

/**
 * Aplica exclusivamente o resultado consultado na API oficial do Mercado Pago.
 * Webhook e reconciliação local compartilham esta mesma transação para não haver
 * caminhos distintos de confirmação de pedido.
 */
async function aplicarResultadoPagamentoMercadoPago(connection, {
  pedidoId,
  pagamento,
  exigirCollector = false,
  usuarioSolicitante = null,
  permitirAdmin = false,
  evento = null,
}) {
  const [pedidos] = await connection.query(
    `SELECT id, usuario_id, status, total, expires_at, pagamento, mp_payment_id,
            reconciliacao_status, reconciliacao_em
     FROM pedidos
     WHERE id = ?
     FOR UPDATE`,
    [pedidoId],
  );
  const pedido = pedidos[0];

  if (!pedido) throw new Error('Pedido não corresponde ao pagamento');

  if (usuarioSolicitante
    && Number(pedido.usuario_id) !== Number(usuarioSolicitante.id)
    && !permitirAdmin) {
    const error = new Error('Acesso negado ao pedido');
    error.statusCode = 403;
    throw error;
  }

  validarPagamentoConsultado(pagamento, pedido, exigirCollector);

  if (pedido.mp_payment_id && String(pedido.mp_payment_id) !== String(pagamento.paymentId)) {
    throw new Error('Pedido já associado a outro pagamento Mercado Pago');
  }

  if (pedido.pagamento !== 'mercado_pago') {
    throw new Error('Pedido não pertence ao fluxo Mercado Pago');
  }

  const pagamentoAprovado = pagamentoFoiAprovado(pagamento.status);
  const confirmarPedido = pedidoPodeSerConfirmadoPorMercadoPago(pedido, pagamento);
  const pedidoExpiradoComAprovacaoNoPrazo = confirmarPedido
    && String(pedido.status || '').trim().toLowerCase() === 'expirado';
  const pagamentoTardio = pagamentoAprovado
    && !pagamentoFoiAprovadoNoPrazo(pagamento, pedido);
  const reconciliacaoJaResolvida = ['resolvida_estorno', 'resolvida_atendimento']
    .includes(String(pedido.reconciliacao_status || '').trim().toLowerCase());
  const reconciliacaoSql = pagamentoTardio
    ? `,
         reconciliacao_status = CASE
           WHEN reconciliacao_status IN ('resolvida_estorno', 'resolvida_atendimento') THEN reconciliacao_status
           ELSE 'pendente'
         END,
         reconciliacao_motivo = CASE
           WHEN reconciliacao_status IN ('resolvida_estorno', 'resolvida_atendimento') THEN reconciliacao_motivo
           ELSE 'Pagamento aprovado após expiração'
         END,
         reconciliacao_em = CASE
           WHEN reconciliacao_status IN ('pendente', 'resolvida_estorno', 'resolvida_atendimento')
                AND reconciliacao_em IS NOT NULL THEN reconciliacao_em
           ELSE NOW()
         END`
    : '';
  const [updatePedido] = await connection.query(
    `UPDATE pedidos
     SET mp_payment_id = ?,
         mp_status = ?,
         mp_status_detail = ?,
         pagamento_atualizado_em = NOW()
         ${confirmarPedido ? ", pagamento_confirmado_em = COALESCE(pagamento_confirmado_em, ?), status = 'pago'" : ''}
         ${reconciliacaoSql}
     WHERE id = ?
       AND (mp_payment_id IS NULL OR mp_payment_id = ?)
       ${confirmarPedido ? "AND status IN ('pendente', 'expirado')" : ''}`,
    [
      pagamento.paymentId,
      pagamento.status,
      pagamento.statusDetail,
      ...(confirmarPedido ? [pagamento.dataAprovacao] : []),
      pedidoId,
      pagamento.paymentId,
    ],
  );

  if (updatePedido.affectedRows !== 1) {
    throw new Error('Pedido atualizado por outra operação');
  }

  // O scheduler devolve a reserva ao expirar. Se a API oficial comprovar que o
  // pagamento foi aprovado antes do prazo, esta única baixa desfaz a devolução.
  if (pedidoExpiradoComAprovacaoNoPrazo) {
    await reaplicarReservaDeEstoque(connection, pedidoId);
  }

  if (evento) {
    await connection.query(
      `UPDATE pagamento_eventos
       SET pedido_id = ?, processado = 1, processado_em = NOW(), erro = ?
       WHERE provedor = ? AND evento_id = ?`,
      [
        pedidoId,
        pagamentoTardio
          ? reconciliacaoJaResolvida
            ? 'Pagamento aprovado após expiração; reconciliação já resolvida'
            : 'Pagamento aprovado após expiração; requer reconciliação operacional'
          : null,
        evento.provedor,
        evento.eventoId,
      ],
    );
  }

  return {
    pedidoId: Number(pedido.id),
    status: confirmarPedido ? 'pago' : pedido.status,
    mpStatus: pagamento.status,
    mpPaymentId: pagamento.paymentId,
    confirmado: confirmarPedido,
    reconciliado: pagamentoAprovado && (confirmarPedido || pedido.status === 'pago'),
    estoqueReaplicado: pedidoExpiradoComAprovacaoNoPrazo,
    pagamentoTardio,
  };
}

router.post('/mercado-pago/:pedidoId/reconciliar', verificarToken, async (req, res) => {
  const pedidoId = Number(req.params.pedidoId);
  const paymentId = String(req.body?.payment_id ?? '').trim();

  console.info('Reconciliação Mercado Pago recebida:', {
    pedidoId,
    usuarioId: req.user?.id ?? null,
    tipoUsuario: req.user?.tipo ?? null,
    paymentId: paymentId || null,
  });

  if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0 || !idPagamentoValido(paymentId)) {
    console.warn('Reconciliação Mercado Pago rejeitada: dados inválidos');
    return res.status(400).json({ erro: 'Dados de reconciliação inválidos' });
  }

  let connection;
  try {
    // O identificador recebido só inicia a consulta: status, valor e referência
    // são sempre obtidos novamente da API oficial antes de qualquer alteração.
    const pagamento = await consultarPagamento(paymentId);
    console.info('Pagamento Mercado Pago consultado na reconciliação:', {
      paymentId: pagamento.paymentId,
      externalReference: pagamento.externalReference,
      status: pagamento.status,
    });
    if (pagamento.externalReference !== String(pedidoId)) {
      console.warn('Reconciliação Mercado Pago rejeitada: referência externa divergente');
      return res.status(409).json({ erro: 'Pagamento não corresponde ao pedido' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const resultado = await aplicarResultadoPagamentoMercadoPago(connection, {
      pedidoId,
      pagamento,
      exigirCollector: true,
      usuarioSolicitante: req.user,
      permitirAdmin: req.user.tipo === 'admin',
    });
    await connection.commit();
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    const status = error?.statusCode || 409;
    console.error('Reconciliação Mercado Pago falhou:', {
      pedidoId,
      paymentId: paymentId || null,
      motivo: error?.message || error?.code || error?.name || 'erro',
    });
    return res.status(status).json({ erro: 'Não foi possível reconciliar o pagamento' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/mercado-pago/webhook', async (req, res) => {
  const notificacao = extrairNotificacaoPagamento(req);

  if (!notificacao || notificacao.tipo !== 'payment' || !idPagamentoValido(notificacao.recursoId)) {
    return res.status(400).json({ erro: 'Evento de pagamento inválido' });
  }

  const recursoId = notificacao.recursoId;
  const { xSignature, xRequestId } = headersAssinaturaWebhook(req);
  const possuiCabecalhoAssinatura = Boolean(xSignature || xRequestId);
  const assinaturaObrigatoria = notificacao.formato === 'moderno';

  if (assinaturaObrigatoria) {
    let secret;
    try {
      secret = webhookSecret();
    } catch {
      return res.status(500).json({ erro: 'Webhook Mercado Pago não configurado' });
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId: recursoId,
        secret,
      });
    } catch (error) {
      const resumo = resumirAssinaturaWebhook(req, notificacao, error);
      console.warn('Webhook Mercado Pago rejeitado:', resumo);
      return res.status(401).json({ erro: 'Assinatura inválida' });
    }
  } else if (possuiCabecalhoAssinatura) {
    // IPN legado não oferece assinatura como garantia de autenticidade. Os
    // headers recebidos são registrados somente para diagnóstico; a origem é
    // confirmada pela consulta oficial e pelas validações abaixo.
    console.info('IPN legado recebeu headers de assinatura:', resumirAssinaturaWebhook(req, notificacao));
  }

  const { tipo, acao } = notificacao;

  const eventoId = req.body?.id
    ? String(req.body.id)
    : crypto.createHash('sha256')
      .update(['mercado_pago', tipo, acao || '', recursoId, req.get('x-request-id') || ''].join('|'))
      .digest('hex');

  const evento = {
    provedor: 'mercado_pago',
    eventoId,
    tipo: String(tipo),
    acao: acao ? String(acao) : null,
    recursoId: String(recursoId),
    payload: JSON.stringify({ id: req.body?.id, type: tipo, action: acao, data: { id: recursoId } }),
  };

  try {
    const [existentes] = await db.query(
      `SELECT id, processado FROM pagamento_eventos WHERE provedor = ? AND evento_id = ?`,
      [evento.provedor, evento.eventoId],
    );

    if (existentes[0]?.processado) return res.status(200).json({ ok: true });

    if (!existentes.length) {
      try {
        await db.query(
          `INSERT INTO pagamento_eventos (provedor, evento_id, tipo, acao, recurso_id, payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [evento.provedor, evento.eventoId, evento.tipo, evento.acao, evento.recursoId, evento.payload],
        );
      } catch (error) {
        if (error?.code !== 'ER_DUP_ENTRY') throw error;
      }
    }

    // Eventos não financeiros continuam auditados, sem consultar ou alterar pedidos.
    if (evento.tipo !== 'payment') {
      await db.query(
        `UPDATE pagamento_eventos SET processado = 1, processado_em = NOW() WHERE provedor = ? AND evento_id = ?`,
        [evento.provedor, evento.eventoId],
      );
      return res.status(200).json({ ok: true });
    }

    const pagamento = await consultarPagamento(evento.recursoId);
    const pedidoId = Number(pagamento.externalReference);

    if (!Number.isSafeInteger(pedidoId) || pedidoId <= 0 || pagamento.externalReference !== String(pedidoId)) {
      throw new Error('Referência externa inválida');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [eventosEmTransacao] = await connection.query(
        `SELECT id, processado
         FROM pagamento_eventos
         WHERE provedor = ? AND evento_id = ?
         FOR UPDATE`,
        [evento.provedor, evento.eventoId],
      );

      if (!eventosEmTransacao.length) {
        throw new Error('Evento de pagamento não encontrado');
      }

      if (eventosEmTransacao[0].processado) {
        await connection.commit();
        return res.status(200).json({ ok: true });
      }

      await aplicarResultadoPagamentoMercadoPago(connection, {
        pedidoId,
        pagamento,
        exigirCollector: notificacao.formato === 'legado',
        evento,
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    await db.query(
      `UPDATE pagamento_eventos SET erro = ? WHERE provedor = ? AND evento_id = ?`,
      ['Falha ao processar evento de pagamento', evento.provedor, evento.eventoId],
    ).catch(() => {});
    console.error('Webhook Mercado Pago falhou:', error?.code || error?.name || 'erro');
    return res.status(500).json({ erro: 'Não foi possível processar o pagamento' });
  }
});

export {
  configurarMeiosPagamento,
  montarItens,
  montarValidadePreferencia,
  pedidoEstaPagavel,
  removerBarraFinal,
  selecionarCheckoutUrl,
  extrairNotificacaoPagamento,
  idPagamentoValido,
  pagamentoFoiAprovadoNoPrazo,
  aplicarResultadoPagamentoMercadoPago,
  resumirAssinaturaWebhook,
  headersAssinaturaWebhook,
  urlsCheckout,
};
export default router;
