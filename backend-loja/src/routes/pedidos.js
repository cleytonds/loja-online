import express from 'express';
import db from '../config/database.js';
import uploadComprovante, {
  removerComprovante,
  validarImagemComprovante,
} from '../middlewares/uploadComprovante.js';
import path from 'path';

import { verificarToken } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import {
  exigeComprovanteParaConfirmacao,
  isAdminUser,
  normalizeStatus,
  validarTransicaoStatus,
} from './pedidosSecurity.js';
import { buildPixConfig } from '../utils/pixConfig.js';
import { buildVendasSeries } from '../utils/adminDashboard.js';
import { isDuplicateKeyError, normalizeIdempotencyKey } from '../utils/idempotency.js';
import { startOrderScheduler } from '../utils/orderScheduler.js';

const router = express.Router();

function getPagination(query) {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return { hasPagination, page, limit, offset: (page - 1) * limit };
}

const pixConfig = buildPixConfig(process.env);

function requirePixKey(req, res) {
  if (!pixConfig.pix_key) {
    return res.status(500).json({ erro: 'PIX_KEY não configurado no servidor' });
  }
  return null;
}

function requireWhatsAppNumber(req, res) {
  if (!pixConfig.whatsapp_number) {
    console.error('WHATSAPP_NUMERO ausente ou inválido na configuração do servidor');
    return res.status(500).json({ erro: 'WHATSAPP_NUMERO não configurado no servidor' });
  }
  return null;
}

