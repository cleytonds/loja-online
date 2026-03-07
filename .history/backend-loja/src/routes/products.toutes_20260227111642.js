// src/routes/products.routes.js
import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Rota para listar produtos
// Caminho final será: /produtos
router.get("/", (req, res) => {
  const sql = "SELECT * FROM produtos";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao buscar produtos" });
    }

    // Retorna os produtos para o frontend
    res.json(results);
  });
});

export default router;