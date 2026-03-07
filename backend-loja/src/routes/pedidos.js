import express from "express";
import db from "../config/database.js";

const router = express.Router();

/* CRIAR PEDIDO */
router.post("/", (req, res) => {
  const { itens, usuario_id } = req.body;
  if (!itens || itens.length === 0) return res.status(400).json({ erro: "Carrinho vazio" });

  const total = itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);

  const sqlPedido = `INSERT INTO pedidos (usuario_id, total, status, criado_em) VALUES (?, ?, 'pendente', NOW())`;

  db.query(sqlPedido, [usuario_id, total], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao criar pedido" });

    const pedido_id = result.insertId;
    const valores = itens.map(item => [pedido_id, item.id, item.quantidade, item.preco]);
    const sqlItens = `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco) VALUES ?`;

    db.query(sqlItens, [valores], (err2) => {
      if (err2) return res.status(500).json({ erro: "Erro ao salvar itens" });
      res.json({ mensagem: "Pedido criado com sucesso", pedido_id });
    });
  });
});

/* LISTAR PEDIDOS DO USUÁRIO */
router.get("/meus/:usuario_id", (req, res) => {
  const { usuario_id } = req.params;
  const sql = `
    SELECT 
      p.id AS pedido_id,
      p.total,
      p.status,
      p.criado_em,
      pi.quantidade,
      pr.nome,
      pr.preco
    FROM pedidos p
    JOIN pedido_itens pi ON p.id = pi.pedido_id
    JOIN produtos pr ON pr.id = pi.produto_id
    WHERE p.usuario_id = ?
    ORDER BY p.id DESC
  `;
  db.query(sql, [usuario_id], (err, result) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar pedidos" });
    res.json(result);
  });
});

/* CANCELAR PEDIDO */
router.put("/cancelar/:pedido_id", (req, res) => {
  const { pedido_id } = req.params;
  db.query(`UPDATE pedidos SET status='cancelado' WHERE id=?`, [pedido_id], (err) => {
    if (err) return res.status(500).json({ erro: "Erro ao cancelar pedido" });
    res.json({ mensagem: `Pedido #${pedido_id} cancelado com sucesso` });
  });
});

/* REPETIR PEDIDO */
router.post("/repetir/:pedido_id", (req, res) => {
  const { pedido_id } = req.params;

  const sqlItens = `
    SELECT pi.produto_id, pi.quantidade, pi.preco, p.usuario_id
    FROM pedido_itens pi
    JOIN pedidos p ON p.id = pi.pedido_id
    WHERE p.id = ?
  `;

  db.query(sqlItens, [pedido_id], (err, itens) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar itens do pedido" });
    if (!itens.length) return res.status(404).json({ erro: "Pedido não encontrado" });

    const usuario_id = itens[0].usuario_id;
    const total = itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);

    db.query(`INSERT INTO pedidos (usuario_id, total, status, criado_em) VALUES (?, ?, 'pendente', NOW())`, [usuario_id, total], (err2, result) => {
      if (err2) return res.status(500).json({ erro: "Erro ao criar novo pedido" });

      const novoPedidoId = result.insertId;
      const valores = itens.map(item => [novoPedidoId, item.produto_id, item.quantidade, item.preco]);
      db.query(`INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco) VALUES ?`, [valores], (err3) => {
        if (err3) return res.status(500).json({ erro: "Erro ao salvar itens do novo pedido" });
        res.json({ mensagem: `Pedido #${novoPedidoId} criado com sucesso` });
      });
    });
  });
});

export default router;