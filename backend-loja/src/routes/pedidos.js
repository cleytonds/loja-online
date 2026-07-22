import express from 'express';
import db from '../config/database.js';
import uploadComprovante from '../middlewares/uploadComprovante.js';
import path from 'path';

import { verificarToken } from '../middlewares/auth.js';

const router = express.Router();

const PIX_KEY = process.env.PIX_KEY;

function isAdminUser(req) {
  return req.user?.tipo === 'admin';
}

function getPagination(query) {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return { hasPagination, page, limit, offset: (page - 1) * limit };
}

function requirePixKey(req, res) {
  if (!PIX_KEY) {
    return res.status(500).json({ erro: 'PIX_KEY não configurado no servidor' });
  }
  return null;
}

/*
=========================
CRIAR PEDIDO
=========================
*/
router.post('/', verificarToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const usuario_id = req.user.id;

    const { itens, pagamento } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        erro: 'Carrinho vazio',
      });
    }

    await connection.beginTransaction();

    let total = 0;

    // valida estoque com bloqueio da linha
    for (const item of itens) {
      const [rows] = await connection.query(
        `
        SELECT estoque
        FROM produto_variacoes
        WHERE id=?
        FOR UPDATE
        `,
        [item.variacao_id],
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

      total += Number(item.preco) * Number(item.quantidade);
    }

    // cria pedido
    const [pedido] = await connection.query(
      `
      INSERT INTO pedidos
      (
      usuario_id,
      total,
      status,
      pagamento,
      created_at,
      expires_at
      )

      VALUES
      (
      ?,
      ?,
      'pendente',
      ?,
      NOW(),
      DATE_ADD(NOW(), INTERVAL 10 MINUTE)
      )
      `,
      [usuario_id, total, pagamento || 'pix'],
    );

    const pedido_id = pedido.insertId;

    // salva itens + reserva estoque
    for (const item of itens) {
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

      await connection.query(
        `
        UPDATE produto_variacoes
        SET estoque = estoque - ?
        WHERE id=?
        `,
        [item.quantidade, item.variacao_id],
      );
    }

    // confirma tudo
    await connection.commit();

    res.json({
      pedido_id,
      total,
      pix_key: PIX_KEY,
    });
  } catch (err) {
    await connection.rollback();

    console.error('ERRO PEDIDO:', err);

    res.status(500).json({
      erro: 'Erro ao criar pedido',
    });
  } finally {
    connection.release();
  }
});

/*
=========================
MEUS PEDIDOS
=========================
*/

router.get('/meus', verificarToken, async (req, res) => {
  try {
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
      ORDER BY p.id DESC
    `,
      [req.user.id],
    );

    for (const pedido of pedidos) {
      const [itens] = await db.query(
        `
        SELECT 
          pi.produto_id,
          pi.quantidade,
          pi.preco,
          pr.nome,
          v.tamanho,
          v.cor
        FROM pedido_itens pi
        JOIN produtos pr ON pr.id = pi.produto_id
        JOIN produto_variacoes v ON v.id = pi.variacao_id
        WHERE pi.pedido_id = ?
      `,
        [pedido.id],
      );

      pedido.itens = itens;
    }

    res.json(pedidos);
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
      atuais: ['pendente', 'aguardando_confirmacao', 'pago', 'enviado'],
      historico: ['entregue', 'cancelado', 'expirado'],
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
        p.created_at,
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
      ORDER BY p.created_at DESC, p.id DESC${paginationSql}
    `, queryParams);

    if (pedidos.length === 0) {
      if (!pagination.hasPagination) return res.json([]);

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

    const pedidoIds = pedidos.map((pedido) => pedido.id);
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
        LEFT JOIN produtos pr ON pr.id = pi.produto_id
        LEFT JOIN produto_variacoes v ON v.id = pi.variacao_id
        WHERE pi.pedido_id IN (${placeholders})
        ORDER BY pi.pedido_id DESC, pi.id ASC
      `,
      pedidoIds,
    );

    const itensPorPedido = new Map(pedidos.map((pedido) => [pedido.id, []]));
    for (const item of itensRows) {
      itensPorPedido.get(item.pedido_id)?.push(item);
    }

    for (const pedido of pedidos) {
      pedido.itens = itensPorPedido.get(pedido.id) || [];
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
        LEFT JOIN produtos pr ON pr.id = pi.produto_id
        LEFT JOIN produto_variacoes v ON v.id = pi.variacao_id
        LEFT JOIN produto_imagens img ON img.id = (
          SELECT MIN(imagem.id)
          FROM produto_imagens imagem
          WHERE imagem.produto_id = pi.produto_id
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
ALTERAR STATUS
=========================
*/

router.put('/:id/status', verificarToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ erro: 'Ação não permitida' });
    }

    const novoStatus = String(req.body.status || '').toLowerCase();

    //  bloqueia alteração para pago por não-admin
    if (novoStatus === 'pago' && req.user?.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Ação não permitida' });
    }

    const [rows] = await db.query(`SELECT id, status, expires_at FROM pedidos WHERE id=?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({
        erro: 'Pedido não encontrado',
      });
    }

    const pedido = rows[0];
    const currentStatus = String(pedido.status).toLowerCase();

    //  BLOQUEIO ABSOLUTO DE EXPIRADO
    if (currentStatus === 'expirado') {
      return res.status(403).json({
        erro: 'Pedido expirado não pode ser alterado',
      });
    }

    const statusExpiraveis = ['pendente', 'aguardando_pagamento'];
    const expiradoPorPrazo = pedido.expires_at && new Date(pedido.expires_at).getTime() <= Date.now();

    if (statusExpiraveis.includes(currentStatus) && expiradoPorPrazo) {
      return res.status(403).json({
        erro: 'Pedido expirado não pode ser alterado',
      });
    }

    const allowed = {
      pendente: ['pago', 'cancelado'],
      pago: ['enviado'],
      enviado: ['entregue'],
      entregue: [],
      cancelado: [],
      expirado: [],
    };

    if (novoStatus === currentStatus) {
      return res.status(400).json({
        erro: 'Transição de status não permitida',
        atual: currentStatus,
        novo: novoStatus,
      });
    }

    //  valida transição
    const allowedNext = allowed[currentStatus] || [];

    if (!allowedNext.includes(novoStatus)) {
      return res.status(400).json({
        erro: 'Transição de status não permitida',
      });
    }

    await db.query(`UPDATE pedidos SET status=? WHERE id=?`, [novoStatus, req.params.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      erro: 'Erro status',
    });
  }
});
/*
=========================
EXPIRAR PEDIDOS
=========================
*/