/*
=========================
CRIAR PEDIDO
=========================
*/
router.post('/', verificarToken, async (req, res) => {
  const allowedPagamentos = ['pix', 'whatsapp'];
  const { itens, pagamento } = req.body;
  const idempotencyKey = normalizeIdempotencyKey(req.get('X-Idempotency-Key'));

  if (!idempotencyKey) {
    return res.status(400).json({ erro: 'X-Idempotency-Key inválida ou ausente' });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Carrinho vazio' });
  }

  if (!allowedPagamentos.includes(pagamento || 'pix')) {
    return res.status(400).json({ erro: 'Pagamento inválido' });
  }

  // O frontend informa apenas identificação e quantidade. Preço é obtido do banco.
  // Agrupar antes de reservar impede que a mesma variação gere estoque negativo.
  if (requireWhatsAppNumber(req, res)) return;

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
        pix_key: pixConfig.pix_key,
        whatsapp_number: pixConfig.whatsapp_number,
      });
    }

    const { itens, pagamento } = req.body;

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
      DATE_ADD(NOW(), INTERVAL 10 MINUTE)
      )
      `,
        [usuario_id, total, pagamento || 'pix', idempotencyKey],
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
          pix_key: pixConfig.pix_key,
          whatsapp_number: pixConfig.whatsapp_number,
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
      pix_key: pixConfig.pix_key,
      whatsapp_number: pixConfig.whatsapp_number,
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
        p.created_at
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

    // preserva ordem de itens já retornada pelo JOIN (ORDER BY pi.pedido_id)
    for (const pedido of pedidos) {
      pedido.itens = mapa.get(pedido.id) || [];
      pedido.whatsapp_number = pixConfig.whatsapp_number;
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
      atuais: ['pendente', 'aguardando_confirmacao'],
      historico: ['pago', 'enviado', 'entregue', 'cancelado', 'expirado'],
    };

    if (tipo && !statusPorTipo[tipo]) {
      return res.status(400).json({ erro: 'Tipo de pedidos inválido' });
    }

    const statusFiltro = statusPorTipo[tipo] || null;
    const whereSql = statusFiltro ? ` WHERE p.status IN (${statusFiltro.map(() => '?').join(',')})` : '';
    const pagination = getPagination(req.query);
    const paginationSql = pagination.hasPagination ? ' LIMIT ? OFFSET ?' : '';
    const queryParams = [
      ...(statusFiltro || []),
      ...(pagination.hasPagination ? [pagination.limit, pagination.offset] : []),
    ];

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
        p.created_at
      FROM pedidos p
      JOIN usuarios u ON u.id = p.usuario_id${whereSql}
      ORDER BY p.created_at DESC, p.id DESC${paginationSql}
    `, queryParams);

    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length === 0) {
      if (pagination.hasPagination) {
        const [countRows] = await db.query(
          `SELECT COUNT(*) AS total FROM pedidos p${whereSql}`,
          statusFiltro || [],
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
      statusFiltro || [],
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
      `SELECT id, status, expires_at, comprovante FROM pedidos WHERE id=? FOR UPDATE`,
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

    if (exigeComprovanteParaConfirmacao(validation) && !pedido.comprovante) {
      await connection.rollback();
      return res.status(400).json({
        erro: 'Aprovação PIX exige um comprovante enviado',
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
AND expires_at < NOW()

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
          FOR UPDATE
          `,
          [pedido.id],
        );

        if (!pedidoLocked.length) {
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

        await connection.query(
          `
UPDATE pedidos
SET status='expirado'
WHERE id=?
AND status='pendente'

`,
          [pedido.id],
        );

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

startOrderScheduler(expirarPedidosPendentes);

// =====================================================
// PIX FLOW (dados do pagamento + upload do comprovante)
// =====================================================

function padStatus(status) {
  return String(status).trim().toLowerCase();
}

async function validarPedidoParaComprovante(req, res, next) {
  try {
    const [rows] = await db.query(
      `
      SELECT usuario_id, status, expires_at, comprovante
      FROM pedidos
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (!rows.length) return res.status(404).json({ erro: 'Pedido nÃ£o encontrado' });

    const pedido = rows[0];

    if (String(pedido.usuario_id) !== String(req.user.id)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    if (padStatus(pedido.status) !== 'pendente') {
      return res.status(400).json({ erro: 'Pedido nÃ£o estÃ¡ pendente' });
    }

    if (new Date(pedido.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ erro: 'Pedido expirado' });
    }

    if (pedido.comprovante) {
      return res.status(400).json({ erro: 'Comprovante jÃ¡ enviado' });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

router.get('/:id/pix', verificarToken, async (req, res) => {
  try {
    requirePixKey(req, res);
    if (res.headersSent) return;
    requireWhatsAppNumber(req, res);
    if (res.headersSent) return;

    const pedidoId = req.params.id;
    const usuarioId = req.user.id;

    const [rows] = await db.query(
      `
  SELECT id, usuario_id, total, status, expires_at
  FROM pedidos
  WHERE id = ? AND usuario_id = ?
  `,
      [pedidoId, usuarioId],
    );

    if (!rows.length) {
      return res.status(404).json({
        erro: 'Pedido não encontrado',
      });
    }

    const pedido = rows[0];

    //  REGRA CRÍTICA: BLOQUEIA EXPIRADO
    if (pedido.status === 'expirado') {
      return res.status(400).json({
        erro: 'Pedido expirado. Não é possível pagar novamente.',
      });
    }

    //  segurança: usuário dono do pedido
    if (pedido.status !== 'pendente') {
      return res.status(400).json({
        erro: 'Somente pedidos pendentes podem ser pagos',
      });
    }

    const tempoRestanteMs = new Date(pedido.expires_at).getTime() - Date.now();

    const tempoRestante = Math.max(0, tempoRestanteMs);

    return res.json({
      pedido: Number(pedido.id),
      valor: Number(pedido.total),
      pix_key: pixConfig.pix_key,
      whatsapp_number: pixConfig.whatsapp_number,
      tempo_restante: tempoRestante,
      status: padStatus(pedido.status),
    });
  } catch (err) {
    console.error('ERRO PIX GET:', err);
    return res.status(500).json({ erro: 'Erro ao buscar dados PIX' });
  }
});

router.post(
  '/:id/pix/comprovante',
  verificarToken,
  validarPedidoParaComprovante,
  uploadComprovante.single('comprovante'),
  validarImagemComprovante,
  async (req, res) => {
    let connection;

    try {
      requirePixKey(req, res);
      if (res.headersSent) return;

      const pedidoId = req.params.id;
      const usuarioId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          erro: 'Comprovante é obrigatório',
        });
      }

      // Validação da extensão
      const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(req.file.originalname || '').toLowerCase();

      if (!allowedExt.includes(ext)) {
        return res.status(400).json({
          erro: 'Tipo de arquivo inválido',
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `
        SELECT
          id,
          usuario_id,
          total,
          status,
          expires_at,
          comprovante
        FROM pedidos
        WHERE id = ?
        FOR UPDATE
        `,
        [pedidoId],
      );

      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({
          erro: 'Pedido não encontrado',
        });
      }

      const pedido = rows[0];

      if (String(pedido.usuario_id) !== String(usuarioId)) {
        await connection.rollback();
        return res.status(403).json({
          erro: 'Acesso negado',
        });
      }

      if (padStatus(pedido.status) !== 'pendente') {
        await connection.rollback();
        return res.status(400).json({
          erro: 'Pedido não está pendente',
        });
      }

      if (new Date(pedido.expires_at).getTime() < Date.now()) {
        await connection.rollback();
        return res.status(400).json({
          erro: 'Pedido expirado',
        });
      }

      if (pedido.comprovante) {
        await connection.rollback();
        return res.status(400).json({
          erro: 'Comprovante já enviado',
        });
      }

      const comprovantePath = `uploads/comprovantes/${req.file.filename}`;

      const [updateResult] = await connection.query(
        `
        UPDATE pedidos
        SET
          comprovante = ?,
          status = 'aguardando_confirmacao'
        WHERE id = ?
          AND status = 'pendente'
        `,
        [comprovantePath, pedidoId],
      );

      if (!updateResult.affectedRows) {
        await connection.rollback();
        return res.status(400).json({
          erro: 'Não foi possível atualizar o pedido',
        });
      }

      const [itens] = await connection.query(
        `
        SELECT
          pi.quantidade,
          pi.preco,
          pr.nome,
          v.tamanho,
          v.cor
        FROM pedido_itens pi
        JOIN produtos pr
          ON pr.id = pi.produto_id
        LEFT JOIN produto_variacoes v
          ON v.id = pi.variacao_id
        WHERE pi.pedido_id = ?
        `,
        [pedidoId],
      );

      const itensTexto = itens
        .map((item) => {
          const tamanho = item.tamanho || '';
          const cor = item.cor || '';

          return `• ${item.nome}
${tamanho ? `Tamanho: ${tamanho}` : ''}
${cor ? `Cor: ${cor}` : ''}
Quantidade: ${item.quantidade}
Valor: R$ ${Number(item.preco * item.quantidade).toFixed(2)}`;
        })
        .join('\n\n');

      const mensagem =
        `🛍️ NOVO PEDIDO - DL MODAS\n\n` +
        `Pedido: #${pedidoId}\n\n` +
        `💰 Total: R$ ${Number(pedido.total).toFixed(2)}\n\n` +
        `📦 ITENS:\n\n${itensTexto}\n\n` +
        `💳 Pagamento: PIX\n\n` +
        `📄 O comprovante será enviado nesta conversa.\n\n` +
        `⏳ Status: Aguardando confirmação.`;

      await connection.commit();

      return res.json({
        mensagem,
      });
    } catch (err) {
      if (connection) {
        await connection.rollback();
      }

      if (req.file?.path) {
        removerComprovante(req.file);
      }

      console.error('ERRO PIX POST COMP:', err);

      return res.status(500).json({
        erro: 'Erro ao enviar comprovante',
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

/*
=========================
COMPROVANTE PIX (PRIVADO)
=========================
*/
router.get('/:id/comprovante', verificarToken, async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const usuarioId = req.user.id;
    const isAdminUser = req.user?.tipo === 'admin';

    const [rows] = await db.query(
      `
      SELECT id, usuario_id, comprovante
      FROM pedidos
      WHERE id = ?
      `,
      [pedidoId],
    );

    if (!rows.length) {
      return res.status(404).json({ erro: 'Pedido não encontrado' });
    }

    const pedido = rows[0];

    const podeAcessar = isAdminUser || String(pedido.usuario_id) === String(usuarioId);

    if (!podeAcessar) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    if (!pedido.comprovante) {
      return res.status(404).json({ erro: 'Comprovante não encontrado' });
    }

    const fileOnDisk = path.resolve(process.cwd(), pedido.comprovante);

    return res.sendFile(fileOnDisk);
  } catch (err) {
    console.error('ERRO GET COMPROVANTE:', err);
    return res.status(500).json({ erro: 'Erro ao buscar comprovante' });
  }
});

export default router;
