import express from "express";
import db from "../config/database.js";

const router = express.Router();

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

export default router;