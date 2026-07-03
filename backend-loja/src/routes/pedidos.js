import express from 'express';
import db from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const PIX_KEY = 'dayaneferreiral1905@gmail.com';

/*
=========================
AUTH
=========================
*/
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      erro: 'Token ausente',
    });
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);

    next();
  } catch {
    return res.status(401).json({
      erro: 'Token inválido',
    });
  }
}

/*
=========================
CRIAR PEDIDO
=========================
*/
router.post('/', auth, async (req, res) => {
  try {
    const usuario_id = req.user.id;

    const { itens, pagamento } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        erro: 'Carrinho vazio',
      });
    }

    let total = 0;

    // valida estoque antes
    for (const item of itens) {
      const [rows] = await db.query(
        `
 SELECT estoque
 FROM produto_variacoes
 WHERE id=?
 `,
        [item.variacao_id],
      );

      if (!rows.length) {
        return res.status(400).json({
          erro: 'Variação não encontrada',
        });
      }

      if (rows[0].estoque < item.quantidade) {
        return res.status(400).json({
          erro: 'Estoque insuficiente',
        });
      }

      total += Number(item.preco) * Number(item.quantidade);
    }

    // cria pedido

    const [pedido] = await db.query(
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
      await db.query(
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

      await db.query(
        `
    UPDATE produto_variacoes
    SET estoque = estoque - ?
    WHERE id=?
    `,
        [item.quantidade, item.variacao_id],
      );
    }

    // RESPONDE PEDIDO

    res.json({
      pedido_id,
      total,
      pix_key: PIX_KEY,
    });
  } catch (err) {
    console.error('ERRO PEDIDO:', err);

    res.status(500).json({
      erro: 'Erro ao criar pedido',
    });
  }
});

/*
=========================
MEUS PEDIDOS
=========================
*/

router.get('/meus', auth, async (req, res) => {
  try {
    const [pedidos] = await db.query(
      `
      SELECT 
        p.id,
        p.total,
        p.status,
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

router.get('/', auth, async (req, res) => {
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

    for (const pedido of pedidos) {
      const [itens] = await db.query(
        `
        SELECT 
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
        WHERE pi.pedido_id = ?
      `,
        [pedido.id],
      );

      pedido.itens = itens;
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

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const [pedido] = await db.query(`SELECT * FROM pedidos WHERE id=?`, [req.params.id]);

    if (!pedido.length) {
      return res.status(404).json({
        erro: 'Pedido não encontrado',
      });
    }

    await db.query(
      `
      UPDATE pedidos
      SET status=?
      WHERE id=?
      `,
      [status, req.params.id],
    );

    res.json({
      ok: true,
    });
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

export default router;
