import express from 'express';
import db from '../config/database.js';
import { verificarToken } from '../middlewares/auth.js';
import {
  isAdminUser,
  normalizeStatus,
  validarTransicaoStatus,
} from './pedidosSecurity.js';
import { buildAtendimentoConfig } from '../utils/atendimentoConfig.js';
import { buildVendasSeries } from '../utils/adminDashboard.js';
import { isDuplicateKeyError, normalizeIdempotencyKey } from '../utils/idempotency.js';
import { startOrderScheduler } from '../utils/orderScheduler.js';
import {
  PRAZO_RESERVA_MERCADO_PAGO_MINUTOS,
  prazoReservaMinutos,
} from '../utils/orderExpiration.js';

const router = express.Router();

function getPagination(query) {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return { hasPagination, page, limit, offset: (page - 1) * limit };
}

const atendimentoConfig = buildAtendimentoConfig(process.env);

// Número público de atendimento. A fonte continua sendo exclusivamente
// WHATSAPP_NUMERO no backend; não participa de criação ou alteração de pedido.
router.get('/atendimento/whatsapp', (req, res) => {
  if (!atendimentoConfig.whatsappNumber) {
    return res.status(503).json({ erro: 'Atendimento via WhatsApp indisponível' });
  }

  return res.json({ whatsapp_number: atendimentoConfig.whatsappNumber });
});

