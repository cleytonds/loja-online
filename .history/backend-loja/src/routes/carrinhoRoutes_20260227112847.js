// carrinhoRoutes.js
import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = "segredo123";

// Middleware para verificar token
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Não autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
}

// Adicionar produto ao carrinho e diminuir estoque
// Adicionar produto ao carrinho
    router.post("/carrinho", auth, (req, res) => {

    console.log("USER ID:", req.userId);
    console.log("BODY:", req.body);

    const { produto_id, quantidade } = req.body;

  // Primeiro, verifica se tem estoque
  const sqlProduto = "SELECT quantidade FROM produtos WHERE id = ?";
  db.query(sqlProduto, [produto_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao verificar produto" });
    if (results.length === 0) return res.status(404).json({ error: "Produto não encontrado" });

    if (results[0].quantidade < quantidade) {
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    // Inserir no carrinho
    const sqlCarrinho = "INSERT INTO carrinho (usuario_id, produto_id, quantidade) VALUES (?, ?, ?)";
    db.query(sqlCarrinho, [req.userId, produto_id, quantidade], (err2, result2) => {
      if (err2) return res.status(500).json({ error: "Erro ao adicionar ao carrinho" });

      // Atualiza estoque do produto
      const sqlAtualiza = "UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?";
      db.query(sqlAtualiza, [quantidade, produto_id], (err3) => {
        if (err3) return res.status(500).json({ error: "Erro ao atualizar estoque" });

        res.json({ message: "Produto adicionado ao carrinho ✅" });
      });
    });
  });
});

// Listar carrinho do usuário
router.get("/carrinho", auth, (req, res) => {
  const sql = `
    SELECT c.id, p.nome, p.preco, c.quantidade 
    FROM carrinho c
    JOIN produtos p ON c.produto_id = p.id
    WHERE c.usuario_id = ?
  `;
  db.query(sql, [req.userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar carrinho" });
    res.json(results);
  });
});

// Remover item do carrinho
router.delete("/carrinho/:id", auth, (req, res) => {
  const carrinhoId = req.params.id;

  // Recupera produto e quantidade antes de remover para atualizar estoque
  const sqlRecupera = "SELECT produto_id, quantidade FROM carrinho WHERE id = ? AND usuario_id = ?";
  db.query(sqlRecupera, [carrinhoId, req.userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao recuperar item" });
    if (results.length === 0) return res.status(404).json({ error: "Item não encontrado" });

    const { produto_id, quantidade } = results[0];

    // Remove do carrinho
    const sqlRemove = "DELETE FROM carrinho WHERE id = ? AND usuario_id = ?";
    db.query(sqlRemove, [carrinhoId, req.userId], (err2) => {
      if (err2) return res.status(500).json({ error: "Erro ao remover item" });

      // Repor estoque
      const sqlAtualiza = "UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?";
      db.query(sqlAtualiza, [quantidade, produto_id], (err3) => {
        if (err3) return res.status(500).json({ error: "Erro ao atualizar estoque" });

        res.json({ message: "Item removido do carrinho ✅" });
      });
    });
  });
});

export default router;