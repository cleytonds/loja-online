import express from "express";
import db from "../config/database.js";
import { verificarToken } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = express.Router();

// 🔓 LISTAR PRODUTOS (LIBERADO)
router.get("/", (req, res) => {
  const { nome, categoria } = req.query;

  let sql = `
    SELECT p.*, c.nome AS categoria_nome
    FROM produtos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.ativo = 1
  `;

  let params = [];

  if (nome) {
    sql += " AND p.nome LIKE ?";
    params.push(`%${nome}%`);
  }

  if (categoria && categoria != 0) {
    sql += " AND p.categoria_id = ?";
    params.push(categoria);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Erro ao buscar produtos:", err);
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }

    res.json(results);
  });
});


// 🔒 CRIAR PRODUTO (SÓ ADMIN)
router.post("/", verificarToken, isAdmin, async (req, res) => {
  const { nome, preco, descricao, categoria_id } = req.body;

  try {
    await db.promise().query(
      "INSERT INTO produtos (nome, preco, descricao, categoria_id, ativo) VALUES (?, ?, ?, ?, 1)",
      [nome, preco, descricao, categoria_id]
    );

    res.json({ mensagem: "Produto criado com sucesso" });

  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});


// 🔒 DELETAR PRODUTO (SÓ ADMIN)
router.delete("/:id", verificarToken, isAdmin, async (req, res) => {
  try {
    await db.promise().query(
      "DELETE FROM produtos WHERE id = ?",
      [req.params.id]
    );

    res.json({ mensagem: "Produto removido com sucesso" });

  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});


// 🔒 ATUALIZAR PRODUTO (SÓ ADMIN)
router.put("/:id", verificarToken, isAdmin, async (req, res) => {
  const { nome, preco, descricao } = req.body;

  try {
    await db.promise().query(
      "UPDATE produtos SET nome = ?, preco = ?, descricao = ? WHERE id = ?",
      [nome, preco, descricao, req.params.id]
    );

    res.json({ mensagem: "Produto atualizado com sucesso" });

  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

export default router;