/*
=========================
CRIAR PEDIDO
=========================
*/
router.post('/', verificarToken, async (req, res) => {
  const allowedPagamentos = ['mercado_pago'];
  const { itens, pagamento } = req.body;
  const idempotencyKey = normalizeIdempotencyKey(req.get('X-Idempotency-Key'));

  if (!idempotencyKey) {
    return res.status(400).json({ erro: 'X-Idempotency-Key inválida ou ausente' });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Carrinho vazio' });
  }

  if (!allowedPagamentos.includes(pagamento)) {
    return res.status(400).json({ erro: 'Pagamento inválido' });
  }

  // O frontend informa apenas identificação e quantidade. Preço é obtido do banco.
  // Agrupar antes de reservar impede que a mesma variação gere estoque negativo.
  const itensAgrupados = new Map();

  for (const item of itens) {
    const produtoId = Number(item?.produto_id);
    const variacaoId = Number(item?.variacao_id);
    const quantidadeNum = Number(item?.quantidade);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ erro: 'Produto inválido' });
    }
    if (!Number.isInteger(variacaoId) || variacaoId <= 0) {
      return res.status(400).json({ erro: 'Variação inválida' });
    }
    if (!Number.isInteger(quantidadeNum) || quantidadeNum <= 0) {
      return res.status(400).json({ erro: 'Quantidade inválida' });
    }
  }

  const itensNormalizados = [];

  for (const item of itens) {
    const produtoId = Number(item.produto_id);
    const variacaoId = Number(item.variacao_id);
    const quantidade = Number(item.quantidade);
    const itemExistente = itensAgrupados.get(variacaoId);

    if (itemExistente && itemExistente.produto_id !== produtoId) {
      return res.status(400).json({ erro: 'Produto e variação inválidos' });
    }

    const quantidadeAgrupada = (itemExistente?.quantidade || 0) + quantidade;

    if (!Number.isSafeInteger(quantidadeAgrupada)) {
      return res.status(400).json({ erro: 'Quantidade inválida' });
    }

    itensAgrupados.set(variacaoId, {
      produto_id: produtoId,
      variacao_id: variacaoId,
      quantidade: quantidadeAgrupada,
    });
  }

  itensNormalizados.push(...itensAgrupados.values());

  let connection;

  try {
    const usuario_id = req.user.id;

    connection = await db.getConnection();

    const [pedidoExistente] = await connection.query(
      `SELECT id, total FROM pedidos WHERE usuario_id = ? AND idempotency_key = ?`,
      [usuario_id, idempotencyKey],
    );

    if (pedidoExistente.length) {
      return res.json({
        pedido_id: pedidoExistente[0].id,
        total: Number(pedidoExistente[0].total),
      });
    }

    const { itens, pagamento } = req.body;
    const prazoExpiracaoMinutos = prazoReservaMinutos(pagamento);

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        erro: 'Carrinho vazio',
      });
    }

    await connection.beginTransaction();

    let totalCentavos = 0;
    const itensPedido = [];

    // valida estoque com bloqueio da linha
    for (const item of itensNormalizados) {
      const [rows] = await connection.query(
        `
        SELECT preco, estoque
        FROM produto_variacoes
        WHERE id=? AND produto_id=? AND ativo = 1
        FOR UPDATE
        `,
        [item.variacao_id, item.produto_id],
      );

      if (!rows.length) {
        await connection.rollback();

        return res.status(400).json({
          erro: 'Variação não encontrada',
        });
      }

      if (rows[0].estoque < item.quantidade) {
        await connection.rollback();

        return res.status(400).json({
          erro: 'Estoque insuficiente',
        });
      }

      const preco = Number(rows[0].preco);
      const precoCentavos = Math.round(preco * 100);

      if (!Number.isSafeInteger(precoCentavos) || precoCentavos < 0) {
        throw new Error('Preco invalido da variacao');
      }

      totalCentavos += precoCentavos * item.quantidade;

      if (!Number.isSafeInteger(totalCentavos)) {
        throw new Error('Total do pedido invalido');
      }

      itensPedido.push({ ...item, preco });
    }

    const total = totalCentavos / 100;

    // cria pedido
    let pedido;
    try {
      [pedido] = await connection.query(
        `
      INSERT INTO pedidos
      (
      usuario_id,
      total,
      status,
      pagamento,
      idempotency_key,
      created_at,
      expires_at
      )

      VALUES
      (
      ?,
      ?,
      'pendente',
      ?,
      ?,
      NOW(),
      DATE_ADD(NOW(), INTERVAL ${prazoExpiracaoMinutos} MINUTE)
      )
      `,
        [usuario_id, total, pagamento, idempotencyKey],
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;

      await connection.rollback();
      const [pedidoDuplicado] = await db.query(
        `SELECT id, total, usuario_id FROM pedidos WHERE idempotency_key = ?`,
        [idempotencyKey],
      );

      if (pedidoDuplicado.length && Number(pedidoDuplicado[0].usuario_id) === Number(usuario_id)) {
        return res.json({
          pedido_id: pedidoDuplicado[0].id,
          total: Number(pedidoDuplicado[0].total),
        });
      }

      return res.status(409).json({ erro: 'Chave de idempotência já utilizada' });
    }

    const pedido_id = pedido.insertId;

    // salva itens + reserva estoque
    for (const item of itensPedido) {
      await connection.query(
        `
        INSERT INTO pedido_itens
        (
        pedido_id,
        produto_id,
        variacao_id,
        quantidade,
        preco
        )
        VALUES (?,?,?,?,?)
        `,
        [pedido_id, item.produto_id, item.variacao_id, item.quantidade, item.preco],
      );

      const [reservaEstoque] = await connection.query(
        `
        UPDATE produto_variacoes
        SET estoque = estoque - ?
        WHERE id=? AND produto_id=? AND estoque >= ?
        `,
        [item.quantidade, item.variacao_id, item.produto_id, item.quantidade],
      );

      if (reservaEstoque.affectedRows !== 1) {
        throw new Error('Nao foi possivel reservar o estoque');
      }
    }

    // confirma tudo
    await connection.commit();

    res.json({
      pedido_id,
      total,
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error('ERRO PEDIDO:', err);

    res.status(500).json({
      erro: 'Erro ao criar pedido',
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/*
=========================
MEUS PEDIDOS
=========================
*/

router.get('/vendas', verificarToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const [rows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes, SUM(total) AS total
      FROM pedidos
      WHERE status IN ('pago', 'enviado', 'entregue')
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY mes ASC
    `);

    res.json(buildVendasSeries(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar vendas' });
  }
});

router.get('/meus', verificarToken, async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const paginationSql = pagination.hasPagination ? ' LIMIT ? OFFSET ?' : '';
    const queryParams = pagination.hasPagination
      ? [req.user.id, pagination.limit, pagination.offset]
      : [req.user.id];
    const [pedidos] = await db.query(
      `
     SELECT
        p.id,
        p.total,
        p.status,
        p.pagamento,
        p.created_at,
        p.expires_at,
        p.mp_status,
        p.pagamento_confirmado_em
      FROM pedidos p
      WHERE p.usuario_id = ?
      ORDER BY p.created_at DESC, p.id DESC${paginationSql}
    `,
      queryParams,
    );

    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length === 0) return res.json(pedidos);

    const placeholders = pedidoIds.map(() => '?').join(',');

    const [itensRows] = await db.query(
      `
        SELECT 
          pi.pedido_id,
          pi.produto_id,
          pi.variacao_id,
          pi.quantidade,
          pi.preco,
          pr.nome,
          img.url AS imagem_principal,
          v.tamanho,
          v.cor,
          v.estoque,
          v.preco AS preco_atual
        FROM pedido_itens pi
        JOIN produtos pr ON pr.id = pi.produto_id
        JOIN produto_variacoes v ON v.id = pi.variacao_id
        LEFT JOIN produto_imagens img ON img.produto_id = pr.id AND img.is_principal = 1
        WHERE pi.pedido_id IN (${placeholders})
        ORDER BY pi.pedido_id DESC
      `,
      pedidoIds,
    );

    const mapa = new Map();

    for (const p of pedidos) {
      mapa.set(p.id, []);
    }

    for (const item of itensRows) {
      const arr = mapa.get(item.pedido_id);
      if (arr) arr.push(item);
    }

    // preserva ordem de itens já retornada pelo JOIN (ORDER BY pi.pedido_id)
    for (const pedido of pedidos) {
      pedido.itens = mapa.get(pedido.id) || [];
      pedido.whatsapp_number = atendimentoConfig.whatsappNumber;
    }

    if (!pagination.hasPagination) return res.json(pedidos);

    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM pedidos WHERE usuario_id = ?', [req.user.id]);
    return res.json({
      data: pedidos,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: Number(countRows[0].total),
        totalPages: Math.ceil(Number(countRows[0].total) / pagination.limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar pedidos' });
  }
});

/*
=========================
ADMIN PEDIDOS
=========================
*/

router.get('/', verificarToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const tipo = String(req.query.tipo || '').trim().toLowerCase();
    const statusPorTipo = {
      atuais: ['pendente', 'pago'],
      historico: ['enviado', 'entregue'],
    };

    if (tipo && !statusPorTipo[tipo]) {
      return res.status(400).json({ erro: 'Tipo de pedidos inválido' });
    }

    const statusFiltro = statusPorTipo[tipo] || null;
    const reconciliacaoStatus = String(req.query.reconciliacao_status || '').trim().toLowerCase();
    const reconciliacaoPermitidos = ['nenhuma', 'pendente', 'resolvida_estorno', 'resolvida_atendimento'];

    if (reconciliacaoStatus && !reconciliacaoPermitidos.includes(reconciliacaoStatus)) {
      return res.status(400).json({ erro: 'Status de reconciliação inválido' });
    }

    const whereParts = [];
    const whereParams = [];
    if (statusFiltro) {
      whereParts.push(`p.status IN (${statusFiltro.map(() => '?').join(',')})`);
      whereParams.push(...statusFiltro);
    }
    if (reconciliacaoStatus) {
      whereParts.push('p.reconciliacao_status = ?');
      whereParams.push(reconciliacaoStatus);
    }
    const whereSql = whereParts.length ? ` WHERE ${whereParts.join(' AND ')}` : '';
    const pagination = getPagination(req.query);
    const paginationSql = pagination.hasPagination ? ' LIMIT ? OFFSET ?' : '';
    const queryParams = [
      ...whereParams,
      ...(pagination.hasPagination ? [pagination.limit, pagination.offset] : []),
    ];
    const orderSql = reconciliacaoStatus === 'pendente'
      ? 'ORDER BY p.reconciliacao_em ASC, p.id ASC'
      : 'ORDER BY p.created_at DESC, p.id DESC';

    const [pedidos] = await db.query(`
      SELECT 
        p.id,
        p.usuario_id,
        u.nome AS usuario_nome,
        u.email AS usuario_email,
        u.celular AS usuario_celular,
        p.total,
        p.status,
        p.pagamento,
        p.created_at,
        p.expires_at,
        p.mp_payment_id,
        p.mp_status,
        p.mp_status_detail,
        p.pagamento_confirmado_em,
        p.pagamento_atualizado_em,
        p.reconciliacao_status,
        p.reconciliacao_motivo,
        p.reconciliacao_em,
        p.reconciliacao_resolvida_em,
        p.reconciliacao_resolvida_por,
        COALESCE(resumo.quantidade_produtos, 0) AS quantidade_produtos,
        COALESCE(resumo.quantidade_pecas, 0) AS quantidade_pecas
      FROM pedidos p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN (
        SELECT
          pedido_id,
          COUNT(*) AS quantidade_produtos,
          COALESCE(SUM(quantidade), 0) AS quantidade_pecas
        FROM pedido_itens
        GROUP BY pedido_id
      ) resumo ON resumo.pedido_id = p.id${whereSql}
      ${orderSql}${paginationSql}
    `, queryParams);

    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length === 0) {
      if (pagination.hasPagination) {
        const [countRows] = await db.query(
          `SELECT COUNT(*) AS total FROM pedidos p${whereSql}`,
          whereParams,
        );
        return res.json({
          data: [],
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: Number(countRows[0].total),
            totalPages: Math.ceil(Number(countRows[0].total) / pagination.limit),
          },
        });
      }

      return res.json(pedidos);
    }

    const placeholders = pedidoIds.map(() => '?').join(',');

    const [itensRows] = await db.query(
      `
        SELECT 
          pi.pedido_id,
          pi.produto_id,
          pi.variacao_id,
          pi.quantidade,
          pi.preco,
          pr.nome,
          v.tamanho,
          v.cor
        FROM pedido_itens pi
        JOIN produtos pr ON pr.id = pi.produto_id
        JOIN produto_variacoes v ON v.id = pi.variacao_id
        WHERE pi.pedido_id IN (${placeholders})
        ORDER BY pi.pedido_id DESC
      `,
      pedidoIds,
    );

    const mapa = new Map();
    for (const p of pedidos) {
      mapa.set(p.id, []);
    }

    for (const item of itensRows) {
      const arr = mapa.get(item.pedido_id);
      if (arr) arr.push(item);
    }

    for (const pedido of pedidos) {
      pedido.itens = mapa.get(pedido.id) || [];
    }

    if (!pagination.hasPagination) return res.json(pedidos);

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM pedidos p${whereSql}`,
      whereParams,
    );
    return res.json({
      data: pedidos,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: Number(countRows[0].total),
        totalPages: Math.ceil(Number(countRows[0].total) / pagination.limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar pedidos' });
  }
});

/*
=========================
DETALHES ADMINISTRATIVOS DO PEDIDO
=========================
*/

router.get('/:id/detalhes', verificarToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const pedidoId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({ erro: 'Pedido inválido' });
    }

    const [pedidos] = await db.query(
      `
        SELECT
          p.id,
          p.usuario_id,
          p.total,
          p.status,
          p.pagamento,
          p.created_at,
          p.expires_at,
          p.pagamento_confirmado_em,
          p.pagamento_atualizado_em,
          p.mp_payment_id,
          p.mp_status,
          p.mp_status_detail,
          p.reconciliacao_status,
          p.reconciliacao_motivo,
          p.reconciliacao_em,
          p.reconciliacao_resolvida_em,
          p.reconciliacao_resolvida_por,
          u.nome AS usuario_nome,
          u.email AS usuario_email,
          u.celular AS usuario_celular,
          u.rua AS endereco_rua,
          u.numero AS endereco_numero,
          u.bairro AS endereco_bairro,
          u.cidade AS endereco_cidade,
          u.estado AS endereco_estado,
          u.cep AS endereco_cep
        FROM pedidos p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = ?
      `,
      [pedidoId],
    );

    if (!pedidos.length) {
      return res.status(404).json({ erro: 'Pedido não encontrado' });
    }

    const pedido = pedidos[0];
    const [itens] = await db.query(
      `
        SELECT
          pi.produto_id,
          pi.variacao_id,
          pi.quantidade,
          pi.preco,
          pr.nome,
          v.tamanho,
          v.cor,
          img.url AS imagem_principal
        FROM pedido_itens pi
        JOIN produtos pr ON pr.id = pi.produto_id
        LEFT JOIN produto_variacoes v ON v.id = pi.variacao_id
        LEFT JOIN produto_imagens img ON img.id = (
          SELECT MIN(imagem.id)
          FROM produto_imagens imagem
          WHERE imagem.produto_id = pr.id
            AND imagem.is_principal = 1
        )
        WHERE pi.pedido_id = ?
        ORDER BY pi.id ASC
      `,
      [pedidoId],
    );

    return res.json({ ...pedido, itens });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao buscar detalhes do pedido' });
  }
});

/*
=========================
RESOLVER RECONCILIAÇÃO ADMINISTRATIVA
=========================
*/

router.put('/:id/reconciliacao', verificarToken, async (req, res) => {
  let connection;

  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Ação não permitida' });
    }

    const pedidoId = Number.parseInt(req.params.id, 10);
    const resolucao = String(req.body?.resolucao || '').trim().toLowerCase();
    const observacao = String(req.body?.observacao || '').trim().slice(0, 255);
    const resolucoesPermitidas = ['resolvida_estorno', 'resolvida_atendimento'];

    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
      return res.status(400).json({ erro: 'Pedido inválido' });
    }
    if (!resolucoesPermitidas.includes(resolucao)) {
      return res.status(400).json({ erro: 'Resolução de reconciliação inválida' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [pedidos] = await connection.query(
      `SELECT id, reconciliacao_status FROM pedidos WHERE id = ? FOR UPDATE`,
      [pedidoId],
    );

    if (!pedidos.length) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Pedido não encontrado' });
    }
    if (pedidos[0].reconciliacao_status !== 'pendente') {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido não possui reconciliação pendente' });
    }

    const [updateResult] = await connection.query(
      `UPDATE pedidos
       SET reconciliacao_status = ?,
           reconciliacao_motivo = CASE WHEN ? <> '' THEN ? ELSE reconciliacao_motivo END,
           reconciliacao_resolvida_em = NOW(),
           reconciliacao_resolvida_por = ?
       WHERE id = ? AND reconciliacao_status = 'pendente'`,
      [resolucao, observacao, observacao, req.user.id, pedidoId],
    );

    if (!updateResult.affectedRows) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Reconciliação atualizada por outra operação' });
    }

    await connection.commit();
    return res.json({ ok: true, reconciliacao_status: resolucao });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // noop
      }
    }
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao resolver reconciliação' });
  } finally {
    if (connection) connection.release();
  }
});

