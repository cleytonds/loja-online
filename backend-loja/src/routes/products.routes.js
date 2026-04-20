import express from "express";
import db from "../config/database.js";
import { verificarToken } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import upload from "../config/upload.js";

const router = express.Router();


// ===============================
// 🔓 LISTAR PRODUTOS (COMPLETO)
// ===============================
router.get("/", async (req, res) => {
  try {

    const [produtos] = await db.query(`
      SELECT 
        p.*,
        c.nome AS categoria_nome,
        pi.url AS imagem_principal
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN produto_imagens pi 
        ON pi.produto_id = p.id AND pi.is_principal = 1
      WHERE p.ativo = 1
    `);

    res.json(produtos);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});


// ===============================
// 🔓 CATEGORIAS
// ===============================
router.get("/categorias", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM categorias");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
});


// ===============================
// 🔒 CRIAR PRODUTO (COMPLETO)
// ===============================
router.post(
  "/",
  verificarToken,
  isAdmin,
  upload.array("imagens"),
  async (req, res) => {

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const { nome, descricao, categoria, variacoes } = req.body;

      // 1. produto
      const [result] = await conn.query(
        `INSERT INTO produtos (nome, descricao, categoria_id, ativo)
         VALUES (?, ?, ?, 1)`,
        [nome, descricao, categoria]
      );

      const produtoId = result.insertId;

      // 2. imagens
      if (req.files?.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];

          await conn.query(
            `INSERT INTO produto_imagens 
            (produto_id, url, ordem, is_principal)
            VALUES (?, ?, ?, ?)`,
            [
              produtoId,
              `/uploads/${file.filename}`,
              i,
              i === 0
            ]
          );
        }
      }

      // 3. variações
      const lista = JSON.parse(variacoes);

      for (let v of lista) {
        await conn.query(
          `INSERT INTO produto_variacoes
          (produto_id, tamanho, cor, preco, estoque)
          VALUES (?, ?, ?, ?, ?)`,
          [
            produtoId,
            v.tamanho,
            v.cor,
            v.preco,
            v.estoque
          ]
        );
      }

      await conn.commit();

      res.json({
        mensagem: "Produto criado com sucesso 🚀",
        produtoId
      });

    } catch (err) {
      await conn.rollback();
      console.error(err);

      res.status(500).json({
        error: "Erro ao criar produto"
      });

    } finally {
      conn.release();
    }
  }
);


// ===============================
// 🔒 ATUALIZAR PRODUTO
// ===============================
router.put("/:id", verificarToken, isAdmin, async (req, res) => {
  const { nome, descricao, categoria } = req.body;

  try {
    await db.query(
      `UPDATE produtos 
       SET nome = ?, descricao = ?, categoria_id = ?
       WHERE id = ?`,
      [nome, descricao, categoria, req.params.id]
    );

    res.json({ mensagem: "Produto atualizado" });

  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});


// ===============================
// 🔒 DELETAR PRODUTO
// ===============================
router.delete("/:id", verificarToken, isAdmin, async (req, res) => {
  try {

    await db.query(
      "UPDATE produtos SET ativo = 0 WHERE id = ?",
      [req.params.id]
    );

    res.json({ mensagem: "Produto desativado" });

  } catch (err) {
    res.status(500).json({ error: "Erro ao remover produto" });
  }
});


export default router;