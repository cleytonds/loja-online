import express from 'express';
import db from '../config/database.js';
import uploadComprovante from '../middlewares/uploadComprovante.js';
import path from 'path';

import { verificarToken } from '../middlewares/auth.js';

const router = express.Router();

const PIX_KEY = process.env.PIX_KEY;

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
  const allowedPagamentos = ['pix', 'whatsapp'];
  const { itens, pagamento } = req.body;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Carrinho vazio' });
  }

  if (!allowedPagamentos.includes(pagamento || 'pix')) {
    return res.status(400).json({ erro: 'Pagamento inválido' });
  }

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

    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length === 0) {
      return res.json(pedidos);
    }

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
      JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.id DESC
    `);

    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length === 0) {
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

    res.json(pedidos);
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
  try {
    const novoStatus = String(req.body.status || '').toLowerCase();

    //  bloqueia alteração para pago por não-admin
    if (novoStatus === 'pago' && req.user?.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Ação não permitida' });
    }

    const [rows] = await db.query(`SELECT id, status FROM pedidos WHERE id=?`, [req.params.id]);

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