/*
=========================
ALTERAR STATUS
=========================
*/

router.put('/:id/status', verificarToken, async (req, res) => {
  let connection;

  try {
    const novoStatus = normalizeStatus(req.body?.status);

    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Ação não permitida' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, status, expires_at, pagamento FROM pedidos WHERE id=? FOR UPDATE`,
      [req.params.id],
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({
        erro: 'Pedido não encontrado',
      });
    }

    const pedido = rows[0];
    const currentStatus = normalizeStatus(pedido.status);

    const validation = validarTransicaoStatus({
      user: req.user,
      currentStatus,
      novoStatus,
      expiresAt: pedido.expires_at,
    });

    if (!validation.allowed) {
      await connection.rollback();
      return res.status(validation.statusCode).json({
        erro: validation.message,
        atual: validation.atual,
        novo: validation.novo,
      });
    }

    // A confirmação somente muda o status: o estoque já foi reservado no checkout.
    // A trava impede que a rotina de expiração devolva o estoque em paralelo.
    const [updateResult] = await connection.query(
      `UPDATE pedidos SET status=? WHERE id=? AND status=?`,
      [validation.novo, req.params.id, validation.atual],
    );

    if (!updateResult.affectedRows) {
      await connection.rollback();
      return res.status(409).json({ erro: 'Pedido atualizado por outra operação' });
    }

    await connection.commit();

    res.json({ ok: true });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // noop
      }
    }
    console.error(err);

    res.status(500).json({
      erro: 'Erro status',
    });
  } finally {
    if (connection) connection.release();
  }
});
/*
=========================
EXPIRAR PEDIDOS
=========================
*/