let rodando = false;

setInterval(async () => {
  if (rodando) return;

  rodando = true;

  try {
    const [pedidos] = await db.query(
      `
SELECT id
FROM pedidos
WHERE status='pendente'
AND expires_at < NOW()

`,
    );

    for (const pedido of pedidos) {
      const [itens] = await db.query(
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
        await db.query(
          `
UPDATE produto_variacoes

SET estoque = estoque + ?

WHERE id=?

`,

          [item.quantidade, item.variacao_id],
        );
      }

      await db.query(
        `
UPDATE pedidos
SET status='expirado'
WHERE id=?
AND status='pendente'

`,
        [pedido.id],
      );
    }
  } catch (err) {
    console.error('EXPIRACAO:', err.message);
  } finally {
    rodando = false;
  }
}, 60000);

// =====================================================
// PIX FLOW (dados do pagamento + upload do comprovante)
// =====================================================

const WHATSAPP_NUMERO = process.env.WHATSAPP_NUMERO || '81993563122';

function padStatus(status) {
  return String(status).trim().toLowerCase();
}

router.get('/:id/pix', verificarToken, async (req, res) => {
  try {
    requirePixKey(req, res);
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
      pix_key: PIX_KEY,
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
  uploadComprovante.single('comprovante'),
  async (req, res) => {
    try {
      requirePixKey(req, res);
      if (res.headersSent) return;

      const pedidoId = req.params.id;
      const usuarioId = req.user.id;

      const pedidoRows = await db.query(
        `
        SELECT id, usuario_id, total, status, expires_at
        FROM pedidos
        WHERE id = ?
        `,
        [pedidoId],
      );

      const pedido = pedidoRows[0][0];

      if (!pedido) {
        return res.status(404).json({ erro: 'Pedido não encontrado' });
      }

      if (String(pedido.usuario_id) !== String(usuarioId)) {
        return res.status(403).json({ erro: 'Acesso negado' });
      }

      const statusAtual = padStatus(pedido.status);

      if (statusAtual !== 'pendente') {
        return res.status(400).json({ erro: 'Pedido não está pendente' });
      }

      if (new Date(pedido.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ erro: 'Pedido expirado' });
      }

      if (!req.file) {
        return res.status(400).json({ erro: 'Comprovante é obrigatório' });
      }

      // valida tipo: jpg/jpeg/png/webp
      const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      if (!allowedExt.includes(ext)) {
        return res.status(400).json({ erro: 'Tipo de arquivo inválido' });
      }

      const comprovantePath = `uploads/comprovantes/${req.file.filename}`;

      await db.query(
        `
        UPDATE pedidos
        SET comprovante = ?, status = 'aguardando_confirmacao'
        WHERE id = ?
        `,
        [comprovantePath, pedidoId],
      );

      // monta mensagem consultando banco
      const [itens] = await db.query(
        `
        SELECT
          pi.quantidade,
          pi.preco,
          pr.nome,
          v.tamanho,
          v.cor
        FROM pedido_itens pi
        JOIN produtos pr ON pr.id = pi.produto_id
        LEFT JOIN produto_variacoes v ON v.id = pi.variacao_id
        WHERE pi.pedido_id = ?
        `,
        [pedidoId],
      );

      const itensTexto = itens
        .map((i) => {
          const tamanho = i.tamanho || '';
          const cor = i.cor || '';
          return `• ${i.nome}\nP / ${tamanho} ${cor ? ` / ${cor}` : ''}\n\nQuantidade: ${i.quantidade}\nValor: R$${Number(i.preco * i.quantidade).toFixed(2)}`;
        })
        .join('\n\n');

      const mensagem =
        `🛍️ NOVO PEDIDO - DL MODAS\n\n` +
        `Pedido: #${pedidoId}\n\n` +
        `💰 Total:\nR$ ${Number(pedido.total).toFixed(2)}\n\n` +
        `📦 ITENS:\n\n${itensTexto}\n\n` +
        `💳 Pagamento:\nPIX\n\n` +
        `📄 O comprovante PIX será enviado nesta conversa.\n\n` +
        `⏳ Status:\nAguardando confirmação.`;

      res.json({ mensagem });
    } catch (err) {
      console.error('ERRO PIX POST COMP:', err);
      res.status(500).json({ erro: 'Erro ao enviar comprovante' });
    }
  },
);

export default router;
