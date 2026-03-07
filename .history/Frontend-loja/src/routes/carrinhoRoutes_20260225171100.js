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

// Adicionar produto ao carrinho
router.post("/carrinho", auth, (req, res) => {
  const { produto_id, quantidade } = req.body;
  const sql = "INSERT INTO carrinho (usuario_id, produto_id, quantidade) VALUES (?, ?, ?)";
  db.query(sql, [req.userId, produto_id, quantidade || 1], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao adicionar ao carrinho" });
    res.json({ message: "Produto adicionado ao carrinho" });
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

export default router;