let rodando = false;

async function expirarPedidosPendentes() {
  if (rodando) return;

  rodando = true;

  let connection;

  try {
    connection = await db.getConnection();

    const [pedidos] = await connection.query(
      `
SELECT id
FROM pedidos
WHERE status='pendente'
AND expires_at <= NOW()
AND pagamento='mercado_pago'
AND (mp_status IS NULL OR LOWER(mp_status) <> 'approved')
AND pagamento_confirmado_em IS NULL

`,
    );

    for (const pedido of pedidos) {
      await connection.beginTransaction();

      try {
        // Proteção contra processamento duplicado:
        // 1) trava o pedido pendente na mesma transação
        // 2) garante que só devolve estoque se ainda estiver pendente
        // (evita devolução dupla em cenários de concorrência/retry)
        const [pedidoLocked] = await connection.query(
          `
          SELECT id
          FROM pedidos
          WHERE id = ?
            AND status = 'pendente'
            AND expires_at <= NOW()
            AND pagamento = 'mercado_pago'
            AND (mp_status IS NULL OR LOWER(mp_status) <> 'approved')
            AND pagamento_confirmado_em IS NULL
          FOR UPDATE
          `,
          [pedido.id],
        );

        if (!pedidoLocked.length) {
          await connection.rollback();
          continue;
        }

        const [pedidoExpirado] = await connection.query(
          `
UPDATE pedidos
SET status='expirado'
WHERE id=?
AND status='pendente'
AND expires_at <= NOW()
AND pagamento='mercado_pago'
AND (mp_status IS NULL OR LOWER(mp_status) <> 'approved')
AND pagamento_confirmado_em IS NULL

`,
          [pedido.id],
        );

        if (pedidoExpirado.affectedRows !== 1) {
          await connection.rollback();
          continue;
        }

        const [itens] = await connection.query(
          `
SELECT
variacao_id,
quantidade

FROM pedido_itens

WHERE pedido_id=?

`,
          [pedido.id],
        );

        for (const item of itens) {
          await connection.query(
            `
UPDATE produto_variacoes

SET estoque = estoque + ?

WHERE id=?

`,

            [item.quantidade, item.variacao_id],
          );
        }

        await connection.commit();
      } catch (errPedido) {
        await connection.rollback();
        throw errPedido;
      }
    }
  } catch (err) {
    console.error('EXPIRACAO:', err.message);

    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // noop
      }
    }
  } finally {
    if (connection) connection.release();
    rodando = false;
  }
}

startOrderScheduler(
  expirarPedidosPendentes,
  (process.argv.includes('--test') || process.env.NODE_TEST_CONTEXT)
    ? { ...process.env, NODE_ENV: 'test' }
    : process.env,
);

export {
  expirarPedidosPendentes,
  prazoReservaMinutos,
  PRAZO_RESERVA_MERCADO_PAGO_MINUTOS,
};
export default router;
