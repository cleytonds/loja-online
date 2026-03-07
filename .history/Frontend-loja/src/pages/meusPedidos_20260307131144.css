import express from "express";
import db from "../config/database.js";

const router = express.Router();

/* CRIAR PEDIDO */
router.post("/", (req, res) => {

  const { itens, usuario_id } = req.body;

  if (!itens || itens.length === 0) {
    return res.status(400).json({ erro: "Carrinho vazio" });
  }

  let total = 0;

  itens.forEach(item => {
    total += item.preco * item.quantidade;
  });

  const sqlPedido = `
    INSERT INTO pedidos (usuario_id, total, status, criado_em)
    VALUES (?, ?, 'pendente', NOW())
  `;

  db.query(sqlPedido, [usuario_id, total], (err, result) => {

    if (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro ao criar pedido" });
    }

    const pedido_id = result.insertId;

    const itensSql = `
      INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco)
      VALUES ?
    `;

    const valores = itens.map(item => [
      pedido_id,
      item.id,
      item.quantidade,
      item.preco
    ]);

    db.query(itensSql, [valores], (err2) => {

      if (err2) {
        console.error(err2);
        return res.status(500).json({ erro: "Erro ao salvar itens" });
      }

      res.json({
        mensagem: "Pedido criado com sucesso",
        pedido_id
      });

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

    if (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro ao buscar pedidos" });
    }

    res.json(result);

  });

});

export default router;